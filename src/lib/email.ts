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

// --- SHARED STYLES & COMPONENTS ---
const BRAND_COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  green: '#107D3F',
  red: '#EF3D4C',
  gray: '#F5F5F5',
  darkGray: '#888888',
  border: '#E5E5E5'
};

const COMMON_CSS = `
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; width: 100% !important; background-color: ${BRAND_COLORS.white}; color: ${BRAND_COLORS.black}; }
  .mono { font-family: 'Courier New', Courier, monospace; }
  .uppercase { text-transform: uppercase; letter-spacing: 2px; }
  a { text-decoration: none; color: ${BRAND_COLORS.black}; }
`;

const EMAIL_HEADER = `
  <div style="text-align: center; padding: 40px 0 20px;">
    <img src="https://www.inceasar.com/assets/mailheader.png" alt="CEASAR" style="width: 180px; height: auto; display: block; margin: 0 auto;" />
    <div style="margin-top: 20px; font-size: 10px; letter-spacing: 3px; color: ${BRAND_COLORS.darkGray}; text-transform: uppercase;">Luxury Streetwear</div>
  </div>
`;

const EMAIL_FOOTER = `
  <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid ${BRAND_COLORS.border}; text-align: center;">
    <p style="font-size: 11px; color: ${BRAND_COLORS.darkGray}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
      <a href="https://www.inceasar.com" style="color: ${BRAND_COLORS.black}; font-weight: bold;">InCeasar.com</a>
    </p>
    
    <!-- Tri-Color Flag Accent -->
    <div style="display: flex; width: 30px; height: 3px; margin: 0 auto;">
      <div style="flex: 1; background-color: ${BRAND_COLORS.green};"></div>
      <div style="flex: 1; background-color: ${BRAND_COLORS.white}; border-top: 1px solid #eee; border-bottom: 1px solid #eee;"></div>
      <div style="flex: 1; background-color: ${BRAND_COLORS.red};"></div>
    </div>
    
    <p style="font-size: 10px; color: #999; margin-top: 20px; line-height: 1.6;">
      Need assistance? <a href="mailto:contactus@inceasar.com" style="color: ${BRAND_COLORS.black}; text-decoration: underline;">Contact Support</a><br>
      &copy; ${new Date().getFullYear()} CEASAR. All rights reserved.
    </p>
  </div>
`;

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

