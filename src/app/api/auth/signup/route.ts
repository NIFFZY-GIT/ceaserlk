import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
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
  promoCode: z.string().max(10).optional().or(z.literal('')), // Optional promo code
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
    const { firstName, lastName, email, phone, password, promoCode } = validation.data;
    const sanitizedFirstName = firstName.trim();
    const sanitizedLastName = lastName.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhone = typeof phone === 'string' && phone.trim() !== '' ? phone.trim() : null;
    const sanitizedPromoCode = typeof promoCode === 'string' && promoCode.trim() !== '' ? promoCode.trim().toUpperCase() : null;

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
      // SECURITY: Do not expose database error details to clients
      return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
    }

    const newUser = newUserResult.rows[0];

    // 5. Apply promo code if provided
    let promoResult = null;
    if (sanitizedPromoCode) {
      try {
        const promoApplyResult = await db.query(
          `SELECT apply_promo_code($1, $2) as result`,
          [newUser.id, sanitizedPromoCode]
        );
        promoResult = promoApplyResult.rows[0]?.result;
        
        if (promoResult && !promoResult.success) {
          console.log('Promo code application note:', promoResult.error);
          // Don't fail signup if promo code application fails, just log it
        }
      } catch (promoErr) {
        console.error('PROMO_APPLY_ERROR:', promoErr);
        // Don't fail signup if promo code application fails
      }
    }

    // 6. Generate a promo code for the new user
    try {
      await db.query(
        `SELECT generate_promo_code($1)`,
        [newUser.id]
      );
    } catch (genPromoErr) {
      console.error('PROMO_GENERATE_ERROR:', genPromoErr);
      // Don't fail signup if promo code generation fails
    }

    // 7. Return a success response
    return NextResponse.json({
      message: 'User created successfully.',
      user: newUser,
      promoApplied: promoResult?.success || false,
      freeDeliveryGranted: promoResult?.success || false,
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