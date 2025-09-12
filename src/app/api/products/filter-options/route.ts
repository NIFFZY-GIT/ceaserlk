import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const sizeQuery = `SELECT DISTINCT size FROM stock_keeping_units ORDER BY size;`;
    const colorQuery = `SELECT DISTINCT color_name AS name, color_hex_code AS hex FROM product_variants ORDER BY name;`;

    const [sizeResult, colorResult] = await Promise.all([
      db.query(sizeQuery),
      db.query(colorQuery)
    ]);
    
    const availableSizes = sizeResult.rows.map(row => row.size);
    const availableColors = colorResult.rows;

    return NextResponse.json({ availableSizes, availableColors }, { status: 200 });
  } catch (error) {
    console.error('API FILTER OPTIONS ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch filter options' }, { status: 500 });
  }
}