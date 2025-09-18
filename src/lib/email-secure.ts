/**
 * Secure Email Service with enhanced security and validation
 * Implements OWASP guidelines for email security
 */

import nodemailer from 'nodemailer';
import { getValidatedEnvironment } from './environment';
import { secureLog, sanitizeHtml } from './security';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email options interface
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Legacy interface for backward compatibility
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Rate limiting for email sending
const emailRateLimit = new Map<string, { count: number; resetTime: number }>();
const EMAIL_RATE_LIMIT = 10; // emails per hour per recipient
const EMAIL_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Create secure email transporter with validation
 */
function createSecureTransporter(): nodemailer.Transporter {
  const env = getValidatedEnvironment();
  
  const config: EmailConfig = {
    host: env.EMAIL_HOST,
    port: parseInt(env.EMAIL_PORT),
    secure: env.EMAIL_SECURE === 'true',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
  };

  // Validate configuration
  if (!config.auth.user || !config.auth.pass) {
    throw new Error('Email authentication credentials are required');
  }

  const transporter = nodemailer.createTransport({
    ...config,
    // Enhanced security options
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000, // 10 seconds
    // Enable secure connection options
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: env.NODE_ENV === 'production'
    }
  });

  return transporter;
}

/**
 * Legacy function for backward compatibility
 */
export function createEmailTransporter(): nodemailer.Transporter {
  return createSecureTransporter();
}

/**
 * Check email rate limiting
 */
function checkEmailRateLimit(recipient: string): boolean {
  const now = Date.now();
  const key = recipient.toLowerCase();
  const record = emailRateLimit.get(key);

  if (!record || now > record.resetTime) {
    emailRateLimit.set(key, { count: 1, resetTime: now + EMAIL_RATE_WINDOW });
    return false; // Not rate limited
  }

  if (record.count >= EMAIL_RATE_LIMIT) {
    return true; // Rate limited
  }

  record.count++;
  return false;
}

/**
 * Validate email address with enhanced security checks
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Basic format validation
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Length validation (RFC 5321)
  if (email.length > 254) {
    return false;
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /[<>\"']/,  // HTML injection attempts
    /javascript:/i,  // Script injection
    /data:/i,  // Data URI
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(email));
}

/**
 * Sanitize email content to prevent injection attacks
 */
function sanitizeEmailContent(content: string): string {
  return sanitizeHtml(content)
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')  // Prevent excessive newlines
    .trim();
}

/**
 * Send secure email with comprehensive validation and logging
 */
