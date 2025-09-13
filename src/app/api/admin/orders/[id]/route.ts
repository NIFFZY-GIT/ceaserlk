import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// --- GET a single order's full details (with corrected signature) ---
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  const { id } = params; // Now correctly destructured
  if (!id) {
    return NextResponse.json({ error: "ID parameter is missing" }, { status: 400 });
  }

  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch (authError) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const query = `
      SELECT
        o.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id, 'product_name', oi.product_name, 'variant_color', oi.variant_color,
              'variant_size', oi.variant_size, 'price_paid', oi.price_paid, 'quantity', oi.quantity
            )
          ) FROM order_items oi WHERE oi.order_id = o.id
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
  { params }: { params: { id: string } }
) {
  const { id } = params; // Now correctly destructured

  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch (authError) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const { status } = await request.json();

    const validStatuses = [ 'PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED' ];
    if (!status || !validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status provided" }, { status: 400 });
    }
    
    const query = `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *;`;
    const { rows } = await db.query(query, [status, id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found to update" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(`API PUT Order ${id} Error:`, error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}