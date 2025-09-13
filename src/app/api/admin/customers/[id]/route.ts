import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET a single customer's details and their order history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
  
  const { id } = params;
  try {
    // A single query to get the user and all their associated orders nested as a JSON array
    const query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.created_at,
        u.phone_number,
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
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    const customer = rows[0];
    customer.orders = customer.orders || []; // Ensure orders is an array

    return NextResponse.json(customer);
  } catch (error) {
    console.error(`API GET Customer ${id} Error:`, error);
    return NextResponse.json({ error: "Failed to fetch customer details" }, { status: 500 });
  }
}

// PUT - Update a customer's details (e.g., promote to admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
  
  const { id } = params;
  try {
    const { role } = await request.json();

    if (role !== 'ADMIN') {
        return NextResponse.json({ error: "Invalid role specified. Only 'ADMIN' is supported for promotion." }, { status: 400 });
    }

    const query = `UPDATE users SET role = $1 WHERE id = $2::uuid RETURNING id, role;`;
    const { rows } = await db.query(query, [role, id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Customer not found to update" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(`API PUT Customer ${id} Error:`, error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}