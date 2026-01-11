import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/promo/validate
 * Validates a promo code without applying it.
 * Used during registration to show validation feedback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promoCode } = body;

    if (!promoCode || typeof promoCode !== 'string') {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code is required' 
      }, { status: 400 });
    }

    const normalizedCode = promoCode.trim().toUpperCase();

    if (normalizedCode.length < 4 || normalizedCode.length > 10) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid promo code format' 
      });
    }

    const client = await db.connect();

    try {
      const result = await client.query(
        `SELECT 
           pc.id, 
           pc.is_active,
           u.first_name
         FROM promo_codes pc
         JOIN users u ON pc.user_id = u.id
         WHERE pc.code = $1`,
        [normalizedCode]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Promo code not found' 
        });
      }

      const promo = result.rows[0];

      if (!promo.is_active) {
        return NextResponse.json({ 
          valid: false, 
          error: 'This promo code is no longer active' 
        });
      }

      return NextResponse.json({ 
        valid: true, 
        referrerName: promo.first_name,
        message: `Code from ${promo.first_name}! You'll get free delivery when you sign up.`
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}
