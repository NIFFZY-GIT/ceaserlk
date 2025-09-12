import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { z } from 'zod';

// Define a schema for input validation using Zod
const userSignUpSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
  terms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions.',
  }),
});


export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate the incoming data against the schema
    const validation = userSignUpSchema.safeParse(body);

    if (!validation.success) {
      // V V V THIS IS THE CORRECTED LINE V V V
      // Changed validation.error.errors to validation.error.issues
      const errorMessages = validation.error.issues.map(issue => issue.message).join(', ');
      // ^ ^ ^ THIS IS THE CORRECTED LINE ^ ^ ^
      
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }
    
    // Destructure validated data
    const { firstName, lastName, email, phone, password } = validation.data;

    // 2. Check if a user with that email already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    // 3. Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Insert the new user into the database
    const query = {
      text: `
        INSERT INTO users (first_name, last_name, email, phone_number, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, first_name, last_name
      `,
      values: [firstName, lastName, email.toLowerCase(), phone, hashedPassword],
    };

    const newUserResult = await db.query(query);
    const newUser = newUserResult.rows[0];

    // 5. Return a success response
    return NextResponse.json({
      message: 'User created successfully.',
      user: newUser
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('API_SIGNUP_ERROR:', error);
    // Generic error for unexpected issues
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}