import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Check if user exists
    const userQuery = 'SELECT id, first_name, email FROM users WHERE email = $1';
    const { rows: userRows } = await db.query(userQuery, [email]);

    if (userRows.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: 'If an account with that email exists, we sent a verification code.' },
        { status: 200 }
      );
    }

    const user = userRows[0];
    
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store verification code in database
    const insertQuery = `
      INSERT INTO password_reset_codes (user_id, code, email, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET 
        code = EXCLUDED.code, 
        expires_at = EXCLUDED.expires_at, 
        created_at = NOW(),
        used = false
    `;
    
    await db.query(insertQuery, [user.id, verificationCode, email, expiresAt]);

    // Send email with verification code
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'CeaserLK'} <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Verification Code - CeaserLK',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello ${user.first_name},</p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              We received a request to reset your password. Use the verification code below to continue:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #667eea; color: white; padding: 20px 40px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                ${verificationCode}
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you're having trouble, you can reply to this email or contact our support team.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="font-size: 12px; color: #6c757d; margin: 0;">
                © ${new Date().getFullYear()} CeaserLK. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Hello ${user.first_name},

We received a request to reset your password for your CeaserLK account.

Your verification code is: ${verificationCode}

This code will expire in 10 minutes.

If you didn't request this password reset, please ignore this email.

Best regards,
CeaserLK Team
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: 'Verification code sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}