// --- TEMPLATE GENERATORS ---

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
    <tr>
      <td style="padding: 20px 0; border-bottom: 1px solid ${BRAND_COLORS.border}; vertical-align: top;">
        <span style="font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">${item.productName}</span>
        <div style="margin-top: 6px; font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-transform: uppercase;">
          ${item.variantColor} <span style="margin: 0 4px;">|</span> Size: ${item.variantSize}
        </div>
      </td>
      <td style="padding: 20px 0; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: center; vertical-align: top; font-family: 'Courier New', monospace; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 20px 0; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: right; vertical-align: top; font-family: 'Courier New', monospace; font-size: 14px;">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
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
      <style>${COMMON_CSS}</style>
    </head>
    <body style="background-color: #ffffff; padding: 20px 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 0 20px;">
        
        ${EMAIL_HEADER}
        
        <div style="text-align: center; margin-bottom: 50px;">
          <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 10px 0;">Order Confirmed</h1>
          <p style="font-size: 14px; color: ${BRAND_COLORS.darkGray}; line-height: 1.6; margin: 0 auto; max-width: 400px;">
            Thank you, ${orderData.customerName}. Your order has been received and is being processed.
          </p>
          <div style="margin-top: 20px; font-family: 'Courier New', monospace; font-size: 14px; background: ${BRAND_COLORS.gray}; display: inline-block; padding: 8px 16px;">
            ORDER ID: #${orderData.orderId}
          </div>
        </div>

        <!-- Order Summary Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr>
              <th style="text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: ${BRAND_COLORS.darkGray}; border-bottom: 2px solid ${BRAND_COLORS.black}; padding-bottom: 12px;">Item</th>
              <th style="text-align: center; width: 40px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: ${BRAND_COLORS.darkGray}; border-bottom: 2px solid ${BRAND_COLORS.black}; padding-bottom: 12px;">Qty</th>
              <th style="text-align: right; width: 100px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: ${BRAND_COLORS.darkGray}; border-bottom: 2px solid ${BRAND_COLORS.black}; padding-bottom: 12px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Financials -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 50px;">
          <div style="width: 100%; max-width: 250px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: ${BRAND_COLORS.darkGray}; font-size: 13px;">Subtotal</td>
                <td style="padding: 8px 0; text-align: right; font-family: 'Courier New', monospace;">LKR ${orderData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: ${BRAND_COLORS.darkGray}; font-size: 13px;">Shipping</td>
                <td style="padding: 8px 0; text-align: right; font-family: 'Courier New', monospace;">LKR ${orderData.shippingCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 16px 0; font-weight: 600; font-size: 13px; text-transform: uppercase; border-top: 1px solid ${BRAND_COLORS.black};">Total</td>
                <td style="padding: 16px 0; text-align: right; font-weight: 600; font-family: 'Courier New', monospace; border-top: 1px solid ${BRAND_COLORS.black};">LKR ${orderData.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="border-top: 1px solid ${BRAND_COLORS.border}; padding-top: 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0;">Shipping Address</h3>
                <div style="font-size: 13px; line-height: 1.8; color: ${BRAND_COLORS.darkGray};">
                  <span style="color: ${BRAND_COLORS.black};">${orderData.shippingAddress.line1}</span><br>
                  ${orderData.shippingAddress.city}<br>
                  ${orderData.shippingAddress.postalCode}, ${orderData.shippingAddress.country}
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0;">Payment</h3>
                <div style="font-size: 13px; line-height: 1.8; color: ${BRAND_COLORS.darkGray};">
                  Method: <span style="color: ${BRAND_COLORS.black}; text-transform: uppercase;">${orderData.paymentMethod || 'N/A'}</span><br>
                  Status: <span style="color: ${BRAND_COLORS.black};">${orderData.paymentMethod === 'COD' ? 'Pending' : 'Paid'}</span>
                </div>
              </td>
            </tr>
          </table>
        </div>

        ${EMAIL_FOOTER}

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
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
             <div style="font-weight: 600;">${item.productName}</div>
             <div style="font-size: 12px; color: #666;">${item.variantColor} / ${item.variantSize}</div>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace;">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
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
      <title>New Order | Admin</title>
      <style>${COMMON_CSS}</style>
    </head>
    <body style="background-color: #f4f4f4; padding: 20px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border: 1px solid #e0e0e0;">
        
        <div style="border-left: 4px solid ${BRAND_COLORS.green}; padding-left: 15px; margin-bottom: 30px;">
          <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">New Order Received</h2>
          <p style="margin: 5px 0 0; color: #666; font-family: monospace;">ID: ${notificationData.orderId}</p>
        </div>

        <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px; font-size: 13px;">
          <div style="margin-bottom: 10px;"><strong>Customer:</strong> ${notificationData.customerName}</div>
          <div style="margin-bottom: 10px;"><strong>Email:</strong> <a href="mailto:${notificationData.customerEmail}">${notificationData.customerEmail}</a></div>
          ${notificationData.phoneNumber ? `<div><strong>Phone:</strong> ${notificationData.phoneNumber}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
          <thead>
            <tr style="color: #999; text-transform: uppercase; font-size: 11px;">
              <th style="text-align: left; padding-bottom: 10px;">Product</th>
              <th style="text-align: center; padding-bottom: 10px;">Qty</th>
              <th style="text-align: right; padding-bottom: 10px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
             <tr>
               <td colspan="2" style="text-align: right; padding-top: 15px; font-weight: bold;">TOTAL:</td>
               <td style="text-align: right; padding-top: 15px; font-weight: bold; font-family: monospace; font-size: 14px; color: ${BRAND_COLORS.green};">
                 LKR ${notificationData.totalAmount.toFixed(2)}
               </td>
             </tr>
          </tfoot>
        </table>

        <div style="border-top: 1px solid #eee; padding-top: 20px;">
           <h3 style="font-size: 12px; text-transform: uppercase; color: #999;">Shipping Destination</h3>
           <p style="font-size: 13px; line-height: 1.5; color: #333;">
             ${notificationData.shippingAddress.line1}<br>
             ${notificationData.shippingAddress.city}, ${notificationData.shippingAddress.postalCode}<br>
             ${notificationData.shippingAddress.country}
           </p>
        </div>

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
  
  const statusConfig: Record<string, { desc: string, color: string }> = {
    PROCESSING: { desc: 'Your order is being prepared with care.', color: BRAND_COLORS.black },
    PACKED: { desc: 'Your items are packed and awaiting courier pickup.', color: BRAND_COLORS.black },
    SHIPPED: { desc: 'Your order is on the way.', color: BRAND_COLORS.green },
    DELIVERED: { desc: 'Your package has arrived.', color: BRAND_COLORS.black },
    CANCELLED: { desc: 'Order cancelled as requested.', color: BRAND_COLORS.red },
    REFUNDED: { desc: 'Refund processed successfully.', color: BRAND_COLORS.black }
  };

  const statusInfo = statusConfig[updateData.newStatus] || { desc: `Status updated to ${updateData.newStatus}`, color: BRAND_COLORS.black };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Status Update | CEASAR</title>
      <style>${COMMON_CSS}</style>
    </head>
    <body style="background-color: #ffffff; padding: 20px 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 0 20px;">
        
        ${EMAIL_HEADER}
        
        <div style="text-align: center; margin-bottom: 50px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${BRAND_COLORS.darkGray}; margin-bottom: 15px;">Status Update</div>
          
          <h1 style="font-size: 32px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 20px 0; color: ${statusInfo.color};">
            ${updateData.newStatus}
          </h1>
          
          <p style="font-size: 14px; color: ${BRAND_COLORS.black}; line-height: 1.6; margin: 0 auto; max-width: 400px;">
            ${statusInfo.desc}
          </p>
          
          <div style="margin-top: 25px;">
            <span style="font-family: 'Courier New', monospace; font-size: 13px; border: 1px solid #e5e5e5; padding: 6px 12px; border-radius: 4px;">Order #${updateData.orderId}</span>
          </div>
        </div>

        ${updateData.deliveryId ? `
        <!-- Tracking Module -->
        <div style="background-color: ${BRAND_COLORS.gray}; padding: 30px; text-align: center; margin-bottom: 40px;">
          <h3 style="margin: 0 0 15px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Tracking Information</h3>
          <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 600; letter-spacing: 1px; margin-bottom: 20px;">
            ${updateData.deliveryId}
          </div>
          <a href="https://koombiyodelivery.com" target="_blank" style="display: inline-block; background-color: ${BRAND_COLORS.black}; color: ${BRAND_COLORS.white}; padding: 12px 30px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
            Track Shipment
          </a>
        </div>
        ` : ''}

        <div style="text-align: center;">
          <a href="${updateData.profileUrl}" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${BRAND_COLORS.black}; border-bottom: 1px solid ${BRAND_COLORS.black}; padding-bottom: 2px;">
            View Order Details
          </a>
        </div>

        ${EMAIL_FOOTER}

      </div>
    </body>
    </html>
  `;
}