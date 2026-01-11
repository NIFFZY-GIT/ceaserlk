import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/promo/free-delivery
 * Checks if the current user has free delivery for life.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ hasFreeDelivery: false, isLifetime: false });
    }

    const userId = user.userId.toString();

    // Check if user has free delivery for life
    const result = await db.query(
      `SELECT free_delivery_for_life FROM users WHERE id = $1`,
      [userId]
    );

    const hasFreeDelivery = result.rows[0]?.free_delivery_for_life || false;

    return NextResponse.json({ 
      hasFreeDelivery,
      isLifetime: hasFreeDelivery // It's always lifetime if they have it
    });
  } catch (error) {
    console.error('Error checking free delivery:', error);
    return NextResponse.json({ hasFreeDelivery: false, isLifetime: false });
  }
}
