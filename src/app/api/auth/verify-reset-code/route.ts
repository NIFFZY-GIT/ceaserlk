import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = verifyCodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email or code format' },
        { status: 400 }
      );
    }

    const { email, code } = validation.data;

    // Check if code exists and is valid
    const codeQuery = `
      SELECT id, user_id, expires_at, used 
      FROM password_reset_codes 
      WHERE email = $1 AND code = $2
    `;
    
    const { rows: codeRows } = await db.query(codeQuery, [email, code]);

    if (codeRows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const resetCode = codeRows[0];

    // Check if code has expired
    if (new Date() > new Date(resetCode.expires_at)) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // Check if code has already been used
    if (resetCode.used) {
      return NextResponse.json(
        { error: 'Verification code has already been used' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Verification code is valid' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Verify reset code error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}