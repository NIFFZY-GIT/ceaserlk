import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    // Clean up expired reservations first (temporarily disabled)
    // await pool.query('SELECT cleanup_expired_reservations()');
    
    const productQuery = `
      SELECT
        p.id, p.name, p.description, p.price, p."salePrice", p."audioUrl",
        COALESCE((SELECT json_agg(json_build_object('id', pi.id, 'url', pi.url, 'colorId', pi."colorId")) FROM "ProductImage" pi WHERE pi."productId" = p.id), '[]'::json) as images,
        COALESCE((SELECT json_agg(json_build_object('id', pc.id, 'name', pc.name, 'hex_code', pc.hex_code)) FROM "ProductColor" pc WHERE pc."productId" = p.id), '[]'::json) as colors,
        COALESCE((SELECT json_agg(json_build_object('id', ps.id, 'name', ps.name, 'stock', ps.stock) ORDER BY ps.id) FROM "ProductSize" ps WHERE ps."productId" = p.id), '[]'::json) as sizes
      FROM "Product" p
      WHERE p.id = $1;
    `;
    
    const result = await pool.query(productQuery, [productId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = result.rows[0];
    
    // Clean up data types before sending
    const productData = {
      ...product,
      price: parseFloat(product.price),
      salePrice: product.salePrice ? parseFloat(product.salePrice) : null,
    };

    return NextResponse.json(productData);

  } catch (error) {
    console.error(`[API_GET_PRODUCT_${productId}_ERROR]`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}