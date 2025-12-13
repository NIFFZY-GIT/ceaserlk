import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';

// PayHere configuration
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;
const PAYHERE_SANDBOX = process.env.PAYHERE_SANDBOX === 'true';

// Generate PayHere hash for security
function generatePayHereHash(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string
): string {
  // PayHere hash format: merchant_id + order_id + amount + currency + MD5(merchant_secret)
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const hashString = merchantId + orderId + amount + currency + hashedSecret;
  return crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to initiate payment.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cart, shippingDetails } = body;

    // Validate required fields
    if (!cart || !cart.id || !shippingDetails) {
      return NextResponse.json(
        { error: 'Cart and shipping details are required.' },
        { status: 400 }
      );
    }

    // Validate shipping details
    const requiredFields = ['email', 'firstName', 'lastName', 'phone', 'address', 'city'];
    for (const field of requiredFields) {
      if (!shippingDetails[field]?.trim()) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate unique order ID for PayHere
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Format amount to 2 decimal places
    const amount = parseFloat(cart.totalAmount).toFixed(2);
    const currency = 'LKR';

    // Generate hash for PayHere
    const hash = generatePayHereHash(
      PAYHERE_MERCHANT_ID,
      orderId,
      amount,
      currency,
      PAYHERE_MERCHANT_SECRET
    );

    // Store pending order in database for verification later
    const client = await db.connect();
    try {
      await client.query(`
        INSERT INTO pending_payhere_orders (
          order_id, user_id, cart_id, amount, currency,
          customer_email, customer_name, phone,
          shipping_address, shipping_city, shipping_postal_code,
          subtotal, shipping_cost, hash, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (order_id) DO UPDATE SET
          amount = EXCLUDED.amount,
          hash = EXCLUDED.hash,
          created_at = NOW()
      `, [
        orderId,
        user.userId,
        cart.id.toString(),
        amount,
        currency,
        shippingDetails.email,
        `${shippingDetails.firstName} ${shippingDetails.lastName}`,
        shippingDetails.phone,
        shippingDetails.address,
        shippingDetails.city,
        shippingDetails.postalCode || '',
        parseFloat(cart.subtotal || 0).toFixed(2),
        parseFloat(cart.totalShipping || 0).toFixed(2),
        hash
      ]);
    } catch (dbError) {
      console.error('PayHere DB insert error:', dbError);
      throw dbError;
    } finally {
      client.release();
    }

    // Build PayHere checkout URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const payhereBaseUrl = PAYHERE_SANDBOX 
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';

    // Return payment data for client-side redirect
    return NextResponse.json({
      success: true,
      paymentData: {
        sandbox: PAYHERE_SANDBOX,
        merchant_id: PAYHERE_MERCHANT_ID,
        return_url: `${appUrl}/order-confirmation?payhere_order=${orderId}`,
        cancel_url: `${appUrl}/checkout?cancelled=true`,
        notify_url: `${appUrl}/api/checkout/payhere/notify`,
        order_id: orderId,
        items: `Order ${orderId}`,
        currency: currency,
        amount: amount,
        first_name: shippingDetails.firstName,
        last_name: shippingDetails.lastName,
        email: shippingDetails.email,
        phone: shippingDetails.phone.replace(/^0/, '+94'),
        address: shippingDetails.address,
        city: shippingDetails.city,
        country: 'Sri Lanka',
        hash: hash,
      },
      checkoutUrl: payhereBaseUrl,
    });

  } catch (error) {
    console.error('PayHere initiate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to initiate payment: ${errorMessage}` },
      { status: 500 }
    );
  }
}
