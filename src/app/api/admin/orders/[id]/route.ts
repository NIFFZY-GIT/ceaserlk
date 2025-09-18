import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
// import { verifyAuth } from '@/lib/auth'; // TEMPORARILY DISABLED FOR TESTING

// --- GET a single order's full details (with corrected signature) ---
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Await the params promise
  if (!id) {
    return NextResponse.json({ error: "ID parameter is missing" }, { status: 400 });
  }

  try {
    // TEMPORARY: BYPASS AUTH FOR TESTING - REMOVE IN PRODUCTION
    /*
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    */
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const query = `
      SELECT
        o.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id, 
              'product_name', oi.product_name, 
              'variant_color', oi.variant_color,
              'variant_size', oi.variant_size, 
              'price_paid', oi.price_paid, 
              'quantity', oi.quantity,
              'product_id', oi.product_id,
              'imageUrl', COALESCE(pv.thumbnail_url, '/images/image.jpg')
            )
          ) 
          FROM order_items oi 
          LEFT JOIN product_variants pv ON oi.product_id = pv.product_id 
            AND oi.variant_color = pv.color_name
          WHERE oi.order_id = o.id
        ) as items
      FROM orders o
      WHERE o.id = $1::uuid;
    `;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    
    const order = rows[0];
    order.items = order.items || [];
    return NextResponse.json(order);
  } catch (error) {
    console.error(`API GET Order ${id} Error:`, error);
    return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
  }
}

// --- PUT - Update an order's status (with corrected signature) ---
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Now correctly destructured

  try {
    // TEMPORARY: BYPASS AUTH FOR TESTING - REMOVE IN PRODUCTION
    /*
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    */
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const { status } = await request.json();

    const validStatuses = [ 'PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED' ];
    if (!status || !validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status provided" }, { status: 400 });
    }
    
    // Update the order status
    const updateQuery = `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *;`;
    const { rows } = await db.query(updateQuery, [status, id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found to update" }, { status: 404 });
    }

    // Fetch the complete order data including items (same as GET endpoint)
    const fullOrderQuery = `
      SELECT
        o.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id, 
              'product_name', oi.product_name, 
              'variant_color', oi.variant_color,
              'variant_size', oi.variant_size, 
              'price_paid', oi.price_paid, 
              'quantity', oi.quantity,
              'product_id', oi.product_id,
              'imageUrl', COALESCE(pv.thumbnail_url, '/images/image.jpg')
            )
          ) 
          FROM order_items oi 
          LEFT JOIN product_variants pv ON oi.product_id = pv.product_id 
            AND oi.variant_color = pv.color_name
          WHERE oi.order_id = o.id
        ) as items
      FROM orders o
      WHERE o.id = $1::uuid;
    `;
    const { rows: fullOrderRows } = await db.query(fullOrderQuery, [id]);
    
    const fullOrder = fullOrderRows[0];
    fullOrder.items = fullOrder.items || [];
    return NextResponse.json(fullOrder);
  } catch (error) {
    console.error(`API PUT Order ${id} Error:`, error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

// --- DELETE - Delete an order and its items ---
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID parameter is missing" }, { status: 400 });
  }

  try {
    // TEMPORARY: BYPASS AUTH FOR TESTING - REMOVE IN PRODUCTION
    /*
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    */
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    // Start a transaction to ensure both order and order_items are deleted together
    await db.query('BEGIN');

    // First, delete all order items for this order
    await db.query('DELETE FROM order_items WHERE order_id = $1::uuid', [id]);

    // Then, delete the order itself
    const { rows } = await db.query('DELETE FROM orders WHERE id = $1::uuid RETURNING *', [id]);

    if (rows.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await db.query('COMMIT');
    
    return NextResponse.json({ 
      message: "Order deleted successfully", 
      deletedOrder: rows[0] 
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error(`API DELETE Order ${id} Error:`, error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}