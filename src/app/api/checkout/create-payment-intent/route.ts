import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to create payment intent.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, cart, shippingDetails } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount provided.' },
        { status: 400 }
      );
    }

    // Convert amount to cents (Stripe expects amounts in the smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create a PaymentIntent with Stripe, storing only essential data in metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'lkr', // Sri Lankan Rupee
      metadata: {
        userId: user.userId.toString(),
        userEmail: user.email,
        // Store only essential order data due to 500 char limit per field
        cart_id: cart.id || '',
        subtotal: cart.subtotal.toString(),
        shipping_cost: cart.totalShipping.toString(),
        total_amount: cart.totalAmount.toString(),
        // Shipping details (keep essential only)
        customer_email: shippingDetails.email,
        customer_name: `${shippingDetails.firstName} ${shippingDetails.lastName}`.substring(0, 100),
        shipping_address: shippingDetails.address.substring(0, 100),
        shipping_city: shippingDetails.city,
        shipping_postal: shippingDetails.postalCode,
        phone: shippingDetails.phone,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent. Please try again.' },
      { status: 500 }
    );
  }
}