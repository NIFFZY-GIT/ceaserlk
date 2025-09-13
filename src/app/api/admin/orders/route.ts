import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all orders for the admin dashboard
export async function GET() {
  // TODO: Re-enable admin authentication after testing
  // In a real app, you would verify admin authentication here
  try {
    const query = `
      SELECT
        o.id,
        o.created_at,
        o.full_name,
        o.total_amount,
        o.status,
        COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("API GET Orders Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}