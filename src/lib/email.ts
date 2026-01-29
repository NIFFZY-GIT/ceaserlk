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
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 0;">
        <img src="https://www.inceasar.com/assets/mailheader.png" alt="CEASAR" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
      </td>
    </tr>
  </table>
`;

const EMAIL_FOOTER = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 40px; border-top: 1px solid ${BRAND_COLORS.border};">
    <tr>
      <td align="center" style="padding: 30px 20px;">
        <p style="font-size: 11px; color: ${BRAND_COLORS.darkGray}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;">
          <a href="https://www.inceasar.com" style="color: ${BRAND_COLORS.black}; font-weight: bold; text-decoration: none;">InCeasar.com</a>
        </p>
        
        <!-- Tri-Color Flag Accent -->
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td width="10" height="3" style="background-color: ${BRAND_COLORS.green};"></td>
            <td width="10" height="3" style="background-color: ${BRAND_COLORS.white}; border-top: 1px solid #eee; border-bottom: 1px solid #eee;"></td>
            <td width="10" height="3" style="background-color: ${BRAND_COLORS.red};"></td>
          </tr>
        </table>
        
        <p style="font-size: 10px; color: #999; margin: 20px 0 0 0; line-height: 1.6;">
          Need assistance? <a href="mailto:contactus@inceasar.com" style="color: ${BRAND_COLORS.black}; text-decoration: underline;">Contact Support</a><br>
          &copy; ${new Date().getFullYear()} CEASAR. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
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
      <td style="padding: 15px 0; border-bottom: 1px solid #e5e5e5;" valign="top">
        <span style="font-weight: 600; font-size: 14px; color: #000000;">${item.productName}</span><br>
        <span style="font-size: 12px; color: #888888; text-transform: uppercase;">${item.variantColor} | Size: ${item.variantSize}</span>
      </td>
      <td align="center" style="padding: 15px 0; border-bottom: 1px solid #e5e5e5; font-family: 'Courier New', Courier, monospace; font-size: 14px;" valign="top">${item.quantity}</td>
      <td align="right" style="padding: 15px 0; border-bottom: 1px solid #e5e5e5; font-family: 'Courier New', Courier, monospace; font-size: 14px;" valign="top">LKR ${(item.pricePaid * item.quantity).toFixed(2)}</td>
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
              
              <!-- Order Confirmed Title -->
              <tr>
                <td align="center" style="padding: 40px 30px 30px 30px;">
                  <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 15px 0; color: #000000;">Order Confirmed</h1>
                  <p style="font-size: 14px; color: #888888; line-height: 1.6; margin: 0;">
                    Thank you, ${orderData.customerName}. Your order has been received and is being processed.
                  </p>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                    <tr>
                      <td style="background-color: #f5f5f5; padding: 10px 20px; font-family: 'Courier New', Courier, monospace; font-size: 14px;">
                        ORDER ID: #${orderData.orderId}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Order Items -->
              <tr>
                <td style="padding: 0 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <th align="left" style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888; border-bottom: 2px solid #000000; padding: 0 0 12px 0;">Item</th>
                      <th align="center" width="50" style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888; border-bottom: 2px solid #000000; padding: 0 0 12px 0;">Qty</th>
                      <th align="right" width="100" style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888; border-bottom: 2px solid #000000; padding: 0 0 12px 0;">Total</th>
                    </tr>
                    ${itemsHtml}
                  </table>
                </td>
              </tr>
              
              <!-- Totals -->
              <tr>
                <td style="padding: 30px 30px 40px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="50%"></td>
                      <td width="50%">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding: 8px 0; color: #888888; font-size: 13px;">Subtotal</td>
                            <td align="right" style="padding: 8px 0; font-family: 'Courier New', Courier, monospace; font-size: 13px;">LKR ${orderData.subtotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #888888; font-size: 13px;">Shipping</td>
                            <td align="right" style="padding: 8px 0; font-family: 'Courier New', Courier, monospace; font-size: 13px;">LKR ${orderData.shippingCost.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 16px 0 0 0; font-weight: 600; font-size: 13px; text-transform: uppercase; border-top: 1px solid #000000;">Total</td>
                            <td align="right" style="padding: 16px 0 0 0; font-weight: 600; font-family: 'Courier New', Courier, monospace; font-size: 14px; border-top: 1px solid #000000;">LKR ${orderData.totalAmount.toFixed(2)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Shipping & Payment Details -->
              <tr>
                <td style="padding: 0 30px 40px 30px; border-top: 1px solid #e5e5e5;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top: 30px;">
                    <tr>
                      <td width="50%" valign="top" style="padding-right: 15px;">
                        <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0; color: #000000;">Shipping Address</h3>
                        <p style="font-size: 13px; line-height: 1.8; color: #888888; margin: 0;">
                          <span style="color: #000000;">${orderData.shippingAddress.line1}</span><br>
                          ${orderData.shippingAddress.city}<br>
                          ${orderData.shippingAddress.postalCode}, ${orderData.shippingAddress.country}
                        </p>
                      </td>
                      <td width="50%" valign="top" style="padding-left: 15px;">
                        <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0; color: #000000;">Payment</h3>
                        <p style="font-size: 13px; line-height: 1.8; color: #888888; margin: 0;">
                          Method: <span style="color: #000000; text-transform: uppercase;">${orderData.paymentMethod || 'N/A'}</span><br>
                          Status: <span style="color: #000000;">${orderData.paymentMethod === 'COD' ? 'Pending' : 'Paid'}</span>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; border-top: 1px solid #e5e5e5; background-color: #fafafa;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <p style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">
                          <a href="https://www.inceasar.com" style="color: #000000; font-weight: bold; text-decoration: none;">InCeasar.com</a>
                        </p>
                        <!-- Tri-Color Flag -->
                        <table cellpadding="0" cellspacing="0" border="0" align="center">
                          <tr>
                            <td width="10" height="3" style="background-color: #107D3F;"></td>
                            <td width="10" height="3" style="background-color: #ffffff; border-top: 1px solid #eee; border-bottom: 1px solid #eee;"></td>
                            <td width="10" height="3" style="background-color: #EF3D4C;"></td>
                          </tr>
                        </table>
                        <p style="font-size: 10px; color: #999999; margin: 15px 0 0 0; line-height: 1.6;">
                          Need assistance? <a href="mailto:contactus@inceasar.com" style="color: #000000; text-decoration: underline;">Contact Support</a><br>
                          &copy; ${new Date().getFullYear()} CEASAR. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
            </table>
            <!-- End main content table -->
            
          </td>
        </tr>
      </table>
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