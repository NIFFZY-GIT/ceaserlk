import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';
import {
  getMintPayConfig,
  createMintPayOrder,
  formatMintPayDate,
  MintPayProduct,
} from '@/lib/mintpay';

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
    const config = getMintPayConfig();
    await ensureOrderNumberSchema(client);
    await client.query('BEGIN');
    transactionStarted = true;

    // Validate cart
    const cartCheck = await client.query(
      `SELECT id, expires_at, created_at FROM carts WHERE id = $1`,
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

    const cartRow = cartCheck.rows[0];
    const cartExpiresAt = new Date(cartRow.expires_at);
    if (cartExpiresAt < new Date()) {
      await client.query('DELETE FROM carts WHERE id = $1', [cartId]);
      await client.query('COMMIT');
      transactionStarted = false;
      return NextResponse.json(
        { error: 'Your cart session has expired. Please add items again.' },
        { status: 400 }
      );
    }

    // Fetch cart items
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
          p.shipping_cost,
          p.created_at AS product_created_at,
          p.updated_at AS product_updated_at
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

    // Calculate totals
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

    // Create a PENDING order (same as Koko flow)
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, 'PENDING', 'MINTPAY')
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

    // Store order items
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

    // Keep cart until payment is confirmed
    await client.query('COMMIT');
    transactionStarted = false;

    // Build MintPay order payload
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const appUrl = rawAppUrl.replace(/\/+$/, '');

    const now = new Date();
    const cartCreatedDate = cartRow.created_at
      ? formatMintPayDate(new Date(cartRow.created_at))
      : formatMintPayDate(now);
    const cartUpdatedDate = cartCreatedDate;

    // Get customer IP from request headers
    const forwarded = request.headers.get('x-forwarded-for') || '';
    const realIp = request.headers.get('x-real-ip') || '';
    const ip = realIp || forwarded.split(',')[0]?.trim() || '127.0.0.1';

    const products: MintPayProduct[] = cartItemsResult.rows.map((item) => ({
      name: item.product_name,
      product_id: String(item.product_id),
      sku: `${item.size || ''}/${item.color_name || ''}`.replace(/^\/|\/$/g, '') || 'default',
      quantity: String(item.quantity),
      unit_price: Number.parseFloat(item.variant_price).toFixed(2),
      discount: '0.00',
      created_date: item.product_created_at
        ? formatMintPayDate(new Date(item.product_created_at))
        : formatMintPayDate(now),
      updated_date: item.product_updated_at
        ? formatMintPayDate(new Date(item.product_updated_at))
        : formatMintPayDate(now),
    }));

    // MintPay expects short numeric order_id (not UUID)
    const mintPayOrderId = orderNumber ? String(orderNumber) : String(Date.now()).slice(-8);

    const successUrl = `${appUrl}/api/checkout/mintpay/return?status=success&orderId=${intentId}`;
    const failUrl = `${appUrl}/api/checkout/mintpay/return?status=fail&orderId=${intentId}`;

    const mintPayResponse = await createMintPayOrder(config, {
      merchant_id: config.merchantId,
      order_id: mintPayOrderId,
      total_price: totalAmount.toFixed(2),
      discount: '0.00',
      customer_email: normalizedDetails.email,
      customer_id: user ? String(user.userId).slice(0, 10) : '0',
      customer_telephone: normalizedDetails.phone,
      ip,
      x_forwarded_for: forwarded || ip,
      delivery_street: normalizedDetails.address,
      delivery_region: normalizedDetails.city,
      delivery_postcode: normalizedDetails.postalCode || '00000',
      cart_created_date: cartCreatedDate,
      cart_updated_date: cartUpdatedDate,
      success_url: successUrl,
      fail_url: failUrl,
      products,
    });

    if (mintPayResponse.message !== 'Success') {
      console.error('[MINTPAY INITIATE] MintPay API returned failure:', mintPayResponse);
      return NextResponse.json(
        { error: `MintPay rejected the order: ${mintPayResponse.data}` },
        { status: 400 }
      );
    }

    const purchaseId = mintPayResponse.data;

    // Store the MintPay purchase_id on the order for later verification
    await db.query(
      `UPDATE orders SET payment_intent_id = $1 WHERE id = $2`,
      [purchaseId, intentId]
    );

    const publicOrderId = formatOrderNumber(orderNumber) || intentId;

    return NextResponse.json({
      success: true,
      orderId: intentId,
      publicOrderId,
      purchaseId,
      gatewayUrl: config.gatewayUrl,
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('MintPay initiate rollback failed:', rollbackError);
      }
    }

    console.error('MintPay initiate error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate MintPay payment.';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
