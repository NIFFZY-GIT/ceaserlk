import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';
import crypto from 'crypto';

// PayHere configuration
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;

// Verify PayHere notification signature
function verifyPayHereSignature(
  merchantId: string,
  orderId: string,
  payHereAmount: string,
  payHereCurrency: string,
  statusCode: string,
  md5sig: string,
  merchantSecret: string
): boolean {
  // PayHere signature format: merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret)
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const localSig = crypto.createHash('md5')
    .update(merchantId + orderId + payHereAmount + payHereCurrency + statusCode + hashedSecret)
    .digest('hex')
    .toUpperCase();
  
  return localSig === md5sig.toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data from PayHere
    const formData = await request.formData();
    
    const merchantId = formData.get('merchant_id') as string;
    const orderId = formData.get('order_id') as string;
    const paymentId = formData.get('payment_id') as string;
    const payhereAmount = formData.get('payhere_amount') as string;
    const payhereCurrency = formData.get('payhere_currency') as string;
    const statusCode = formData.get('status_code') as string;
    const md5sig = formData.get('md5sig') as string;
    // Note: method, cardHolderName, cardNo, cardExpiry are available in formData if needed

    console.log(`PayHere notification received: order=${orderId}, status=${statusCode}, payment_id=${paymentId}`);

    // Validate merchant ID
    if (merchantId !== PAYHERE_MERCHANT_ID) {
      console.error('PayHere notify: Invalid merchant ID');
      return new Response('Invalid merchant ID', { status: 400 });
    }

    // Verify signature
    const isValidSignature = verifyPayHereSignature(
      merchantId,
      orderId,
      payhereAmount,
      payhereCurrency,
      statusCode,
      md5sig,
      PAYHERE_MERCHANT_SECRET
    );

    if (!isValidSignature) {
      console.error('PayHere notify: Invalid signature');
      return new Response('Invalid signature', { status: 400 });
    }

    // Status codes: 2 = success, 0 = pending, -1 = canceled, -2 = failed, -3 = chargedback
    const statusCodeInt = parseInt(statusCode, 10);

    const client = await db.connect();
    try {
      await ensureOrderNumberSchema(client);
      // Get pending order details
      const pendingOrderResult = await client.query(
        'SELECT * FROM pending_payhere_orders WHERE order_id = $1',
        [orderId]
      );

      if (pendingOrderResult.rows.length === 0) {
        console.error(`PayHere notify: Pending order not found: ${orderId}`);
        return new Response('Order not found', { status: 404 });
      }

      const pendingOrder = pendingOrderResult.rows[0];

      // Check if order already exists
      const existingOrder = await client.query(
        'SELECT id FROM orders WHERE payhere_order_id = $1',
        [orderId]
      );

      if (existingOrder.rows.length > 0) {
        console.log(`PayHere notify: Order already processed: ${orderId}`);
        return new Response('OK', { status: 200 });
      }

      // Only process successful payments
      if (statusCodeInt !== 2) {
        console.log(`PayHere notify: Payment not successful. Status: ${statusCode}`);
        
        // Update pending order status
        await client.query(
          'UPDATE pending_payhere_orders SET status = $1, updated_at = NOW() WHERE order_id = $2',
          [statusCodeInt === 0 ? 'pending' : 'failed', orderId]
        );
        
        return new Response('OK', { status: 200 });
      }

      // Payment successful - create the order
      await client.query('BEGIN');

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
        console.error(`PayHere notify: Cart items not found for cart: ${pendingOrder.cart_id}`);
        return new Response('Cart not found', { status: 400 });
      }

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          user_id, customer_email, full_name, phone_number,
          shipping_address_line1, shipping_city, shipping_postal_code, shipping_country,
          subtotal, shipping_cost, total_amount, payhere_order_id, payhere_payment_id,
          payment_method, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PAID')
        RETURNING id, order_number
      `;

      const orderResult = await client.query(orderQuery, [
        pendingOrder.user_id,
        pendingOrder.customer_email,
        pendingOrder.customer_name,
        pendingOrder.phone,
        pendingOrder.shipping_address,
        pendingOrder.shipping_city,
        pendingOrder.shipping_postal_code,
        'Sri Lanka',
        parseFloat(pendingOrder.subtotal),
        parseFloat(pendingOrder.shipping_cost),
        parseFloat(payhereAmount),
        orderId,
        paymentId,
        'PAYHERE'
      ]);

      const newOrderId = orderResult.rows[0].id;
      const orderNumber = orderResult.rows[0].order_number as number | null | undefined;
      const publicOrderId = formatOrderNumber(orderNumber) || newOrderId;

      // Create order items and update stock
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

      // Update pending order status
      await client.query(
        'UPDATE pending_payhere_orders SET status = $1, processed_order_id = $2, updated_at = NOW() WHERE order_id = $3',
        ['completed', newOrderId, orderId]
      );

      // Mark free delivery promo as used if it was applied
      if (pendingOrder.free_delivery_applied) {
        try {
          await client.query(
            `SELECT use_free_delivery($1, $2)`,
            [pendingOrder.user_id.toString(), newOrderId]
          );
        } catch (promoErr) {
          console.error('Error marking free delivery as used:', promoErr);
          // Don't fail the order if promo marking fails
        }
      }

      await client.query('COMMIT');

      console.log(`PayHere notify: Order created successfully: ${newOrderId} (public #${publicOrderId})`);

      // Send confirmation emails (async, don't block response)
      setImmediate(async () => {
        const emailClient = await db.connect();
        try {
          await sendOrderConfirmationIfNeeded(emailClient, newOrderId);
        } catch (emailError) {
          console.error('Failed to send order emails:', emailError);
        } finally {
          emailClient.release();
        }
      });

      return new Response('OK', { status: 200 });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('PayHere notify error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Also handle GET for testing/debugging (should return 200)
export async function GET() {
  return new Response('PayHere notification endpoint active', { status: 200 });
}
