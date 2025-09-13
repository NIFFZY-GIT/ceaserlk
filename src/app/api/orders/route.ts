// in src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Verify authentication
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (authError) {
    console.error("Auth error:", authError);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const { cart, shippingDetails, paymentIntentId } = await request.json();

    // Validation
    if (!cart || !shippingDetails || !paymentIntentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const orderQuery = `
      INSERT INTO orders (
        customer_email, full_name, phone_number,
        shipping_address_line1, shipping_city, shipping_postal_code, shipping_country, 
        subtotal, shipping_cost, total_amount, payment_intent_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PAID')
      RETURNING id;
    `;
    const fullName = `${shippingDetails.firstName} ${shippingDetails.lastName}`;

    const orderResult = await client.query(orderQuery, [
      shippingDetails.email, fullName, shippingDetails.phone,
      shippingDetails.address, shippingDetails.city, shippingDetails.postalCode,
      shippingDetails.country, cart.subtotal, cart.totalShipping,
      cart.totalAmount, paymentIntentId
    ]);
    const orderId = orderResult.rows[0].id;
    
    // Insert order items
    for (const item of cart.items) {
      const orderItemQuery = `
        INSERT INTO order_items (
          order_id, product_id, product_name, product_price, product_shipping_cost,
          quantity, unit_price, total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await client.query(orderItemQuery, [
        orderId,
        item.product.id,
        item.product.name,
        item.product.price,
        item.product.shipping_cost || 0,
        item.quantity,
        item.product.price,
        item.product.price * item.quantity
      ]);
    }

    await client.query('DELETE FROM carts WHERE id = $1', [cart.id]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, orderId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Create Order Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  } finally {
    client.release();
  }

  } catch (error) {
    console.error("Order API Error:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}

// GET endpoint to retrieve orders
export async function GET(request: NextRequest) {
  // Verify authentication
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (authError) {
    console.error("Auth error:", authError);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const client = await db.connect();
    
    try {
      // Get orders with their items
      const ordersQuery = `
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'product_price', oi.product_price,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      
      const result = await client.query(ordersQuery);
      
      return NextResponse.json({ 
        success: true, 
        orders: result.rows 
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error("Get Orders Error:", error);
    return NextResponse.json({ error: "Failed to retrieve orders" }, { status: 500 });
  }
}