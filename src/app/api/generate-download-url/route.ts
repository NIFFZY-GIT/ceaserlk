import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Generate secure download token server-side
export async function POST(request: NextRequest) {
  try {
    const { userEmail, productId } = await request.json();

    if (!userEmail || !productId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify the user has purchased this product
    const purchaseQuery = `
      SELECT o.id as order_id, p.trading_card_image, p.name as product_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.customer_email = $1 
        AND p.id = $2::uuid 
        AND o.status IN ('PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED')
      LIMIT 1
    `;
    
    const { rows } = await db.query(purchaseQuery, [userEmail, productId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Access denied: Product not purchased or order not paid' }, { status: 403 });
    }

    const { trading_card_image, product_name } = rows[0];

    if (!trading_card_image) {
      return NextResponse.json({ error: 'Trading card not available for this product' }, { status: 404 });
    }

    // Generate server-side token with real JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const token = Buffer.from(`${userEmail}-${productId}-${jwtSecret}`).toString('base64');

    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();

    const fallbackUrl = new URL(request.url);
  let protocol = forwardedProto ?? fallbackUrl.protocol.replace(':', '');
  const host = forwardedHost ?? request.headers.get('host') ?? fallbackUrl.host;

    if (process.env.NODE_ENV === 'production' && protocol === 'http') {
      protocol = 'https';
    }

    if (!host) {
      throw new Error('Unable to determine request host');
    }

    const origin = `${protocol}://${host}`;
    const downloadUrl = `${origin}/api/download/trading-card?token=${encodeURIComponent(token)}&product_id=${encodeURIComponent(productId)}&user_email=${encodeURIComponent(userEmail)}`;

    return NextResponse.json({
      downloadUrl,
      productName: product_name,
      hasTrading: true
    });

  } catch (error) {
    console.error('Generate download URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}