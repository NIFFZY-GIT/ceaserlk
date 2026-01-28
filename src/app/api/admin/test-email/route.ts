import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const token = req.cookies.get('session-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifySessionToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { testEmail } = body as { testEmail: string };

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email address is required' }, { status: 400 });
    }

    // Email configuration
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.NO_REPLY_EMAIL || process.env.EMAIL_USER || 'no-reply@inceasar.com',
        pass: process.env.NO_REPLY_PASSWORD || process.env.EMAIL_PASSWORD || '',
      },
    };

    console.log('🔧 Email Configuration Check:');
    console.log('  Host:', emailConfig.host);
    console.log('  Port:', emailConfig.port);
    console.log('  Secure:', emailConfig.secure);
    console.log('  User:', emailConfig.auth.user);
    console.log('  Has Password:', !!emailConfig.auth.pass);
    console.log('  Password Length:', emailConfig.auth.pass.length);

    const transporter = nodemailer.createTransport(emailConfig);

    // Test connection
    console.log('🔌 Testing SMTP connection...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError);
      return NextResponse.json({
        success: false,
        error: 'SMTP connection failed',
        details: String(verifyError),
        config: {
          host: emailConfig.host,
          port: emailConfig.port,
          user: emailConfig.auth.user,
          hasPassword: !!emailConfig.auth.pass,
        }
      }, { status: 500 });
    }

    // Send test email
    console.log(`📧 Sending test email to: ${testEmail}`);
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'CEASAR'}" <${emailConfig.auth.user}>`,
      to: testEmail,
      subject: '🧪 Test Email from CEASAR Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #CE2B37;">✅ Email Configuration Test</h2>
          <p>This is a test email from your CEASAR bulk email system.</p>
          <p>If you're reading this, your email configuration is working correctly!</p>
          <hr />
          <h3>Configuration Used:</h3>
          <ul>
            <li><strong>Host:</strong> ${emailConfig.host}</li>
            <li><strong>Port:</strong> ${emailConfig.port}</li>
            <li><strong>Secure:</strong> ${emailConfig.secure}</li>
            <li><strong>From:</strong> ${emailConfig.auth.user}</li>
          </ul>
          <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully');
      console.log('   Message ID:', info.messageId);
      console.log('   Response:', info.response);

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: info.messageId,
        sentTo: testEmail,
        config: {
          host: emailConfig.host,
          port: emailConfig.port,
          from: emailConfig.auth.user,
        }
      });
    } catch (sendError) {
      console.error('❌ Failed to send test email:', sendError);
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email',
        details: String(sendError),
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Test email endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
