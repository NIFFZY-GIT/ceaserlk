import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

const CART_EXPIRATION_MINUTES = 30;

// This is the GET function that your CartContext is trying to call
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const client = await db.connect();
  try {
    // Advanced query to fetch the entire cart structure in one go
    const query = `
      SELECT
        c.id,
        c.expires_at AS "expiresAt",
        COALESCE(
          (
            SELECT json_agg(items_agg)
            FROM (
              SELECT
                ci.id,
                ci.quantity,
                sku.id AS "skuId",
                sku.size,
                pv.price,
                pv.compare_at_price AS "compareAtPrice",
                pv.color_name AS "colorName",
                pv.thumbnail_url AS "imageUrl",
                p.id AS "productId",
                p.name
              FROM cart_items ci
              JOIN stock_keeping_units sku ON ci.sku_id = sku.id
              JOIN product_variants pv ON sku.variant_id = pv.id
              JOIN products p ON pv.product_id = p.id
              WHERE ci.cart_id = c.id
            ) AS items_agg
          ),
          '[]'::json
        ) AS items
      FROM carts c
      WHERE c.session_id = $1 AND c.expires_at > NOW();
    `;

    let { rows } = await client.query(query, [sessionId]);
    let cart = rows[0];

    // If no cart exists or it has expired, create a new one
    if (!cart) {
      const expiration = new Date(Date.now() + CART_EXPIRATION_MINUTES * 60 * 1000);
      const newCartResult = await client.query(
        'INSERT INTO carts (session_id, expires_at) VALUES ($1, $2) RETURNING id, expires_at AS "expiresAt"',
        [sessionId, expiration]
      );
      cart = { ...newCartResult.rows[0], items: [] };
    }

    return NextResponse.json(cart, { status: 200 });

  } catch (error) {
    console.error('API GET CART ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// TODO: Implement POST (add item), PUT (update quantity), DELETE (remove item)