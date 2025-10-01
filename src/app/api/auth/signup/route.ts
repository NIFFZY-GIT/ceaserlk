import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { z } from 'zod';

// Define a schema for input validation using Zod
const userSignUpSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string()
    .min(10, { message: 'Phone number must be at least 10 digits.' })
    .max(20, { message: 'Phone number cannot exceed 20 characters.' })
    .optional()
    .or(z.literal('')), // Allow phone to be optional or an empty string
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
      // Log validation issues for debugging
      console.error('SIGNUP_VALIDATION_ERROR:', validation.error.issues);
      const errorMessages = validation.error.issues.map(issue => issue.message).join(', ');
      return NextResponse.json({ error: errorMessages, details: validation.error.issues }, { status: 400 });
    }

    // Destructure and sanitize validated data
    const { firstName, lastName, email, phone, password } = validation.data;
    const sanitizedFirstName = firstName.trim();
    const sanitizedLastName = lastName.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhone = typeof phone === 'string' && phone.trim() !== '' ? phone.trim() : null;

    // 2. Check if a user with that email or phone already exists
    try {
      const existingUserByEmail = await db.query('SELECT id FROM users WHERE email = $1', [sanitizedEmail]);
      if (existingUserByEmail.rows.length > 0) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }

      if (sanitizedPhone) {
        const existingUserByPhone = await db.query('SELECT id FROM users WHERE phone_number = $1', [sanitizedPhone]);
        if (existingUserByPhone.rows.length > 0) {
          return NextResponse.json({ error: 'A user with this phone number already exists.' }, { status: 409 });
        }
      }
    } catch (dbErr) {
      console.error('DB_CHECK_USER_ERROR:', dbErr);
      return NextResponse.json({ error: 'Database error while checking for existing user.' }, { status: 500 });
    }

    // 3. Hash the password securely
    let hashedPassword;
    try {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    } catch (hashErr) {
      console.error('BCRYPT_HASH_ERROR:', hashErr);
      return NextResponse.json({ error: 'Error while securing your password.' }, { status: 500 });
    }

    // 4. Insert the new user into the database
    const query = {
      text: `
        INSERT INTO users (first_name, last_name, email, phone_number, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, first_name, last_name
      `,
      values: [sanitizedFirstName, sanitizedLastName, sanitizedEmail, sanitizedPhone, hashedPassword],
    };

    let newUserResult;
    try {
      newUserResult = await db.query(query);
    } catch (dbInsertErr) {
      console.error('DB_INSERT_USER_ERROR:', dbInsertErr);
      // Return the actual error message for debugging (remove in production)
      let dbErrorMsg = 'Unknown DB error';
      if (dbInsertErr && typeof dbInsertErr === 'object' && 'message' in dbInsertErr) {
        dbErrorMsg = (dbInsertErr as { message: string }).message;
      } else if (typeof dbInsertErr === 'string') {
        dbErrorMsg = dbInsertErr;
      }
      return NextResponse.json({ error: 'Database error while creating user.', details: dbErrorMsg }, { status: 500 });
    }

    const newUser = newUserResult.rows[0];

    // 5. Return a success response
    return NextResponse.json({
      message: 'User created successfully.',
      user: newUser
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('API_SIGNUP_ERROR:', error);
    // Return error details for debugging
    let errorMsg = 'Unknown error';
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
      errorMsg = (error as { message: string }).message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    }
    return NextResponse.json({ error: 'An internal server error occurred.', details: errorMsg }, { status: 500 });
  }
}