export async function sendSecureEmail(options: EmailOptions): Promise<void> {
  try {
    const env = getValidatedEnvironment();
    
    // Validate recipients
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    for (const email of recipients) {
      if (!validateEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
      
      // Check rate limiting
      if (checkEmailRateLimit(email)) {
        secureLog('warn', 'Email rate limit exceeded', { recipient: email });
        throw new Error('Email rate limit exceeded for recipient');
      }
    }

    // Validate and sanitize content
    if (!options.subject || options.subject.length > 998) {
      throw new Error('Email subject is required and must be under 998 characters');
    }

    const sanitizedSubject = sanitizeEmailContent(options.subject);
    const sanitizedText = options.text ? sanitizeEmailContent(options.text) : undefined;
    const sanitizedHtml = options.html ? sanitizeEmailContent(options.html) : undefined;

    // Create transporter
    const transporter = createSecureTransporter();

    // Prepare email options
    const fromAddress = `"${env.EMAIL_FROM_NAME || 'Ceaser LK'}" <${env.EMAIL_USER}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: options.to,
      subject: sanitizedSubject,
      text: sanitizedText,
      html: sanitizedHtml,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo || env.EMAIL_USER,
      attachments: options.attachments,
      // Security headers
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'CeaserLK-SecureMailer',
        'X-Auto-Response-Suppress': 'All',
      }
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    // Log success (without exposing sensitive data)
    secureLog('info', 'Email sent successfully', {
      messageId: result.messageId,
      recipientCount: recipients.length,
      subject: sanitizedSubject.substring(0, 50) + '...',
      hasHtml: !!options.html,
      hasText: !!options.text
    });

    return;
    
  } catch (error) {
    // Log error securely
    secureLog('error', 'Failed to send email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      recipientCount: Array.isArray(options.to) ? options.to.length : 1,
      hasSubject: !!options.subject
    });
    
    throw new Error('Failed to send email');
  }
}

/**
 * Legacy sendEmail function for backward compatibility
 */
export async function sendEmail(emailData: EmailData): Promise<void> {
  return sendSecureEmail({
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
    attachments: emailData.attachments
  });
}

/**
 * Send password reset email with enhanced security
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  verificationCode: string
): Promise<void> {
  const subject = 'Password Reset Verification Code - CeaserLK';
  
  const htmlContent = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello ${sanitizeHtml(firstName)},</p>
        
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
            <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email and contact support immediately.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          For security reasons, never share this code with anyone. Our support team will never ask for your verification code.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="font-size: 12px; color: #6c757d; margin: 0;">
            © ${new Date().getFullYear()} CeaserLK. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const textContent = `
Hello ${firstName},

We received a request to reset your password for your CeaserLK account.

Your verification code is: ${verificationCode}

This code will expire in 10 minutes.

SECURITY NOTICE: If you didn't request this password reset, please ignore this email and contact support immediately. Never share this code with anyone.

Best regards,
CeaserLK Security Team
  `;

  await sendSecureEmail({
    to: email,
    subject,
    html: htmlContent,
    text: textContent
  });
}

// Generate order confirmation email HTML (keeping existing functionality)
export function generateOrderConfirmationEmail(orderData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    variantColor: string;
    variantSize: string;
    quantity: number;
    pricePaid: number;
  }>;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  shippingAddress: {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
}): string {
  const itemsHtml = orderData.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${sanitizeHtml(item.productName)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${sanitizeHtml(item.variantColor)} / ${sanitizeHtml(item.variantSize)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">LKR ${item.pricePaid.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${sanitizeHtml(orderData.orderId)}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Order Confirmed!</h1>
                <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Thank you for your purchase</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                    Hello ${sanitizeHtml(orderData.customerName)},
                </p>
                
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                    Thank you for your order! We've received your payment and are processing your items.
                </p>
                
                <!-- Order Details -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px; color: #333;">Order Details</h3>
                    <p style="margin: 5px 0;"><strong>Order ID:</strong> ${sanitizeHtml(orderData.orderId)}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${sanitizeHtml(orderData.customerEmail)}</p>
                </div>
                
                <!-- Items Table -->
                <h3 style="color: #333; margin-bottom: 15px;">Items Ordered</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f1f3f4;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Variant</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <!-- Totals -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Subtotal:</span>
                        <span><strong>LKR ${orderData.subtotal.toFixed(2)}</strong></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Shipping:</span>
                        <span><strong>LKR ${orderData.shippingCost.toFixed(2)}</strong></span>
                    </div>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 18px;">
                        <span><strong>Total:</strong></span>
                        <span><strong>LKR ${orderData.totalAmount.toFixed(2)}</strong></span>
                    </div>
                </div>
                
                <!-- Shipping Address -->
                <h3 style="color: #333; margin-bottom: 15px;">Shipping Address</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; line-height: 1.5;">
                        ${sanitizeHtml(orderData.shippingAddress.line1)}<br>
                        ${sanitizeHtml(orderData.shippingAddress.city)}<br>
                        ${sanitizeHtml(orderData.shippingAddress.postalCode)}<br>
                        ${sanitizeHtml(orderData.shippingAddress.country)}
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    We'll send you tracking information once your order ships. If you have any questions, please contact our support team.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f1f3f4; text-align: center; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} CeaserLK. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}