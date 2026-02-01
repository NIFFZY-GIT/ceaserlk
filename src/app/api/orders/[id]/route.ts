import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const client = await db.connect();
    
    try {
      // Get single order with items
      const orderQuery = `
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'variant_color', oi.variant_color,
              'variant_size', oi.variant_size,
              'price_paid', oi.price_paid,
              'quantity', oi.quantity,
              'sku_id', oi.sku_id,
              'trading_card_image', p.trading_card_image
            ) ORDER BY oi.id
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1
        GROUP BY o.id
      `;
      
      const result = await client.query(orderQuery, [id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      const order = result.rows[0];
      
      return NextResponse.json({ 
        success: true, 
        order: order
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error("Get Order Error:", error);
    return NextResponse.json({ error: "Failed to retrieve order" }, { status: 500 });
  }
}