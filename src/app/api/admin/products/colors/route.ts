import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT ON (color_name)
        color_name AS "colorName",
        color_hex_code AS "colorHex"
      FROM product_variants
      WHERE color_name IS NOT NULL AND color_name <> ''
      ORDER BY color_name, color_hex_code
    `;
    const { rows } = await db.query(query);
    
    // Debug: Log the colors being returned
    console.log('Available colors from database:', rows);
    
    return NextResponse.json(rows ?? []);
  } catch (error) {
    console.error('API GET COLORS ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch colors' }, { status: 500 });
  }
}
