import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your existing pg pool connection
import { z } from 'zod'; // Your existing Zod v4 import

// A schema to validate the incoming data
const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
    try {
        // For now, use the hardcoded user ID
        const userId = '722e9dc0-5b31-41b5-a791-2a8b46a2f062';
        const body = await request.json();

        // Validate the incoming data with Zod
        const validation = updateUserSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues }, { status: 400 });
        }
        const { firstName, lastName, phoneNumber } = validation.data;

        // Use your existing `db.query` method from the `pg` library
        const query = `
            UPDATE users 
            SET first_name = $1, last_name = $2, phone_number = $3, updated_at = NOW()
            WHERE id = $4::uuid
            RETURNING id, first_name AS "firstName", last_name AS "lastName", email, phone_number AS "phoneNumber";
        `;
        const { rows } = await db.query(query, [firstName, lastName, phoneNumber, userId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ data: rows[0] });

    } catch (error) {
        console.error(`API PATCH Profile Error:`, error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}