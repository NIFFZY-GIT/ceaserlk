import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
});

export async function POST(request: NextRequest) {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const body = await request.json();
    
    // Validate input
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues.map(issue => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = validation.data;

    // Check if code exists and is valid
    const codeQuery = `
      SELECT id, user_id, expires_at, used 
      FROM password_reset_codes 
      WHERE email = $1 AND code = $2
    `;
    
    const { rows: codeRows } = await client.query(codeQuery, [email, code]);

    if (codeRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const resetCode = codeRows[0];

    // Check if code has expired
    if (new Date() > new Date(resetCode.expires_at)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // Check if code has already been used
    if (resetCode.used) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Verification code has already been used' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updatePasswordQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(updatePasswordQuery, [hashedPassword, resetCode.user_id]);

    // Mark the reset code as used
    const markCodeUsedQuery = `
      UPDATE password_reset_codes 
      SET used = true, used_at = NOW()
      WHERE id = $1
    `;
    
    await client.query(markCodeUsedQuery, [resetCode.id]);

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}