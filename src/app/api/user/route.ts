import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your existing pg pool connection
import { z } from 'zod'; // Your existing Zod v4 import
import bcrypt from 'bcryptjs';

// A schema to validate the incoming data
const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  // Password change fields
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If any password field is provided, all must be provided
  const hasPasswordFields = data.currentPassword || data.newPassword || data.confirmPassword;
  if (hasPasswordFields) {
    return data.currentPassword && data.newPassword && data.confirmPassword;
  }
  return true;
}, {
  message: "All password fields are required when changing password",
  path: ["currentPassword"]
}).refine((data) => {
  // If changing password, new password and confirm must match
  if (data.newPassword && data.confirmPassword) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "New passwords do not match",
  path: ["confirmPassword"]
});

export async function PATCH(request: NextRequest) {
    try {
        // For now, use the hardcoded user ID
        const userId = '722e9dc0-5b31-41b5-a791-2a8b46a2f062';
        const body = await request.json();

        // Validate the incoming data with Zod
        const validation = updateUserSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ 
                error: validation.error.issues.map(issue => issue.message).join(', ')
            }, { status: 400 });
        }
        
        const { firstName, lastName, phoneNumber, currentPassword, newPassword } = validation.data;
        
        // If password change is requested, verify current password
        if (currentPassword && newPassword) {
            // Get current password hash from database
            const userQuery = `SELECT password_hash FROM users WHERE id = $1::uuid`;
            const { rows: userRows } = await db.query(userQuery, [userId]);
            
            if (userRows.length === 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            
            const currentPasswordHash = userRows[0].password_hash;
            
            // Verify current password
            const passwordMatch = await bcrypt.compare(currentPassword, currentPasswordHash);
            if (!passwordMatch) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
            
            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            
            // Update user with new password
            const updateQuery = `
                UPDATE users 
                SET first_name = $1, last_name = $2, phone_number = $3, password_hash = $4, updated_at = NOW()
                WHERE id = $5::uuid
                RETURNING id, first_name AS "firstName", last_name AS "lastName", email, phone_number AS "phoneNumber";
            `;
            const { rows } = await db.query(updateQuery, [firstName, lastName, phoneNumber, newPasswordHash, userId]);
            
            if (rows.length === 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            
            return NextResponse.json({ 
                data: rows[0],
                message: 'Profile and password updated successfully'
            });
        } else {
            // Update profile only (no password change)
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

            return NextResponse.json({ 
                data: rows[0],
                message: 'Profile updated successfully'
            });
        }

    } catch (error) {
        console.error(`API PATCH Profile Error:`, error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}