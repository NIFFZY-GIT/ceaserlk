import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Query to get featured products with their variants - based on existing products API structure
    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.shipping_cost,
        (
          SELECT json_agg(variants_agg)
          FROM (
            SELECT
              pv.id AS "variantId",
              pv.price,
              pv.compare_at_price AS "compareAtPrice",
              pv.thumbnail_url AS "thumbnailUrl",
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
      WHERE p.is_published = TRUE
      ORDER BY p.created_at DESC
      LIMIT 8
    `;

    const result = await db.query(query);
    const rows = result.rows;

    // Clean up the data to match the frontend's expected structure
    const products = rows.map(p => ({
      ...p,
      variants: p.variants || []
    })).filter(product => product.variants.length > 0);

    return NextResponse.json({ products });

  } catch (error) {
    console.error('Error fetching featured products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured products' },
      { status: 500 }
    );
  }
}