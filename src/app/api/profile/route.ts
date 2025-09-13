import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = authResult;

    // A single, powerful query to get the user and all their associated orders nested as a JSON array
    const query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        (
          SELECT json_agg(
            json_build_object(
              'id', o.id,
              'status', o.status,
              'total_amount', o.total_amount,
              'created_at', o.created_at
            ) ORDER BY o.created_at DESC
          )
          FROM orders o
          WHERE o.user_id = u.id
        ) as orders
      FROM users u
      WHERE u.id = $1::uuid;
    `;
    const { rows } = await db.query(query, [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const userProfile = rows[0];
    userProfile.orders = userProfile.orders || []; // Ensure 'orders' is always an array

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error(`API GET Profile Error:`, error);
    return NextResponse.json({ error: "Failed to fetch profile data" }, { status: 500 });
  }
}