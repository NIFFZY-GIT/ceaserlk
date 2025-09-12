// Remove nodemailer import for now - add back when installing the package
// import nodemailer from 'nodemailer';

// Email configuration (ready for when nodemailer is installed)
// const EMAIL_CONFIG = {
//   host: process.env.SMTP_HOST || 'smtp.gmail.com',
//   port: parseInt(process.env.SMTP_PORT || '587'),
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// };

// Create reusable transporter object using SMTP transport
const transporter = {
  sendMail: async (options: { from: string; to: string; subject: string; html: string; text: string }) => {
    // Mock implementation for now - replace with actual nodemailer when package is installed
    console.log('Email would be sent:', options);
    return { messageId: 'mock-' + Date.now() };
  },
  verify: (callback: (error: Error | null) => void) => {
    callback(null);
  }
};

// Verify connection configuration
transporter.verify((error: Error | null) => {
  if (error) {
    console.error('Email transporter configuration error:', error);
  } else {
    console.log('Email server is ready to take our messages');
  }
});

// Email interface
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email function
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const mailOptions = {
      from: `"CEASER.LK" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Email templates
export const emailTemplates = {
  orderConfirmation: (orderData: {
    orderId: number;
    customerName: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: bold;">ORDER CONFIRMED</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order, ${orderData.customerName}!</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">Order #${orderData.orderId}</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #495057;">Order Summary</h3>
          ${orderData.items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
              <span>${item.name} × ${item.quantity}</span>
              <span>LKR ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #10b981;">
            <span>Total</span>
            <span style="color: #10b981;">LKR ${orderData.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/order-confirmation?orderId=${orderData.orderId}" 
             style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Order Details
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p>We'll send you another email once your order ships. If you have any questions, contact us at <a href="mailto:support@ceaser.lk" style="color: #10b981;">support@ceaser.lk</a></p>
          <p style="margin-top: 20px;">Thank you for choosing CEASER.LK!</p>
        </div>
      </div>
    </div>
  `,

  shippingNotification: (orderData: {
    orderId: number;
    customerName: string;
    trackingNumber?: string;
  }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: bold;">ORDER SHIPPED</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Your order is on its way, ${orderData.customerName}!</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">Order #${orderData.orderId} has been shipped</h2>
        
        ${orderData.trackingNumber ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin-top: 0; color: #495057;">Tracking Number</h3>
            <p style="font-size: 18px; font-weight: bold; color: #10b981; margin: 10px 0;">${orderData.trackingNumber}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/track-order" 
             style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
            Track Your Order
          </a>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/order-confirmation?orderId=${orderData.orderId}" 
             style="border: 2px solid #10b981; color: #10b981; padding: 10px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Order Details
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p>Your order should arrive within 3-7 business days. If you have any questions, contact us at <a href="mailto:support@ceaser.lk" style="color: #10b981;">support@ceaser.lk</a></p>
          <p style="margin-top: 20px;">Thank you for choosing CEASER.LK!</p>
        </div>
      </div>
    </div>
  `,

  passwordReset: (userData: {
    firstName: string;
    resetLink: string;
  }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: bold;">PASSWORD RESET</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Reset your CEASER.LK password</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">Hi ${userData.firstName},</h2>
        
        <p style="color: #495057; line-height: 1.6; margin-bottom: 20px;">
          You requested to reset your password for your CEASER.LK account. Click the button below to create a new password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${userData.resetLink}" 
             style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #10b981;">${userData.resetLink}</p>
          <p style="margin-top: 20px;">Need help? Contact us at <a href="mailto:support@ceaser.lk" style="color: #10b981;">support@ceaser.lk</a></p>
        </div>
      </div>
    </div>
  `
};

export default transporter;