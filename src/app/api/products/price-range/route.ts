import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        MIN(LEAST(p.price, COALESCE(p."salePrice", p.price))) as min_price,
        MAX(LEAST(p.price, COALESCE(p."salePrice", p.price))) as max_price
      FROM "Product" p
      WHERE p.price IS NOT NULL;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        minPrice: 0, 
        maxPrice: 0 
      });
    }

    const { min_price, max_price } = result.rows[0];
    
    return NextResponse.json({
      minPrice: parseFloat(min_price) || 0,
      maxPrice: parseFloat(max_price) || 0,
    });

  } catch (error) {
    console.error('[API_PRICE_RANGE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch price range.' }, { status: 500 });
  }
}
