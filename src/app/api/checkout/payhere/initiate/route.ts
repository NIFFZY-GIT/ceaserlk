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
    const body = await request.json();
    const { cart, shippingDetails, useFreeDelivery, guestId } = body;

    // Verify user authentication (optional for guests)
    const user = await verifyAuth(request);
    if (!user && !guestId) {
      return NextResponse.json(
        { error: 'Guest session missing. Please start guest checkout again.' },
        { status: 401 }
      );
    }

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
    
    // Check if user wants to use free delivery promo
    let actualShipping = parseFloat(cart.totalShipping || 0);
    let freeDeliveryApplied = false;
    
    if (useFreeDelivery && actualShipping > 0) {
      // Check if user has free delivery available
      if (user) {
        const client = await db.connect();
        try {
          const freeDeliveryCheck = await client.query(
            `SELECT has_free_delivery($1) as has_promo`,
            [user.userId.toString()]
          );
          
          if (freeDeliveryCheck.rows[0]?.has_promo) {
            freeDeliveryApplied = true;
            actualShipping = 0;
          }
        } finally {
          client.release();
        }
      }
    }
    
    // Calculate actual total with promo
    const actualTotal = parseFloat(cart.subtotal || 0) + actualShipping;
    
    // Format amount to 2 decimal places
    const amount = actualTotal.toFixed(2);
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
    const client2 = await db.connect();
    const userIdValue = user ? user.userId.toString() : `guest:${guestId}`;
    try {
      await client2.query(`
        INSERT INTO pending_payhere_orders (
          order_id, user_id, cart_id, amount, currency,
          customer_email, customer_name, phone,
          shipping_address, shipping_city, shipping_postal_code,
          subtotal, shipping_cost, hash, created_at, free_delivery_applied
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
        ON CONFLICT (order_id) DO UPDATE SET
          amount = EXCLUDED.amount,
          hash = EXCLUDED.hash,
          free_delivery_applied = EXCLUDED.free_delivery_applied,
          created_at = NOW()
      `, [
        orderId,
        userIdValue,
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
        actualShipping.toFixed(2),
        hash,
        freeDeliveryApplied
      ]);
    } catch (dbError) {
      console.error('PayHere DB insert error:', dbError);
      throw dbError;
    } finally {
      client2.release();
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
