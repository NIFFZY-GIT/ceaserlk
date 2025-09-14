import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Get filter parameters from the query string
  const maxPrice = searchParams.get('maxPrice');
  const sizes = searchParams.get('sizes')?.split(',');
  const colors = searchParams.get('colors')?.split(',');

  try {
    let query = `
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
    `;

    const queryParams: (string | number | string[])[] = [];
    let paramIndex = 1;

    // Dynamically add WHERE clauses based on filters
    if (maxPrice) {
      query += ` AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.price <= $${paramIndex++})`;
      queryParams.push(parseFloat(maxPrice));
    }

    if (sizes && sizes.length > 0) {
      query += ` AND EXISTS (SELECT 1 FROM product_variants pv JOIN stock_keeping_units sku ON pv.id = sku.variant_id WHERE pv.product_id = p.id AND sku.size = ANY($${paramIndex++}::text[]))`;
      queryParams.push(sizes);
    }
    
    if (colors && colors.length > 0) {
        query += ` AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color_name = ANY($${paramIndex++}::text[]))`;
        queryParams.push(colors);
    }
    
    query += ` GROUP BY p.id ORDER BY p.created_at DESC;`;

    const { rows } = await db.query(query, queryParams);

    // Clean up the data to match the frontend's expected structure
    const products = rows.map(p => ({
      ...p,
      variants: p.variants || []
    }));

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('API GET PRODUCTS ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}