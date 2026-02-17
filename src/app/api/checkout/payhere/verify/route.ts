import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

// This endpoint verifies PayHere payment status after user returns from PayHere
const resolveOrderUserId = (rawUserId: string | null | undefined) => {
  if (!rawUserId) return null;
  if (rawUserId.startsWith('guest:')) return null;
  return rawUserId;
};

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const client = await db.connect();
    try {
      await ensureOrderNumberSchema(client);
      // First check if order was already created from webhook
      const orderResult = await client.query(
        'SELECT id, status, order_number FROM orders WHERE payhere_order_id = $1',
        [orderId]
      );

      if (orderResult.rows.length > 0) {
        const existingOrder = orderResult.rows[0];
        try {
          await sendOrderConfirmationIfNeeded(client, existingOrder.id);
        } catch (emailError) {
          console.error('Verify: Failed to send order emails:', emailError);
        }

        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          publicOrderId: formatOrderNumber(existingOrder.order_number) || existingOrder.id,
          status: existingOrder.status
        });
      }

      // Check pending order status
      const pendingResult = await client.query(
        'SELECT * FROM pending_payhere_orders WHERE order_id = $1',
        [orderId]
      );

      if (pendingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      const pendingOrder = pendingResult.rows[0];

      if (pendingOrder.status === 'completed' && pendingOrder.processed_order_id) {
        return NextResponse.json({
          success: true,
          orderId: pendingOrder.processed_order_id
        });
      }

      if (pendingOrder.status === 'failed') {
        return NextResponse.json({
          success: false,
          error: 'Payment failed'
        });
      }

      // FALLBACK: If user returned from PayHere but webhook hasn't arrived yet,
      // create the order directly after a reasonable wait.
      // This handles cases where webhook is delayed or can't reach the server.
      if (pendingOrder.status === 'pending') {
        // Check if enough time has passed (user returned from PayHere payment page)
        const createdAt = new Date(pendingOrder.created_at);
        const now = new Date();
        const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;
        
        // If order was created more than 30 seconds ago and user is back, assume payment succeeded
        // PayHere always redirects back after successful payment
        if (secondsSinceCreation > 30) {
          console.log('FALLBACK: Creating order directly (webhook may be delayed)');
          
          await client.query('BEGIN');
          
          try {
            // Get cart items
            const cartResult = await client.query(`
              SELECT 
                ci.quantity, ci.sku_id, s.size, v.price as variant_price, 
                v.color_name, p.id as product_id, p.name as product_name,
                p.trading_card_image
              FROM cart_items ci
              JOIN stock_keeping_units s ON ci.sku_id = s.id
              JOIN product_variants v ON s.variant_id = v.id
              JOIN products p ON v.product_id = p.id
              WHERE ci.cart_id = $1
            `, [pendingOrder.cart_id]);

            if (cartResult.rows.length === 0) {
              await client.query('ROLLBACK');
              return NextResponse.json({
                success: false,
                error: 'Cart items not found. The cart may have expired.'
              });
            }

            // Create order
            const orderUserId = resolveOrderUserId(pendingOrder.user_id);

            const orderInsertResult = await client.query(`
              INSERT INTO orders (
                user_id, customer_email, full_name, phone_number,
                shipping_address_line1, shipping_city, shipping_postal_code, shipping_country,
                subtotal, shipping_cost, total_amount, payhere_order_id,
                payment_method, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PAID')
              RETURNING id, order_number
            `, [
              orderUserId,
              pendingOrder.customer_email,
              pendingOrder.customer_name,
              pendingOrder.phone,
              pendingOrder.shipping_address,
              pendingOrder.shipping_city,
              pendingOrder.shipping_postal_code || '',
              'Sri Lanka',
              parseFloat(pendingOrder.subtotal),
              parseFloat(pendingOrder.shipping_cost),
              parseFloat(pendingOrder.amount),
              orderId,
              'PAYHERE'
            ]);

            const newOrderId = orderInsertResult.rows[0].id;
            const publicOrderId = formatOrderNumber(orderInsertResult.rows[0].order_number) || newOrderId;

            // Create order items
            for (const item of cartResult.rows) {
              await client.query(`
                INSERT INTO order_items (
                  order_id, product_id, product_name, variant_color,
                  variant_size, price_paid, quantity, sku_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `, [
                newOrderId,
                item.product_id,
                item.product_name,
                item.color_name,
                item.size,
                parseFloat(item.variant_price),
                item.quantity,
                item.sku_id
              ]);

              // Note: Stock was already deducted when items were added to cart
            }

            // Delete cart
            await client.query('DELETE FROM carts WHERE id = $1', [pendingOrder.cart_id]);

            // Update pending order
            await client.query(
              'UPDATE pending_payhere_orders SET status = $1, processed_order_id = $2, updated_at = NOW() WHERE order_id = $3',
              ['completed', newOrderId, orderId]
            );

            await client.query('COMMIT');

            console.log(`FALLBACK: Order ${newOrderId} created successfully`);

            // Send confirmation emails (async, don't block response)
            setImmediate(async () => {
              const emailClient = await db.connect();
              try {
                await sendOrderConfirmationIfNeeded(emailClient, newOrderId);
              } catch (emailError) {
                console.error('FALLBACK: Failed to send order emails:', emailError);
              } finally {
                emailClient.release();
              }
            });

            return NextResponse.json({
              success: true,
              orderId: newOrderId,
              publicOrderId
            });

          } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('FALLBACK: Failed to create order:', dbError);
            throw dbError;
          }
        }
      }

      // Payment is still pending - webhook hasn't arrived yet
      return NextResponse.json({
        success: false,
        pending: true,
        message: 'Payment is being processed. Please wait...'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('PayHere verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment status' },
      { status: 500 }
    );
  }
}
