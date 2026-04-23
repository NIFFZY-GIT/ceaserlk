import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';
import { buildKokoOrderCreateDataString, getKokoConfig, signKokoDataString } from '@/lib/koko';
import { ensureProductPaymentGateSchema, isPaymentMethodBlockedInCart } from '@/lib/payment-gates';

interface IncomingShippingDetails {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface RequestBody {
  cart?: { id?: string };
  shippingDetails?: IncomingShippingDetails;
  useFreeDelivery?: boolean;
  guestId?: string | null;
}

type NormalizedShippingDetails = Required<{
  [K in keyof IncomingShippingDetails]: string;
}>;

const normalizePhone = (phone: string) => {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('0')) return `94${trimmed.slice(1)}`;
  return trimmed;
};

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request);

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { cart, shippingDetails, useFreeDelivery, guestId } = body;

  if (!user && !guestId) {
    return NextResponse.json(
      { error: 'Guest session missing. Please start checkout again.' },
      { status: 401 }
    );
  }

  const cartId = cart?.id?.trim();
  if (!cartId) {
    return NextResponse.json({ error: 'A valid cart ID is required.' }, { status: 400 });
  }

  if (!shippingDetails || typeof shippingDetails !== 'object') {
    return NextResponse.json({ error: 'Shipping details are required.' }, { status: 400 });
  }

  const normalizedDetails: NormalizedShippingDetails = {
    email: (shippingDetails.email ?? '').trim(),
    firstName: (shippingDetails.firstName ?? '').trim(),
    lastName: (shippingDetails.lastName ?? '').trim(),
    phone: (shippingDetails.phone ?? '').trim(),
    address: (shippingDetails.address ?? '').trim(),
    city: (shippingDetails.city ?? '').trim(),
    postalCode: (shippingDetails.postalCode ?? '').trim(),
    country: ((shippingDetails.country ?? 'Sri Lanka').trim() || 'Sri Lanka'),
  };

  const missingField = (Object.entries(normalizedDetails) as Array<[keyof NormalizedShippingDetails, string]>).find(
    ([, value]) => value === ''
  );

  if (missingField) {
    const [fieldName] = missingField;
    return NextResponse.json(
      { error: `Please complete the ${fieldName} field before continuing.` },
      { status: 400 }
    );
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await ensureProductPaymentGateSchema(client);

    const kokoBlocked = await isPaymentMethodBlockedInCart(client, cartId, 'KOKO');
    if (kokoBlocked) {
      return NextResponse.json(
        { error: 'Koko payment is not available for one or more products in your cart.' },
        { status: 400 }
      );
    }

    const config = getKokoConfig();
    await ensureOrderNumberSchema(client);
    await client.query('BEGIN');
    transactionStarted = true;

    const cartCheck = await client.query(
      `SELECT id, expires_at FROM carts WHERE id = $1`,
      [cartId]
    );

    if (cartCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json(
        { error: 'Your cart session has expired or was not found.' },
        { status: 400 }
      );
    }

    const cartExpiresAt = new Date(cartCheck.rows[0].expires_at);
    if (cartExpiresAt < new Date()) {
      await client.query('DELETE FROM carts WHERE id = $1', [cartId]);
      await client.query('COMMIT');
      transactionStarted = false;
      return NextResponse.json(
        { error: 'Your cart session has expired. Please add items again.' },
        { status: 400 }
      );
    }

    const cartItemsResult = await client.query(
      `
        SELECT
          c.id as cart_id,
          ci.quantity,
          ci.sku_id,
          s.size,
          v.price AS variant_price,
          v.color_name,
          p.id AS product_id,
          p.name AS product_name,
          p.shipping_cost
        FROM carts c
        JOIN cart_items ci ON c.id = ci.cart_id
        JOIN stock_keeping_units s ON ci.sku_id = s.id
        JOIN product_variants v ON s.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE c.id = $1
      `,
      [cartId]
    );

    if (cartItemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json(
        { error: 'Your cart is empty. Please add items before checkout.' },
        { status: 400 }
      );
    }

    const subtotal = cartItemsResult.rows.reduce((total, item) => {
      return total + Number.parseFloat(item.variant_price) * item.quantity;
    }, 0);

    let shippingCost = 0;
    cartItemsResult.rows.forEach((item) => {
      const perItemShipping = item.shipping_cost ? Number.parseFloat(item.shipping_cost) : 0;
      shippingCost = Math.max(shippingCost, perItemShipping);
    });

    if (user && useFreeDelivery && shippingCost > 0) {
      const freeDeliveryCheck = await client.query(
        `SELECT has_free_delivery($1) as has_promo`,
        [user.userId.toString()]
      );

      if (freeDeliveryCheck.rows[0]?.has_promo) {
        shippingCost = 0;
      }
    }

    const totalAmount = subtotal + shippingCost;
    const fullName = `${normalizedDetails.firstName} ${normalizedDetails.lastName}`.trim();

    // Create a temporary payment intent instead of the order
    // Order will be created AFTER Koko confirms payment
    const intentResult = await client.query(
      `
        INSERT INTO orders (
          user_id,
          customer_email,
          full_name,
          phone_number,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_postal_code,
          shipping_country,
          subtotal,
          shipping_cost,
          total_amount,
          payment_intent_id,
          status,
          payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, 'PENDING', 'KOKO')
        RETURNING id, order_number
      `,
      [
        user ? user.userId.toString() : null,
        normalizedDetails.email,
        fullName,
        normalizedDetails.phone,
        normalizedDetails.address,
        null,
        normalizedDetails.city,
        normalizedDetails.postalCode,
        normalizedDetails.country,
        subtotal,
        shippingCost,
        totalAmount,
      ]
    );

    const intentId = intentResult.rows[0]?.id as string | undefined;
    const orderNumber = intentResult.rows[0]?.order_number as number | null | undefined;

    if (!intentId) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json({ error: 'Failed to initialize payment.' }, { status: 500 });
    }

    // Store order items linked to this intent
    for (const item of cartItemsResult.rows) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            variant_color,
            variant_size,
            price_paid,
            quantity,
            sku_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          intentId,
          item.product_id,
          item.product_name,
          item.color_name,
          item.size,
          Number.parseFloat(item.variant_price),
          item.quantity,
          item.sku_id,
        ]
      );
    }

    // Keep cart until payment is confirmed so failed/cancelled Koko attempts
    // do not leave the user with an empty cart.
    await client.query('COMMIT');
    transactionStarted = false;

    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const appUrl = rawAppUrl.replace(/\/+$/, '');
    const currency = 'LKR';
    const amount = totalAmount.toFixed(2);
    const publicOrderId = formatOrderNumber(orderNumber) || intentId;
    const reference = `${config.merchantId}${Math.floor(111 + Math.random() * 888)}-${publicOrderId}`;
    const description = 'Koko: Buy Now Pay Later';

    const returnUrl = `${appUrl}/api/checkout/koko/return`;
    const cancelUrl = `${appUrl}/checkout?payment_error=koko_failed`;
    const responseUrl = `${appUrl}/api/checkout/koko/response`;

    const dataString = buildKokoOrderCreateDataString({
      merchantId: config.merchantId,
      amount,
      currency,
      pluginName: config.pluginName,
      pluginVersion: config.pluginVersion,
      returnUrl,
      cancelUrl,
      orderId: intentId,
      reference,
      firstName: normalizedDetails.firstName,
      lastName: normalizedDetails.lastName,
      email: normalizedDetails.email,
      description,
      apiKey: config.apiKey,
      responseUrl,
    });

    const signature = signKokoDataString(dataString, config.privateKey);

    return NextResponse.json({
      success: true,
      orderId: intentId,
      publicOrderId,
      gatewayUrl: `${config.baseUrl}/api/merchants/orderCreate`,
      formFields: {
        _mId: config.merchantId,
        api_key: config.apiKey,
        _returnUrl: returnUrl,
        _cancelUrl: cancelUrl,
        _responseUrl: responseUrl,
        _currency: currency,
        _amount: amount,
        _reference: reference,
        _orderId: intentId,
        _pluginName: config.pluginName,
        _pluginVersion: config.pluginVersion,
        _description: description,
        _firstName: normalizedDetails.firstName,
        _lastName: normalizedDetails.lastName,
        _email: normalizedDetails.email,
        _mobileNo: normalizePhone(normalizedDetails.phone),
        dataString,
        signature,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Koko initiate rollback failed:', rollbackError);
      }
    }

    console.error('Koko initiate error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate Koko payment.';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
