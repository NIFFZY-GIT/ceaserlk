import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateAdminOrderNotificationEmail, generateOrderConfirmationEmail, sendEmail } from '@/lib/email';
import { generateInvoicePDF, generateInvoiceFilename, InvoiceData } from '@/lib/pdf-invoice';
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';

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
  cartId?: unknown;
  shippingDetails?: IncomingShippingDetails;
  useFreeDelivery?: boolean;
  paymentMethod?: unknown;
}

type NormalizedShippingDetails = Required<{
  [K in keyof IncomingShippingDetails]: string;
}>;

export async function POST(request: NextRequest) {
  // Allow both authenticated users and guests to place orders
  const user = await verifyAuth(request);

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { cartId, shippingDetails, useFreeDelivery, paymentMethod } = body;

  const normalizedPaymentMethod =
    typeof paymentMethod === 'string' && paymentMethod.trim() !== ''
      ? paymentMethod.trim().toUpperCase()
      : 'COD';

  if (!['COD', 'KOKO'].includes(normalizedPaymentMethod)) {
    return NextResponse.json(
      { error: 'Unsupported payment method for this checkout flow.' },
      { status: 400 }
    );
  }
  
  // Validate cartId
  if (typeof cartId !== 'string' || cartId.trim() === '') {
    console.error('Invalid cartId received:', { cartId, type: typeof cartId });
    return NextResponse.json({ error: 'A valid cart ID is required to place an order.' }, { status: 400 });
  }

  // Validate shippingDetails object
  if (!shippingDetails || typeof shippingDetails !== 'object') {
    console.error('Invalid shippingDetails received:', { shippingDetails, type: typeof shippingDetails });
    return NextResponse.json({ error: 'Shipping details are required.' }, { status: 400 });
  }

  // Normalize and validate shipping details
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

  // Check for missing required fields
  const missingField = (Object.entries(normalizedDetails) as Array<[keyof NormalizedShippingDetails, string]>).find(
    ([, value]) => value === ''
  );
  
  if (missingField) {
    const [fieldName] = missingField;
    console.error('Missing required shipping field:', fieldName);
    return NextResponse.json(
      { error: `Please complete the ${fieldName} field before placing your order.` },
      { status: 400 }
    );
  }

  const client = await db.connect();
  try {
    await ensureOrderNumberSchema(client);
    await client.query('BEGIN');

    // First check if cart exists and hasn't expired
    const cartCheck = await client.query(
      `SELECT id, expires_at FROM carts WHERE id = $1`,
      [cartId]
    );

    if (cartCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('Cart not found:', cartId);
      return NextResponse.json(
        { error: 'Your cart session has expired or was not found. Please add items to your cart again.' },
        { status: 400 }
      );
    }

    const cartExpiresAt = new Date(cartCheck.rows[0].expires_at);
    if (cartExpiresAt < new Date()) {
      // Cart has expired - clean it up
      await client.query('DELETE FROM carts WHERE id = $1', [cartId]);
      await client.query('COMMIT');
      console.error('Cart expired:', { cartId, expiresAt: cartExpiresAt });
      return NextResponse.json(
        { error: 'Your cart session has expired. Please add items to your cart again and try checking out.' },
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
          s.stock_quantity,
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
      console.error('Cart items not found:', cartId);
      return NextResponse.json(
        { error: 'Your cart is empty. Please add items before placing an order.' },
        { status: 400 }
      );
    }

    // Note: Stock was already reserved/decremented when items were added to cart.
    // No need to check stock again here - if items are in cart, stock is already allocated.

    const subtotal = cartItemsResult.rows.reduce((total, item) => {
      return total + Number.parseFloat(item.variant_price) * item.quantity;
    }, 0);

    // Shipping is charged once per order at the highest product shipping cost
    let shippingCost = 0;
    cartItemsResult.rows.forEach((item) => {
      const perItemShipping = item.shipping_cost ? Number.parseFloat(item.shipping_cost) : 0;
      shippingCost = Math.max(shippingCost, perItemShipping);
    });

    // Check if user wants to use free delivery promo (only for authenticated users)
    let freeDeliveryApplied = false;
    if (user && useFreeDelivery && shippingCost > 0) {
      // Check if user has free delivery available
      const freeDeliveryCheck = await client.query(
        `SELECT has_free_delivery($1) as has_promo`,
        [user.userId.toString()]
      );
      
      if (freeDeliveryCheck.rows[0]?.has_promo) {
        freeDeliveryApplied = true;
        shippingCost = 0;
      }
    }

    const totalAmount = subtotal + shippingCost;
    const fullName = `${normalizedDetails.firstName} ${normalizedDetails.lastName}`.trim();

    const orderInsertQuery = `
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, $14)
      RETURNING id, order_number;
    `;

    const orderResult = await client.query(orderInsertQuery, [
      user ? user.userId.toString() : null, // NULL for guest orders
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
      'PENDING',
      normalizedPaymentMethod,
    ]);

    const orderId = orderResult.rows[0]?.id as string | undefined;
    const orderNumber = orderResult.rows[0]?.order_number as number | null | undefined;
    
    if (!orderId) {
      await client.query('ROLLBACK');
      console.error('Order creation failed - no ID returned');
      throw new Error('Failed to create order record - no ID returned.');
    }

    // Mark free delivery promo as used if applied (only for authenticated users)
    if (user && freeDeliveryApplied) {
      try {
        await client.query(
          `SELECT use_free_delivery($1, $2)`,
          [user.userId.toString(), orderId]
        );
      } catch (promoErr) {
        console.error('Error marking free delivery as used:', promoErr);
        // Don't fail the order if promo marking fails
      }
    }

    const publicOrderId = formatOrderNumber(orderNumber) || orderId;

    const orderItemInsertQuery = `
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
    `;

    for (const item of cartItemsResult.rows) {
      await client.query(orderItemInsertQuery, [
        orderId,
        item.product_id,
        item.product_name,
        item.color_name,
        item.size,
        Number.parseFloat(item.variant_price),
        item.quantity,
        item.sku_id,
      ]);
    }

    await client.query('DELETE FROM carts WHERE id = $1', [cartId]);
    await client.query('COMMIT');

    const itemsForSummary = cartItemsResult.rows.map((item) => ({
      productName: item.product_name as string,
      variantColor: item.color_name as string,
      variantSize: item.size as string,
      quantity: item.quantity as number,
      pricePaid: Number.parseFloat(item.variant_price),
    }));

    try {
      const invoiceData: InvoiceData = {
        orderId: publicOrderId,
        orderDate: new Date(),
        customerName: fullName,
        customerEmail: normalizedDetails.email,
        phoneNumber: normalizedDetails.phone,
        shippingAddress: {
          line1: normalizedDetails.address,
          city: normalizedDetails.city,
          postalCode: normalizedDetails.postalCode,
          country: normalizedDetails.country,
        },
        items: itemsForSummary,
        subtotal,
        shippingCost,
        totalAmount,
        paymentMethod: normalizedPaymentMethod,
      };

      const pdfBuffer = generateInvoicePDF(invoiceData);
      const filename = generateInvoiceFilename(publicOrderId);

      const emailHtml = generateOrderConfirmationEmail({
        orderId: publicOrderId,
        customerName: fullName,
        customerEmail: normalizedDetails.email,
        items: itemsForSummary,
        subtotal,
        shippingCost,
        totalAmount,
        shippingAddress: {
          line1: normalizedDetails.address,
          city: normalizedDetails.city,
          postalCode: normalizedDetails.postalCode,
          country: normalizedDetails.country,
        },
        paymentMethod: normalizedPaymentMethod,
      });

      await sendEmail({
        to: normalizedDetails.email,
        subject: `Order Confirmation #${publicOrderId} | CEASAR`,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      try {
        const adminEmailSet = new Set<string>();

        if (process.env.ADMIN_NOTIFICATION_EMAILS) {
          process.env.ADMIN_NOTIFICATION_EMAILS
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean)
            .forEach((email) => adminEmailSet.add(email));
        }

        try {
          const adminQuery = await client.query(
            `SELECT email FROM users WHERE role = 'ADMIN' AND email IS NOT NULL`
          );
          adminQuery.rows
            .map((row) => row.email as string)
            .filter(Boolean)
            .forEach((email) => adminEmailSet.add(email));
        } catch (adminLookupError) {
          console.error('Failed to fetch admin email addresses from database:', adminLookupError);
        }

        const adminEmails = Array.from(adminEmailSet);
        if (adminEmails.length > 0) {
          const adminEmailHtml = generateAdminOrderNotificationEmail({
            orderId: publicOrderId,
            customerName: fullName,
            customerEmail: normalizedDetails.email,
            phoneNumber: normalizedDetails.phone,
            items: itemsForSummary,
            subtotal,
            shippingCost,
            totalAmount,
            shippingAddress: {
              line1: normalizedDetails.address,
              city: normalizedDetails.city,
              postalCode: normalizedDetails.postalCode,
              country: normalizedDetails.country,
            },
            paymentMethod: normalizedPaymentMethod,
          });

          const adminPaymentLabel = normalizedPaymentMethod === 'KOKO'
            ? 'Koko Buy Now Pay Later'
            : 'Cash on Delivery';

          await sendEmail({
            to: adminEmails.join(','),
            subject: `New Order #${publicOrderId} - ${adminPaymentLabel}`,
            html: adminEmailHtml,
          });
        }
      } catch (adminEmailError) {
        console.error('Failed to send admin notification email:', adminEmailError);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the order if email fails - it's already created
    }

    // Ensure we always return orderId for successful orders
    console.log('Deferred payment order created successfully:', {
      orderId,
      orderNumber,
      status: 'PENDING',
      paymentMethod: normalizedPaymentMethod,
    });
    return NextResponse.json({ 
      success: true, 
      orderId,
      message: 'Order placed successfully. Check your email for confirmation.'
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed after place-order error:', rollbackError);
    }

    console.error('Place order error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to place order. Please try again.';
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
