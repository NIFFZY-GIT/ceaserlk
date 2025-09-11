import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Check if ProductVariant table exists, if not use old structure
    const checkVariantTable = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ProductVariant'
      );
    `;
    
    const variantTableExists = await pool.query(checkVariantTable);
    
    let query;
    
    if (variantTableExists.rows[0].exists) {
      // Use new variant-based structure
      query = `
        SELECT
          p.id, p.name, p.price, p."salePrice", p."audioUrl",
          COALESCE((SELECT json_agg(json_build_object('image_id', pi.id, 'url', pi.url, 'color_id', pi."colorId")) FROM "ProductImage" pi WHERE pi."productId" = p.id), '[]'::json) as images,
          COALESCE((SELECT json_agg(json_build_object('color_id', pc.id, 'name', pc.name, 'hex_code', pc.hex_code)) FROM "ProductColor" pc WHERE pc."productId" = p.id), '[]'::json) as colors,
          COALESCE((SELECT json_agg(ps.name ORDER BY ps.id) FROM "ProductSize" ps WHERE ps."productId" = p.id), '[]'::json) as sizes,
          COALESCE((
            SELECT jsonb_object_agg(
              ps.name || '_' || pc.name, 
              pv.stock
            ) 
            FROM "ProductVariant" pv
            JOIN "ProductSize" ps ON pv."sizeId" = ps.id
            JOIN "ProductColor" pc ON pv."colorId" = pc.id
            WHERE ps."productId" = p.id
          ), '{}'::jsonb) as stock
        FROM "Product" p
        ORDER BY p."createdAt" DESC;
      `;
    } else {
      // Use old structure without stock column (temporary fix)
      query = `
        SELECT
          p.id, p.name, p.price, p."salePrice", p."audioUrl",
          COALESCE((SELECT json_agg(json_build_object('image_id', pi.id, 'url', pi.url, 'color_id', pi."colorId")) FROM "ProductImage" pi WHERE pi."productId" = p.id), '[]'::json) as images,
          COALESCE((SELECT json_agg(json_build_object('color_id', pc.id, 'name', pc.name, 'hex_code', pc.hex_code)) FROM "ProductColor" pc WHERE pc."productId" = p.id), '[]'::json) as colors,
          COALESCE((SELECT json_agg(ps.name ORDER BY ps.id) FROM "ProductSize" ps WHERE ps."productId" = p.id), '[]'::json) as sizes,
          '{}'::jsonb as stock
        FROM "Product" p
        ORDER BY p."createdAt" DESC;
      `;
    }
    
    const result = await pool.query(query);

    const products = result.rows.map(product => ({
      ...product,
      price: parseFloat(product.price),
      salePrice: product.salePrice ? parseFloat(product.salePrice) : null,
    }));
    
    return NextResponse.json(products);

  } catch (error) {
    console.error('[API_PUBLIC_GET_PRODUCTS_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}