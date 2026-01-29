import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
const emailSecure = process.env.EMAIL_SECURE
  ? process.env.EMAIL_SECURE.toLowerCase() === 'true'
  : emailPort === 465;

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: emailPort,
  secure: emailSecure,
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
      from: `${process.env.EMAIL_FROM_NAME || 'CEASAR'} <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Verification Code - CEASAR',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
          <!-- Outer wrapper table for background -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 20px 10px;">
                
                <!-- Main content table -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px;">
                  
                  <!-- Header Image -->
                  <tr>
                    <td align="center" style="padding: 0; background-color: #000000;">
                      <img src="https://www.inceasar.com/assets/mailheadertop.png" alt="CEASAR" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
                    </td>
                  </tr>
                  
                  <!-- Title -->
                  <tr>
                    <td align="center" style="padding: 40px 30px 20px 30px;">
                      <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; margin: 0; color: #000000;">Password Reset</h1>
                    </td>
                  </tr>
                  
                  <!-- Greeting -->
                  <tr>
                    <td style="padding: 0 30px;">
                      <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                        Hello <strong>${user.first_name}</strong>,
                      </p>
                      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                        We received a request to reset your password. Use the verification code below to continue:
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Verification Code Box -->
                  <tr>
                    <td align="center" style="padding: 0 30px 30px 30px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="background-color: #000000; padding: 25px 50px; border-radius: 0;">
                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #ffffff;">
                              ${verificationCode}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Security Notice -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f8f8; border-left: 4px solid #000000;">
                        <tr>
                          <td style="padding: 15px 20px;">
                            <p style="font-size: 13px; color: #666666; margin: 0; line-height: 1.5;">
                              <strong style="color: #000000;">⏱ Security Notice:</strong><br/>
                              This code will expire in <strong>10 minutes</strong>. If you didn't request this password reset, please ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Help Text -->
                  <tr>
                    <td style="padding: 0 30px 40px 30px;">
                      <p style="font-size: 13px; color: #888888; line-height: 1.6; margin: 0;">
                        If you're having trouble, you can reply to this email or contact our support team.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #000000; padding: 30px; text-align: center;">
                      <p style="font-size: 11px; color: #888888; margin: 0; letter-spacing: 1px;">
                        © ${new Date().getFullYear()} CEASAR. All rights reserved.
                      </p>
                      <p style="font-size: 11px; color: #666666; margin: 10px 0 0 0;">
                        <a href="https://www.inceasar.com" style="color: #888888; text-decoration: none;">www.inceasar.com</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Hello ${user.first_name},

We received a request to reset your password for your CEASAR account.

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