// src/app/api/auth/signup/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db'; // Your database connection utility
import bcrypt from 'bcrypt';  // For password hashing
import { z } from 'zod';       // For data validation

// Define a schema for strict input validation using Zod.
// This ensures the data from the frontend is safe and in the correct format.
const userSignUpSchema = z.object({
  firstName: z.string().trim().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().trim().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "A valid phone number is required." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  terms: z.boolean().refine(val => val === true, { message: "You must accept the terms and conditions." }),
});


export async function POST(req: Request) {
  // Use a try...catch block to handle potential errors gracefully.
  try {
    const body = await req.json();
    
    // 1. VALIDATE THE INCOMING DATA
    // We use safeParse to avoid throwing an error and handle the result gracefully.
    const validation = userSignUpSchema.safeParse(body);

    if (!validation.success) {
      // If validation fails, return a 400 Bad Request response with the error details.
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    // Destructure the validated data.
    const { firstName, lastName, email, phone, password } = validation.data;

    // 2. CHECK FOR EXISTING USER
    // It's crucial to prevent duplicate accounts. We check against a lowercase version of the email.
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      // If a user with this email is found, return a 409 Conflict error.
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    // 3. HASH THE PASSWORD
    // This is a critical security step. Never store passwords in plain text.
    const saltRounds = 10; // A standard value for bcrypt salt rounds
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. INSERT THE NEW USER INTO THE DATABASE
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING user_id, first_name, email, created_at`, // Return some data to confirm success
      [firstName, lastName, email.toLowerCase(), phone, passwordHash]
    );

    // 5. SEND A SUCCESS RESPONSE
    // Return a 201 Created status and the newly created user's info (without the password hash).
    return NextResponse.json(
      { 
        message: 'User created successfully!',
        user: newUser.rows[0] 
      }, 
      { status: 201 }
    );

  } catch (error) {
    // Log the actual error on the server for debugging purposes.
    console.error('Sign-up API Error:', error);

    // Return a generic 500 Internal Server Error to the client.
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}