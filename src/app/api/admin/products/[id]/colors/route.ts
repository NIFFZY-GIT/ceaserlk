import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { colors } = await req.json();
    
    if (!Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json({ error: 'At least one color is required' }, { status: 400 });
    }

    // Validate colors
    for (const color of colors) {
      if (!color.name || !color.hex_code) {
        return NextResponse.json({ error: 'Color name and hex code are required' }, { status: 400 });
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(color.hex_code)) {
        return NextResponse.json({ error: 'Invalid hex code format' }, { status: 400 });
      }
    }

    await client.query('BEGIN');

    // Delete existing colors for this product
    await client.query('DELETE FROM "ProductColor" WHERE "productId" = $1', [productId]);

    // Insert new colors
    if (colors.length > 0) {
      const colorValues: (string | number)[] = [];
      const colorPlaceholders = colors.map((color, index) => {
        const offset = index * 3;
        colorValues.push(color.name, color.hex_code, productId);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ');

      const colorQuery = `
        INSERT INTO "ProductColor" (name, hex_code, "productId") 
        VALUES ${colorPlaceholders}
      `;
      await client.query(colorQuery, colorValues);
    }

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Colors updated successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update product colors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
