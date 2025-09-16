import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Debug: Check what tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesResult = await db.query(tablesQuery);
    console.log('Available tables:', tablesResult.rows.map(r => r.table_name));
    
    // Debug: Check product_variants table structure
    const columnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_variants' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    const columnsResult = await db.query(columnsQuery);
    console.log('product_variants columns:', columnsResult.rows);
    
    // Debug: Check if there are any products
    const productsQuery = `SELECT COUNT(*) as count FROM products;`;
    const productsResult = await db.query(productsQuery);
    console.log('Total products in database:', productsResult.rows[0].count);
    
    // Debug: Check if there are any product variants
    const variantsQuery = `SELECT COUNT(*) as count FROM product_variants;`;
    const variantsResult = await db.query(variantsQuery);
    console.log('Total product variants in database:', variantsResult.rows[0].count);
    
    const sizeQuery = `SELECT DISTINCT size FROM stock_keeping_units ORDER BY size;`;
    
    // Debug: First get all colors to see what's in the database
    const debugColorQuery = `
      SELECT color_name, color_hex_code 
      FROM product_variants 
      WHERE color_name IS NOT NULL AND color_name != ''
      ORDER BY color_name;
    `;
    const debugResult = await db.query(debugColorQuery);
    console.log('All colors in database:', debugResult.rows);
    console.log('Total colors found:', debugResult.rows.length);
    
    // Fix: Group by color name to avoid duplicates, pick the first hex code for each name
    const colorQuery = `
      SELECT DISTINCT ON (LOWER(color_name)) 
        color_name AS name, 
        color_hex_code AS hex 
      FROM product_variants 
      WHERE color_name IS NOT NULL AND color_name != ''
      ORDER BY LOWER(color_name), color_hex_code;
    `;

    const [sizeResult, colorResult] = await Promise.all([
      db.query(sizeQuery),
      db.query(colorQuery)
    ]);
    
    console.log('Deduplicated colors from API:', colorResult.rows);
    
    const availableSizes = sizeResult.rows.map(row => row.size);
    const availableColors = colorResult.rows;

    return NextResponse.json({ availableSizes, availableColors }, { status: 200 });
  } catch (error) {
    console.error('API FILTER OPTIONS ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch filter options' }, { status: 500 });
  }
}