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
      SELECT id, first_name, last_name, email, created_at 
      FROM users 
      WHERE role = 'ADMIN' 
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("API GET Admins Error:", error);
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}