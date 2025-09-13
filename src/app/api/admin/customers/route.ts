import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(CASE WHEN o.status IN ('PAID', 'SHIPPED', 'DELIVERED') THEN o.total_amount ELSE 0 END), 0) AS total_spent
      FROM
        users u
      LEFT JOIN
        orders o ON u.id = o.user_id
      -- --- THIS IS THE KEY CHANGE ---
      WHERE
        u.role != 'ADMIN' -- This excludes admins from the customer list
      GROUP BY
        u.id
      ORDER BY
        total_spent DESC;
    `;
    const { rows } = await db.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("API GET Customers Error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}