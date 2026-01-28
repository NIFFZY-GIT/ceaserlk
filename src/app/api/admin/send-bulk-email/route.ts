import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import nodemailer from 'nodemailer';

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
}

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
    const { subject, htmlBody, attachments } = body as {
      subject: string;
      htmlBody: string;
      attachments?: EmailAttachment[];
    };

    if (!subject || !htmlBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    // Fetch all users from database
    const result = await db.query(
      'SELECT email, first_name, last_name FROM users WHERE role = $1',
      ['USER']
    );

    const users = result.rows;

    if (users.length === 0) {
      return NextResponse.json({ message: 'No users found to send emails to' }, { status: 200 });
    }

    // Create email transporter with no-reply email
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.NO_REPLY_EMAIL || 'no-reply@inceasar.com',
        pass: process.env.NO_REPLY_PASSWORD || process.env.EMAIL_PASSWORD || '',
      },
      tls: {
        minVersion: 'TLSv1.2' as const,
        rejectUnauthorized: true
      }
    };

    console.log('Email configuration:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user,
      hasPassword: !!emailConfig.auth.pass,
    });

    const transporter = nodemailer.createTransport(emailConfig);

    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError);
      return NextResponse.json({ 
        error: 'Email server connection failed', 
        details: String(verifyError),
        config: {
          host: emailConfig.host,
          port: emailConfig.port,
          user: emailConfig.auth.user,
        }
      }, { status: 500 });
    }

    // Prepare attachments
    const emailAttachments = attachments?.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
      contentType: att.contentType,
    })) || [];

    // Send emails to all users
    const emailPromises = users.map(async (user) => {
      const personalizedHtml = htmlBody
        .replace(/{{firstName}}/g, user.first_name)
        .replace(/{{lastName}}/g, user.last_name)
        .replace(/{{fullName}}/g, `${user.first_name} ${user.last_name}`);

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'CEASAR'}" <${process.env.NO_REPLY_EMAIL || 'no-reply@inceasar.com'}>` ,
        to: user.email,
        subject: subject,
        html: personalizedHtml,
        attachments: emailAttachments,
      };

      try {
        console.log(`Sending email to: ${user.email}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${user.email}, Message ID: ${info.messageId}`);
        return { email: user.email, status: 'sent', messageId: info.messageId };
      } catch (error) {
        console.error(`❌ Failed to send email to ${user.email}:`, error);
        return { email: user.email, status: 'failed', error: String(error) };
      }
    });

    const results = await Promise.all(emailPromises);

    const successCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log('📊 Email sending summary:', {
      total: users.length,
      successful: successCount,
      failed: failedCount,
      results: results
    });

    return NextResponse.json({
      message: `Emails sent successfully`,
      total: users.length,
      successful: successCount,
      failed: failedCount,
      results: results,
    });

  } catch (error) {
    console.error('Error sending bulk emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails', details: String(error) },
      { status: 500 }
    );
  }
}
