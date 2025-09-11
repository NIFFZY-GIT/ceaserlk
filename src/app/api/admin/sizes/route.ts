import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';

// This function handles GET requests to /api/admin/sizes
// It's used to populate the size choices on your product form.
export async function GET() {
  try {
    const { rows } = await pool.query('SELECT size_id as id, name FROM sizes ORDER BY size_id ASC');
    return NextResponse.json({ sizes: rows });
  } catch (error) {
    console.error('Failed to fetch sizes:', error);
    return NextResponse.json({ error: 'Failed to fetch sizes.' }, { status: 500 });
  }
}

// Zod schema for validating the data when creating a new size
const sizeSchema = z.object({
  name: z.string().trim().min(1, { message: "Size name is required" }),
});

// This function handles POST requests to /api/admin/sizes
// It's called when you submit the "Add New Size" modal.
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the incoming data against the schema
    const validation = sizeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name } = validation.data;

    // Check if size already exists (case-insensitive)
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM sizes WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (existingRows.length > 0) {
      return NextResponse.json({ error: `Size "${name}" already exists.` }, { status: 409 });
    }

    // Insert the new size into the database
    const { rows } = await pool.query(
      'INSERT INTO sizes (name) VALUES ($1) RETURNING size_id as id, name',
      [name]
    );

    // Return the newly created size object
    return NextResponse.json(rows[0], { status: 201 });

  } catch (error) {
    console.error('Failed to create size:', error);
    // Handle specific error for duplicate sizes
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // PostgreSQL's unique_violation error code
        return NextResponse.json({ error: 'This size already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}