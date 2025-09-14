import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create transporter using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password or app password
      },
    });

    // Email content for admin notification
    const adminMailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Ceaser LK'}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to the same email for admin notifications
      subject: `New Contact Form: ${subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Contact Details</h2>
              
              <div style="margin: 20px 0;">
                <strong style="color: #667eea;">Name:</strong>
                <p style="margin: 5px 0 15px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid #667eea;">${name}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <strong style="color: #667eea;">Email:</strong>
                <p style="margin: 5px 0 15px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid #667eea;">
                  <a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a>
                </p>
              </div>
              
              <div style="margin: 20px 0;">
                <strong style="color: #667eea;">Subject:</strong>
                <p style="margin: 5px 0 15px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid #667eea;">${subject}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <strong style="color: #667eea;">Message:</strong>
                <div style="margin: 5px 0 15px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #667eea; white-space: pre-wrap;">${message}</div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 10px;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                This message was sent from your website contact form on ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      `,
    };

    // Auto-reply email for the user
    const userReplyOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Ceaser LK'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Thank you for contacting Ceaser LK',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">CEASER</h1>
            <p style="color: #ccc; margin: 10px 0 0 0; font-size: 16px;">Thank you for reaching out</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
              
              <p>Thank you for contacting Ceaser Brand. We've received your message and appreciate you taking the time to reach out to us.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a1a1a;">
                <p style="margin: 0; font-weight: bold; color: #1a1a1a;">Your message summary:</p>
                <p style="margin: 5px 0 0 0; color: #666;"><strong>Subject:</strong> ${subject}</p>
              </div>
              
              <p>Our team will review your inquiry and get back to you within 24-48 hours during business hours (Mon-Fri, 9am-5pm EST).</p>
              
              <p>If you have any urgent matters or additional questions, feel free to reply to this email or contact us directly at:</p>
              
              <ul style="color: #666; margin: 15px 0;">
                <li>Email: support@ceaserbrand.com</li>
                <li>Phone: +1 (234) 567-890</li>
              </ul>
              
              <p>Thank you for choosing Ceaser Brand!</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The Ceaser Brand Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 10px;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                This is an automated response. Please do not reply to this email if you need immediate assistance.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    // Send emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userReplyOptions)
    ]);

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email. Please try again.' },
      { status: 500 }
    );
  }
}