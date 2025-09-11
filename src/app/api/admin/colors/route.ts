import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';

// This function handles GET requests to /api/admin/colors
// It's used to populate the color choices on your product form.
export async function GET() {
  try {
    // Get all unique colors from ProductColor table
    const { rows } = await pool.query(`
      SELECT DISTINCT 
        name, 
        hex_code,
        MIN(id) as id
      FROM "ProductColor" 
      GROUP BY name, hex_code
      ORDER BY name ASC
    `);

    return NextResponse.json({ colors: rows });
  } catch (error) {
    console.error('Failed to fetch colors:', error);
    return NextResponse.json({ error: 'Failed to fetch colors.' }, { status: 500 });
  }
}

// Zod schema for validating the data when creating a new color
const colorSchema = z.object({
  name: z.string().trim().min(1, { message: "Color name is required" }),
  hex_code: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: "Invalid hex code format (e.g., #FFFFFF)" }),
});

// This function handles POST requests to /api/admin/colors
// It's called when you submit the "Add New Color" form.
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the incoming data against the schema
    const validation = colorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, hex_code } = validation.data;

    // Check if color already exists (case-insensitive for name, case-sensitive for hex)
    const { rows: existingColors } = await pool.query(`
      SELECT name, hex_code 
      FROM "ProductColor" 
      WHERE LOWER(name) = LOWER($1) OR UPPER(hex_code) = UPPER($2)
    `, [name, hex_code]);

    if (existingColors.length > 0) {
      const duplicateName = existingColors.find(c => 
        c.name.toLowerCase() === name.toLowerCase()
      );
      const duplicateHex = existingColors.find(c => 
        c.hex_code.toUpperCase() === hex_code.toUpperCase()
      );

      if (duplicateName && duplicateHex) {
        return NextResponse.json({ 
          error: `Color "${name}" with hex code "${hex_code}" already exists.` 
        }, { status: 409 });
      } else if (duplicateName) {
        return NextResponse.json({ 
          error: `Color name "${name}" already exists.` 
        }, { status: 409 });
      } else if (duplicateHex) {
        return NextResponse.json({ 
          error: `Hex code "${hex_code}" already exists.` 
        }, { status: 409 });
      }
    }

    // This endpoint is meant for creating global colors that can be reused
    // For now, we'll return success but note that the color will be created 
    // when it's actually assigned to a product
    return NextResponse.json({ 
      name: name,
      hex_code: hex_code.toUpperCase(),
      message: "Color validated and ready to use"
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Failed to validate color:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}