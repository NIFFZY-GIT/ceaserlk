import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, generateOrderConfirmationEmail, generateAdminOrderNotificationEmail } from '@/lib/email';
import { generateInvoicePDF, generateInvoiceFilename, InvoiceData } from '@/lib/pdf-invoice';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 });
    }

    const client = await db.connect();
    try {
      const existingOrder = await client.query('SELECT id FROM orders WHERE payment_intent_id = $1', [paymentIntentId]);
      if (existingOrder.rows.length > 0) {
        return NextResponse.json({ success: true, orderId: existingOrder.rows[0].id });
      }

      const { cart_id, userId, customer_email, customer_name, shipping_address, shipping_city, shipping_postal, phone, subtotal, shipping_cost, total_amount } = paymentIntent.metadata;
      if (!cart_id || !customer_email) {
        throw new Error('Essential metadata missing from Payment Intent');
      }

      const cartResult = await client.query(`
        SELECT 
          ci.quantity, ci.sku_id, s.size, v.price as variant_price, 
          v.color_name, p.id as product_id, p.name as product_name
        FROM cart_items ci
        JOIN stock_keeping_units s ON ci.sku_id = s.id
        JOIN product_variants v ON s.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE ci.cart_id = $1`, 
      [cart_id]);
      
      if (cartResult.rows.length === 0) {
        // THIS WAS THE ERROR: The cart was already deleted by the other process.
        // This check will now succeed.
        throw new Error('Cart items not found for this payment');
      }

      await client.query('BEGIN');
      const orderQuery = `
        INSERT INTO orders (
          user_id, customer_email, full_name, phone_number,
          shipping_address_line1, shipping_city, shipping_postal_code, shipping_country, 
          subtotal, shipping_cost, total_amount, payment_intent_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PAID') RETURNING id;
      `;
      const orderResult = await client.query(orderQuery, [
        userId, // <-- THE FIX IS HERE
        customer_email, customer_name, phone, shipping_address, shipping_city, 
        shipping_postal, 'Sri Lanka', parseFloat(subtotal), parseFloat(shipping_cost), 
        parseFloat(total_amount), paymentIntentId
      ]);
      const orderId = orderResult.rows[0].id;
      
      for (const item of cartResult.rows) {
        const orderItemQuery = `
          INSERT INTO order_items (
            order_id, product_id, product_name, variant_color, 
            variant_size, price_paid, quantity, sku_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        
        await client.query(orderItemQuery, [
          orderId, item.product_id, item.product_name, item.color_name,
          item.size, parseFloat(item.variant_price), item.quantity, item.sku_id
        ]);
      }

      await client.query('DELETE FROM carts WHERE id = $1', [cart_id]);
      await client.query('COMMIT');
      
      // Send confirmation email with PDF invoice (don't block the response)
      try {
        const items = cartResult.rows.map(item => ({
          productName: item.product_name,
          variantColor: item.color_name,
          variantSize: item.size,
          quantity: item.quantity,
          pricePaid: parseFloat(item.variant_price)
        }));

        const invoiceData: InvoiceData = {
          orderId,
          orderDate: new Date(),
          customerName: customer_name,
          customerEmail: customer_email,
          phoneNumber: phone,
          shippingAddress: {
            line1: shipping_address,
            city: shipping_city,
            postalCode: shipping_postal,
            country: 'Sri Lanka'
          },
          items,
          subtotal: parseFloat(subtotal),
          shippingCost: parseFloat(shipping_cost),
          totalAmount: parseFloat(total_amount)
        };

        // Generate PDF invoice
        const pdfBuffer = generateInvoicePDF(invoiceData);
        const filename = generateInvoiceFilename(orderId);

        // Generate email HTML
        const emailHtml = generateOrderConfirmationEmail({
          orderId,
          customerName: customer_name,
          customerEmail: customer_email,
          items,
          subtotal: parseFloat(subtotal),
          shippingCost: parseFloat(shipping_cost),
          totalAmount: parseFloat(total_amount),
          shippingAddress: {
            line1: shipping_address,
            city: shipping_city,
            postalCode: shipping_postal,
            country: 'Sri Lanka'
          }
        });

        // Send email with invoice attachment
        await sendEmail({
          to: customer_email,
          subject: `Order Confirmation - ${orderId} | Ceaser LK`,
          html: emailHtml,
          attachments: [
            {
              filename,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });

        console.log(`Order confirmation email sent successfully to ${customer_email}`);

        // Notify administrators about the new order (non-blocking for the customer flow)
        try {
          const adminEmailSet = new Set<string>();

          if (process.env.ADMIN_NOTIFICATION_EMAILS) {
            process.env.ADMIN_NOTIFICATION_EMAILS
              .split(',')
              .map(email => email.trim())
              .filter(Boolean)
              .forEach(email => adminEmailSet.add(email));
          }

          try {
            const adminQuery = await client.query(
              `SELECT email FROM users WHERE role = 'ADMIN' AND email IS NOT NULL`
            );
            adminQuery.rows
              .map(row => row.email as string)
              .filter(Boolean)
              .forEach(email => adminEmailSet.add(email));
          } catch (adminLookupError) {
            console.error('Failed to fetch admin email addresses from database:', adminLookupError);
          }

          const adminEmails = Array.from(adminEmailSet);

          if (adminEmails.length > 0) {
            const adminEmailHtml = generateAdminOrderNotificationEmail({
              orderId,
              customerName: customer_name,
              customerEmail: customer_email,
              phoneNumber: phone,
              items,
              subtotal: parseFloat(subtotal),
              shippingCost: parseFloat(shipping_cost),
              totalAmount: parseFloat(total_amount),
              shippingAddress: {
                line1: shipping_address,
                city: shipping_city,
                postalCode: shipping_postal,
                country: 'Sri Lanka'
              }
            });

            await sendEmail({
              to: adminEmails.join(','),
              subject: `New Order Placed - ${orderId}`,
              html: adminEmailHtml
            });

            console.log(`Admin notification email sent to: ${adminEmails.join(', ')}`);
          } else {
            console.warn('No admin email recipients configured for order notifications.');
          }
        } catch (adminEmailError) {
          console.error('Failed to send admin notification email:', adminEmailError);
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }
      
      return NextResponse.json({ success: true, orderId });

    } catch (orderError) {
      await client.query('ROLLBACK');
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: "Failed to create order after payment verification" }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}