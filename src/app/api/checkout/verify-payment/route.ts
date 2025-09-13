import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
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

      const { cart_id, customer_email, customer_name, shipping_address, shipping_city, shipping_postal, phone, subtotal, shipping_cost, total_amount } = paymentIntent.metadata;
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
          customer_email, full_name, phone_number,
          shipping_address_line1, shipping_city, shipping_postal_code, shipping_country, 
          subtotal, shipping_cost, total_amount, payment_intent_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PAID') RETURNING id;
      `;
      const orderResult = await client.query(orderQuery, [
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