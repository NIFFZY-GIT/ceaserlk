import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// PUT - Update a user's role (Demote from ADMIN to USER)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResult;
  try {
    authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
  
  const { id: targetUserId } = params;

  // --- CRITICAL SECURITY CHECK: Prevent an admin from demoting themselves ---
  if (authResult.userId.toString() === targetUserId) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  try {
    const { role } = await request.json();
    if (role !== 'USER') {
      return NextResponse.json({ error: "Invalid role. Only demotion to 'USER' is supported." }, { status: 400 });
    }

    const query = `UPDATE users SET role = $1 WHERE id = $2::uuid AND role = 'ADMIN' RETURNING id, role;`;
    const { rows } = await db.query(query, [role, targetUserId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Admin not found or could not be updated" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(`API PUT Admin ${targetUserId} Error:`, error);
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
  }
}