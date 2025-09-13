import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.audio_url,
        (
          SELECT json_agg(variants_agg)
          FROM (
            SELECT
              pv.id AS "variantId",
              pv.price,
              pv.compare_at_price AS "compareAtPrice",
              pv.sku,
              pv.color_name AS "colorName",
              pv.color_hex_code AS "colorHex",
              (
                SELECT json_agg(json_build_object('id', vi.id, 'url', vi.image_url))
                FROM variant_images vi WHERE vi.variant_id = pv.id
              ) AS images,
              (
                SELECT json_agg(json_build_object('id', sku.id, 'size', sku.size, 'stock', sku.stock_quantity))
                FROM stock_keeping_units sku WHERE sku.variant_id = pv.id
              ) AS stock
            FROM product_variants pv
            WHERE pv.product_id = p.id
          ) AS variants_agg
        ) AS variants
      FROM products p
      WHERE p.id = $1 AND p.is_published = TRUE
      GROUP BY p.id;
    `;
    
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const product = rows[0];
    product.variants = product.variants || [];

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error(`API GET PRODUCT (ID: ${id}) ERROR:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}