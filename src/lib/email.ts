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

  return nodemailer.createTransport({
    ...config,
    // TLS settings for modern SMTP servers (Zoho, Gmail, etc.)
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  });
}

// Send email function
export async function sendEmail(emailData: EmailData): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email credentials not configured');
    throw new Error('Email service not configured');
  }

  const transporter = createEmailTransporter();

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'CEASAR'}" <${process.env.EMAIL_USER}>`,
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
  paymentMethod?: 'CARD' | 'COD';
}): string {
  const itemsHtml = orderData.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid rgba(16, 125, 63, 0.1);">
      <td style="padding: 16px 12px; color: #000000; font-weight: 500;">${item.productName}</td>
      <td style="padding: 16px 12px; color: #666666;">${item.variantColor} / ${item.variantSize}</td>
      <td style="padding: 16px 12px; text-align: center; color: #000000; font-weight: 600;">${item.quantity}</td>
      <td style="padding: 16px 12px; text-align: right; color: #000000;">LKR ${item.pricePaid.toFixed(2)}</td>
      <td style="padding: 16px 12px; text-align: right; color: #107D3F; font-weight: 600;">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
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
      <title>Order Confirmation | CEASAR</title>
    </head>
    <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.8; color: #000000; max-width: 650px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      
      <!-- Header Image -->
      <div style="text-align: center; background-color: #000000;">
        <img src="https://www.inceasar.com/assets/mailheader.png" alt="CEASAR" style="width: 100%; max-width: 650px; height: auto; display: block;" />
      </div>
      
      <div style="background-color: #000000; padding: 30px 30px 40px; text-align: center; border-bottom: 1px solid rgba(16, 125, 63, 0.2);">
        <p style="color: #107D3F; font-size: 0.95em; letter-spacing: 3px; margin: 0; text-transform: uppercase; font-weight: 600;">Order Confirmation</p>
      </div>
      
      <div style="padding: 40px 30px; background-color: #ffffff;">
        
        <!-- Welcome Message -->
        <div style="background-color: #f8f8f8; padding: 30px; border-radius: 8px; margin-bottom: 40px; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; display: flex;">
            <div style="flex: 1; background-color: #107D3F;"></div>
            <div style="flex: 1; background-color: #ffffff;"></div>
            <div style="flex: 1; background-color: #EF3D4C;"></div>
          </div>
          <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 1.8em; font-weight: 400; letter-spacing: 1px;">Thank You, ${orderData.customerName}</h2>
          <p style="color: #333333; margin: 0 0 20px 0; font-size: 1.05em; line-height: 1.7;">Your order has been confirmed and will be processed with the utmost care. We appreciate your trust in CEASAR.</p>
          <div style="background-color: #000000; color: #FFFFFF; display: inline-block; padding: 12px 24px; border-radius: 6px; margin-top: 10px;">
            <span style="color: #107D3F; font-weight: 600; letter-spacing: 1px;">ORDER #</span>
            <span style="font-weight: 700; font-size: 1.2em; letter-spacing: 2px; margin-left: 8px;">${orderData.orderId}</span>
          </div>
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 40px;">
          <div style="background-color: #000000; color: #FFFFFF; padding: 16px 20px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 1.2em; font-weight: 400; letter-spacing: 2px; text-transform: uppercase;">Your Selection</h3>
          </div>
          <div style="background-color: #FFFFFF; border: 2px solid #f0f0f0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f8f8; border-bottom: 2px solid #107D3F;">
                  <th style="padding: 14px 12px; text-align: left; color: #000000; font-weight: 600; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">Item</th>
                  <th style="padding: 14px 12px; text-align: left; color: #000000; font-weight: 600; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">Details</th>
                  <th style="padding: 14px 12px; text-align: center; color: #000000; font-weight: 600; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">Qty</th>
                  <th style="padding: 14px 12px; text-align: right; color: #000000; font-weight: 600; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">Price</th>
                  <th style="padding: 14px 12px; text-align: right; color: #000000; font-weight: 600; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Order Summary -->
        <div style="margin-bottom: 40px;">
          <div style="background-color: #107D3F; color: #FFFFFF; padding: 16px 20px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 1.2em; font-weight: 400; letter-spacing: 2px; text-transform: uppercase;">Order Summary</h3>
          </div>
          <div style="background-color: #FFFFFF; border: 2px solid #f0f0f0; border-top: none; border-radius: 0 0 8px 8px; padding: 25px;">
            <table style="width: 100%; font-size: 1.05em;">
              <tr>
                <td style="padding: 12px 0; color: #666666; letter-spacing: 0.5px;">Subtotal</td>
                <td style="text-align: right; padding: 12px 0; color: #000000; font-weight: 500;">LKR ${orderData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #666666; letter-spacing: 0.5px;">Shipping</td>
                <td style="text-align: right; padding: 12px 0; color: #000000; font-weight: 500;">LKR ${orderData.shippingCost.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 3px solid #107D3F;">
                <td style="padding: 20px 0 0 0; color: #000000; font-weight: 700; font-size: 1.2em; letter-spacing: 1px; text-transform: uppercase;">Total</td>
                <td style="text-align: right; padding: 20px 0 0 0; color: #107D3F; font-weight: 700; font-size: 1.4em;">LKR ${orderData.totalAmount.toFixed(2)}</td>
              </tr>
              ${orderData.paymentMethod === 'COD' ? `
              <tr style="border-top: 2px solid #f0f0f0;">
                <td style="padding: 20px 0 0 0; color: #EF3D4C; font-weight: 600; font-size: 1em; letter-spacing: 0.5px;">Payment Method</td>
                <td style="text-align: right; padding: 20px 0 0 0; color: #EF3D4C; font-weight: 700; font-size: 1.1em;">PAY ON DELIVERY</td>
              </tr>` : orderData.paymentMethod === 'CARD' ? `
              <tr style="border-top: 2px solid #f0f0f0;">
                <td style="padding: 20px 0 0 0; color: #107D3F; font-weight: 600; font-size: 1em; letter-spacing: 0.5px;">Payment Status</td>
                <td style="text-align: right; padding: 20px 0 0 0; color: #107D3F; font-weight: 700; font-size: 1.1em;">PAID</td>
              </tr>` : ''}
            </table>
          </div>
        </div>

        <!-- Shipping Address -->
        <div style="margin-bottom: 40px;">
          <div style="background-color: #EF3D4C; color: #FFFFFF; padding: 16px 20px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 1.2em; font-weight: 400; letter-spacing: 2px; text-transform: uppercase;">Shipping Address</h3>
          </div>
          <div style="background-color: #FFFFFF; border: 2px solid #f0f0f0; border-top: none; border-radius: 0 0 8px 8px; padding: 25px;">
            <p style="margin: 0; color: #000000; font-weight: 600; font-size: 1.1em; line-height: 1.8;">${orderData.shippingAddress.line1}</p>
            <p style="margin: 8px 0 0 0; color: #666666; font-size: 1.05em; line-height: 1.8;">${orderData.shippingAddress.city}, ${orderData.shippingAddress.postalCode}</p>
            <p style="margin: 5px 0 0 0; color: #666666; font-size: 1.05em; line-height: 1.8;">${orderData.shippingAddress.country}</p>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #000000; padding: 45px 30px; text-align: center;">
        <h2 style="color: #FFFFFF; margin: 0 0 8px 0; font-size: 2.2em; letter-spacing: 8px; font-weight: 300; text-transform: uppercase;">CEASAR</h2>
        <p style="color: #107D3F; margin: 0 0 30px 0; font-size: 0.85em; letter-spacing: 3px; text-transform: uppercase; font-weight: 500;">Luxury Streetwear</p>
        <p style="margin: 0; color: #999999; font-size: 0.9em; line-height: 1.8;">Questions? Contact us at <a href="mailto:contactus@inceasar.com" style="color: #107D3F; text-decoration: none; font-weight: 600;">contactus@inceasar.com</a></p>
      </div>
      
      <!-- Tri-Color Flag Footer -->
      <div style="display: flex; height: 4px;">
        <div style="flex: 1; background-color: #107D3F;"></div>
        <div style="flex: 1; background-color: #ffffff;"></div>
        <div style="flex: 1; background-color: #EF3D4C;"></div>
      </div>
      
    </body>
    </html>
  `;
}

export function generateAdminOrderNotificationEmail(notificationData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phoneNumber?: string | null;
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
  const itemsHtml = notificationData.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${item.productName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; color: #666;">${item.variantColor} / ${item.variantSize}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center; font-weight: 600;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right; color: #107D3F; font-weight: 600;">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  const phoneLine = notificationData.phoneNumber
    ? `<p style="margin: 8px 0 0 0; color: #666;"><strong style="color: #000;">Phone:</strong> ${notificationData.phoneNumber}</p>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Notification | CEASAR</title>
    </head>
    <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #000000; max-width: 650px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      
      <!-- Tri-Color Flag Header -->
      <div style="display: flex; height: 4px;">
        <div style="flex: 1; background-color: #107D3F;"></div>
        <div style="flex: 1; background-color: #ffffff;"></div>
        <div style="flex: 1; background-color: #EF3D4C;"></div>
      </div>
      
      <div style="background-color: #000000; padding: 50px 30px; text-align: center; border-bottom: 1px solid rgba(16, 125, 63, 0.2);">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 3em; letter-spacing: 8px; font-weight: 300; text-transform: uppercase;">CEASAR</h1>
        <p style="color: #107D3F; margin: 15px 0 0 0; font-size: 0.9em; letter-spacing: 2px; text-transform: uppercase; font-weight: 500;">New Order Notification</p>
      </div>
      
      <div style="padding: 40px 30px;">
        
        <p style="margin: 0 0 25px 0; color: #333; font-size: 1.05em;">A new order has been placed on CEASAR.</p>

        <!-- Customer Details -->
        <div style="background-color: #f8f8f8; padding: 25px; border-radius: 8px; margin-bottom: 30px; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; display: flex;">
            <div style="flex: 1; background-color: #107D3F;"></div>
            <div style="flex: 1; background-color: #ffffff;"></div>
            <div style="flex: 1; background-color: #EF3D4C;"></div>
          </div>
          <p style="margin: 0 0 8px 0;"><strong style="color: #000;">Order ID:</strong> <span style="font-family: monospace; font-size: 1.1em; color: #107D3F;">${notificationData.orderId}</span></p>
          <p style="margin: 8px 0; color: #666;"><strong style="color: #000;">Customer:</strong> ${notificationData.customerName}</p>
          <p style="margin: 8px 0 0 0; color: #666;"><strong style="color: #000;">Email:</strong> ${notificationData.customerEmail}</p>
          ${phoneLine}
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 1.1em; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 10px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 8px;">
            <thead>
              <tr style="background-color: #000000; color: #ffffff;">
                <th style="padding: 12px; text-align: left; font-weight: 500; font-size: 0.85em; letter-spacing: 1px; text-transform: uppercase;">Product</th>
                <th style="padding: 12px; text-align: left; font-weight: 500; font-size: 0.85em; letter-spacing: 1px; text-transform: uppercase;">Variant</th>
                <th style="padding: 12px; text-align: center; font-weight: 500; font-size: 0.85em; letter-spacing: 1px; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px; text-align: right; font-weight: 500; font-size: 0.85em; letter-spacing: 1px; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Order Summary -->
        <div style="background-color: #f8f8f8; padding: 20px 25px; border-radius: 8px; margin-bottom: 30px;">
          <table style="width: 100%; font-size: 1.05em;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right; color: #000; font-weight: 500;">LKR ${notificationData.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Shipping</td>
              <td style="padding: 8px 0; text-align: right; color: #000; font-weight: 500;">LKR ${notificationData.shippingCost.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #107D3F;">
              <td style="padding: 15px 0 0 0; color: #000; font-weight: 700; font-size: 1.15em; letter-spacing: 1px; text-transform: uppercase;">Total</td>
              <td style="padding: 15px 0 0 0; text-align: right; color: #107D3F; font-weight: 700; font-size: 1.3em;">LKR ${notificationData.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Shipping Address -->
        <div style="border-left: 3px solid #000000; padding-left: 20px; margin-bottom: 30px;">
          <h3 style="margin: 0 0 12px 0; color: #000000; font-size: 1em; letter-spacing: 1px; text-transform: uppercase;">Shipping Address</h3>
          <p style="margin: 0; color: #000; font-size: 1.05em; line-height: 1.8;">${notificationData.shippingAddress.line1}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 1.05em; line-height: 1.8;">${notificationData.shippingAddress.city}, ${notificationData.shippingAddress.postalCode}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 1.05em; line-height: 1.8;">${notificationData.shippingAddress.country}</p>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 0.9em; color: #999;">This notification was sent automatically by CEASAR.</p>
      </div>

      <!-- Footer -->
      <div style="background-color: #000000; padding: 30px; text-align: center;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 1.8em; letter-spacing: 6px; font-weight: 300; text-transform: uppercase;">CEASAR</h2>
        <p style="color: #107D3F; margin: 8px 0 0 0; font-size: 0.8em; letter-spacing: 2px; text-transform: uppercase;">Luxury Streetwear</p>
      </div>
      
      <!-- Tri-Color Flag Footer -->
      <div style="display: flex; height: 4px;">
        <div style="flex: 1; background-color: #107D3F;"></div>
        <div style="flex: 1; background-color: #ffffff;"></div>
        <div style="flex: 1; background-color: #EF3D4C;"></div>
      </div>

    </body>
    </html>
  `;
}

// Generate order status update email HTML
export function generateOrderStatusUpdateEmail(updateData: {
  customerName: string;
  orderId: string;
  newStatus: string;
  profileUrl: string;
  deliveryId?: string | null;
}): string {
  const statusDescriptions: Record<string, string> = {
    PROCESSING: 'Your order is now being processed. We are getting your items ready for shipment.',
    PACKED: 'Your order has been packed and is awaiting pickup by our courier.',
    SHIPPED: 'Good news! Your order has been shipped and is on its way to you.',
    DELIVERED: 'Your order has been delivered. We hope you enjoy your new items!',
    CANCELLED: 'Your order has been cancelled as requested.',
    REFUNDED: 'Your order has been refunded. The funds should appear in your account shortly.'
  };

  const description = statusDescriptions[updateData.newStatus] || `Your order status has been updated to: ${updateData.newStatus}.`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Status Update | CEASAR</title>
    </head>
    <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #000000; max-width: 650px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      
      <!-- Header Image -->
      <div style="text-align: center; background-color: #000000;">
        <img src="https://www.inceasar.com/assets/mailheader.png" alt="CEASAR" style="width: 100%; max-width: 650px; height: auto; display: block;" />
      </div>
      
      <div style="background-color: #000000; padding: 30px 30px 40px; text-align: center; border-bottom: 1px solid rgba(16, 125, 63, 0.2);">
        <p style="color: #107D3F; margin: 0; font-size: 0.9em; letter-spacing: 2px; text-transform: uppercase; font-weight: 500;">Order Status Update</p>
      </div>
      
      <div style="padding: 40px 30px;">
        
        <!-- Status Update Message -->
        <div style="background-color: #f8f8f8; padding: 30px; border-radius: 8px; margin-bottom: 35px; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; display: flex;">
            <div style="flex: 1; background-color: #107D3F;"></div>
            <div style="flex: 1; background-color: #ffffff;"></div>
            <div style="flex: 1; background-color: #EF3D4C;"></div>
          </div>
          <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 1.5em; font-weight: 400; letter-spacing: 1px;">Hello, ${updateData.customerName}</h2>
          <p style="margin: 0 0 15px 0; color: #333; font-size: 1.05em; line-height: 1.8;">Your order <strong style="color: #107D3F; font-family: monospace;">#${updateData.orderId}</strong> status has been updated to:</p>
          <div style="background-color: #000000; color: #FFFFFF; display: inline-block; padding: 12px 24px; border-radius: 6px; margin: 10px 0 15px 0;">
            <span style="font-weight: 700; font-size: 1.1em; letter-spacing: 2px; text-transform: uppercase;">${updateData.newStatus}</span>
          </div>
          <p style="margin: 15px 0 0 0; color: #666; font-size: 1.05em; line-height: 1.8;">${description}</p>
        </div>

        ${updateData.deliveryId ? `
        <!-- Tracking Information -->
        <div style="background-color: #f8f8f8; padding: 25px; border-radius: 8px; margin-bottom: 35px; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; display: flex;">
            <div style="flex: 1; background-color: #107D3F;"></div>
            <div style="flex: 1; background-color: #ffffff;"></div>
            <div style="flex: 1; background-color: #EF3D4C;"></div>
          </div>
          <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 1.1em; letter-spacing: 1px; text-transform: uppercase;">Track Your Delivery</h3>
          <p style="margin: 0 0 15px 0; color: #666; font-size: 1.05em;">Your Koombiya Delivery tracking code:</p>
          <div style="background-color: #ffffff; padding: 15px 20px; border-radius: 6px; margin: 15px 0;">
            <p style="font-family: 'Courier New', monospace; font-size: 1.3em; font-weight: bold; color: #107D3F; margin: 0; letter-spacing: 2px;">${updateData.deliveryId}</p>
          </div>
          <a href="https://koombiyodelivery.com" target="_blank" style="display: inline-block; color: #107D3F; text-decoration: none; font-weight: 600; font-size: 1.05em; margin-top: 10px;">Track on Koombiya Delivery →</a>
        </div>
        ` : ''}

        <!-- View Orders Button -->
        <div style="text-align: center; margin: 35px 0;">
          <p style="margin: 0 0 20px 0; color: #666; font-size: 1.05em;">View the full details of your order:</p>
          <a href="${updateData.profileUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; font-size: 0.95em;">View My Orders</a>
        </div>

        <p style="text-align: center; margin-top: 35px; padding-top: 25px; border-top: 1px solid #e0e0e0; color: #999; font-size: 0.95em; line-height: 1.8;">Thank you for shopping with CEASAR. If you have any questions, please contact us at <a href="mailto:contactus@inceasar.com" style="color: #107D3F; text-decoration: none;">contactus@inceasar.com</a></p>
      </div>

      <!-- Footer -->
      <div style="background-color: #000000; padding: 30px; text-align: center;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 1.8em; letter-spacing: 6px; font-weight: 300; text-transform: uppercase;">CEASAR</h2>
        <p style="color: #107D3F; margin: 8px 0 0 0; font-size: 0.8em; letter-spacing: 2px; text-transform: uppercase;">Luxury Streetwear</p>
      </div>
      
      <!-- Tri-Color Flag Footer -->
      <div style="display: flex; height: 4px;">
        <div style="flex: 1; background-color: #107D3F;"></div>
        <div style="flex: 1; background-color: #ffffff;"></div>
        <div style="flex: 1; background-color: #EF3D4C;"></div>
      </div>

    </body>
    </html>
  `;
}