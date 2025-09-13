import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

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

// Create email transporter
export function createEmailTransporter(): nodemailer.Transporter {
  const config: EmailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || '',
    },
  };

  return nodemailer.createTransport(config);
}

// Send email function
export async function sendEmail(emailData: EmailData): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email credentials not configured');
    throw new Error('Email service not configured');
  }

  const transporter = createEmailTransporter();

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Ceaser LK'}" <${process.env.EMAIL_USER}>`,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
    attachments: emailData.attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Generate order confirmation email HTML
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
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.variantColor} / ${item.variantSize}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">LKR ${item.pricePaid.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - Ceaser LK</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000; margin-bottom: 10px;">Ceaser LK</h1>
        <h2 style="color: #666; font-weight: normal;">Order Confirmation</h2>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #000; margin-top: 0;">Thank you for your order, ${orderData.customerName}!</h3>
        <p>Your order has been confirmed and is being processed. Here are your order details:</p>
        <p><strong>Order ID:</strong> ${orderData.orderId}</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
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
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Order Summary</h3>
        <table style="width: 100%; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0;">Subtotal:</td>
            <td style="text-align: right; padding: 8px 0;">LKR ${orderData.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Shipping:</td>
            <td style="text-align: right; padding: 8px 0;">LKR ${orderData.shippingCost.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #000; font-weight: bold; font-size: 1.1em;">
            <td style="padding: 12px 0;">Total:</td>
            <td style="text-align: right; padding: 12px 0;">LKR ${orderData.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Shipping Address</h3>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0;">${orderData.shippingAddress.line1}</p>
          <p style="margin: 5px 0 0 0;">${orderData.shippingAddress.city}, ${orderData.shippingAddress.postalCode}</p>
          <p style="margin: 5px 0 0 0;">${orderData.shippingAddress.country}</p>
        </div>
      </div>

      <div style="background-color: #000; color: #fff; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;">We'll send you a shipping confirmation email when your order is on its way.</p>
        <p style="margin: 10px 0 0 0;">Thank you for shopping with Ceaser LK!</p>
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #666;">
        <p>This email was sent from Ceaser LK. If you have any questions, please contact us.</p>
      </div>
    </body>
    </html>
  `;
}