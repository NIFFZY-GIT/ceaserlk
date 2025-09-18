import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// Secure download endpoint for trading images
// Only allows users to download trading cards from their purchased products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const productId = searchParams.get('product_id');
    const userEmail = searchParams.get('user_email');

    console.log('Download request params:', { token: token ? 'Present' : 'Missing', productId, userEmail });

    if (!token || !productId || !userEmail) {
      console.error('Missing parameters:', { token: !!token, productId: !!productId, userEmail: !!userEmail });
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Generate expected token for verification
    const jwtSecret = process.env.JWT_SECRET;
    console.log('JWT_SECRET available:', !!jwtSecret);
    
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const expectedToken = Buffer.from(`${userEmail}-${productId}-${jwtSecret}`).toString('base64');
    console.log('Token verification:', { provided: token.slice(0, 10) + '...', expected: expectedToken.slice(0, 10) + '...', match: token === expectedToken });
    
    if (token !== expectedToken) {
      console.error('Token mismatch');
      return NextResponse.json({ error: 'Invalid download token' }, { status: 403 });
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
    
    console.log('Purchase verification query:', { userEmail, productId });
    const { rows } = await db.query(purchaseQuery, [userEmail, productId]);
    console.log('Purchase verification result:', rows);

    if (rows.length === 0) {
      console.error('No purchase found or order not paid');
      return NextResponse.json({ error: 'Access denied: Product not purchased or order not paid' }, { status: 403 });
    }

    const { order_id, trading_card_image, product_name } = rows[0];
    console.log('Order details:', { order_id, trading_card_image, product_name });

    if (!trading_card_image) {
      console.error('No trading card image for product');
      return NextResponse.json({ error: 'Trading card not available for this product' }, { status: 404 });
    }

    // Log the download (optional - don't fail if table doesn't exist)
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor || realIp || '0.0.0.0';

    try {
      await db.query(
        `INSERT INTO download_logs (user_email, product_id, order_id, download_type, download_url, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userEmail, productId, order_id, 'trading_image', trading_card_image, userAgent, ipAddress]
      );
      console.log('Download logged successfully');
    } catch (logError) {
      // Don't fail the download if logging fails
      console.warn('Failed to log download (table may not exist):', logError);
    }

    // Read and serve the file
    const filePath = path.join(process.cwd(), 'public', trading_card_image);
    console.log('Attempting to read file:', filePath);
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      console.log('File read successful, size:', fileBuffer.length);
      
      const fileExtension = path.extname(trading_card_image).toLowerCase();
      console.log('File extension:', fileExtension);
      
      let contentType = 'application/octet-stream';
      if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExtension === '.png') {
        contentType = 'image/png';
      } else if (fileExtension === '.webp') {
        contentType = 'image/webp';
      }

      const fileName = `${product_name.replace(/[^a-zA-Z0-9]/g, '_')}_trading_card${fileExtension}`;
      console.log('Serving file with content type:', contentType, 'filename:', fileName);

      return new Response(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json({ error: 'Trading card file not found', filePath }, { status: 404 });
    }

  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}