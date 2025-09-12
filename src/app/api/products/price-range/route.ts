import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const query = `
        SELECT 
            COALESCE(MIN(price), 0) AS "minPrice", 
            COALESCE(MAX(price), 100) AS "maxPrice" 
        FROM product_variants;
    `;
    const { rows } = await db.query(query);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('API PRICE RANGE ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch price range' }, { status: 500 });
  }
}