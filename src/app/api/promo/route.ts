import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export interface PromoData {
  promoCode: string;
  referralLink: string;
  shareMessage: string;
  hasFreeDeliveryForLife: boolean;
  referralCount: number;
  referrals: {
    id: string;
    referredUserName: string;
    createdAt: string;
  }[];
}

/**
 * GET /api/promo
 * Fetches the current user's promo code and referral statistics.
 * If the user doesn't have a promo code, one is automatically generated.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.userId.toString();
    const client = await db.connect();

    try {
      // Get or generate promo code
      const promoCodeResult = await client.query(
        `SELECT code FROM promo_codes WHERE user_id = $1`,
        [userId]
      );

      let promoCode: string;

      if (promoCodeResult.rows.length === 0) {
        // Generate a new promo code
        const generateResult = await client.query(
          `SELECT generate_promo_code($1) as code`,
          [userId]
        );
        promoCode = generateResult.rows[0].code;
      } else {
        promoCode = promoCodeResult.rows[0].code;
      }

      // Check if user has free delivery for life
      const freeDeliveryResult = await client.query(
        `SELECT free_delivery_for_life FROM users WHERE id = $1`,
        [userId]
      );
      const hasFreeDeliveryForLife = freeDeliveryResult.rows[0]?.free_delivery_for_life || false;

      // Get referral statistics
      const referralsResult = await client.query(
        `SELECT 
           r.id,
           u.first_name || ' ' || LEFT(u.last_name, 1) || '.' as referred_user_name,
           r.created_at
         FROM referrals r
         JOIN users u ON r.referred_id = u.id
         WHERE r.referrer_id = $1
         ORDER BY r.created_at DESC`,
        [userId]
      );

      // Build the base URL from environment or request
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
      
      const referralLink = `${baseUrl}/signup?promo=${promoCode}`;
      const shareMessage = `🔥 Hey! I found this amazing CEASAR clothing brand with incredible products.I’m one step away from unlocking FREE delivery at CEASAR.\n👉 If you sign up using my link, it unlocks the reward for me—and you get access to CEASAR too 👑\n👉 ${referralLink}\n\nTrust me, you'll love their stuff! 💯`;

      const promoData: PromoData = {
        promoCode,
        referralLink,
        shareMessage,
        hasFreeDeliveryForLife,
        referralCount: referralsResult.rows.length,
        referrals: referralsResult.rows.map(row => ({
          id: row.id,
          referredUserName: row.referred_user_name,
          createdAt: row.created_at,
        })),
      };

      return NextResponse.json(promoData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching promo data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo data' },
      { status: 500 }
    );
  }
}
