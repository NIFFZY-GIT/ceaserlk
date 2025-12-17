import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail, generateOrderConfirmationEmail, generateAdminOrderNotificationEmail } from '@/lib/email';
import { generateInvoicePDF, generateInvoiceFilename, InvoiceData } from '@/lib/pdf-invoice';

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

type NormalizedShippingDetails = Required<{
  [K in keyof IncomingShippingDetails]: string;
}>;
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request);
    await ensureOrderNumberSchema(client);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required to place an order.' },
      { status: 401 }
    );
  }

  let body: { cartId?: unknown; shippingDetails?: IncomingShippingDetails };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload.' },
      { status: 400 }
    );
  }

  const { cartId, shippingDetails } = body;

  if (typeof cartId !== 'string' || cartId.trim() === '') {
    return NextResponse.json(
      { error: 'A valid cart ID is required to place an order.' },
      { status: 400 }
    );
  }

  if (!shippingDetails || typeof shippingDetails !== 'object') {
    return NextResponse.json(
      { error: 'Shipping details are required.' },
      { status: 400 }
    );
  }

  const normalizedDetails: NormalizedShippingDetails = {
    email: (shippingDetails.email ?? '').trim(),
    firstName: (shippingDetails.firstName ?? '').trim(),
    lastName: (shippingDetails.lastName ?? '').trim(),
    phone: (shippingDetails.phone ?? '').trim(),
      RETURNING id, order_number;
    city: (shippingDetails.city ?? '').trim(),
    postalCode: (shippingDetails.postalCode ?? '').trim(),
    country: ((shippingDetails.country ?? 'Sri Lanka').trim() || 'Sri Lanka'),
  };

  const missingField = (Object.entries(normalizedDetails) as Array<[keyof NormalizedShippingDetails, string]>)
    .find(([, value]) => value === '');

  if (missingField) {
    return NextResponse.json(
      { error: 'Please complete all required contact and delivery details before placing your order.' },
      { status: 400 }
    );
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const orderId = orderResult.rows[0]?.id;
    const orderNumber = orderResult.rows[0]?.order_number as number | null | undefined;
    const publicOrderId = formatOrderNumber(orderNumber) || orderId;
    const cartItemsResult = await client.query(`
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
    `, [cartId]);

    if (cartItemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Your cart is empty. Please add items before placing an order.' },
        { status: 400 }
      );
    }

    const subtotal = cartItemsResult.rows.reduce((total, item) => {
      return total + parseFloat(item.variant_price) * item.quantity;
    }, 0);

    const shippingCost = cartItemsResult.rows.reduce((total, item) => {
      const perItemShipping = item.shipping_cost ? parseFloat(item.shipping_cost) : 0;
      return total + perItemShipping * item.quantity;
    }, 0);

    const totalAmount = subtotal + shippingCost;
    const fullName = `${normalizedDetails.firstName} ${normalizedDetails.lastName}`.trim();

    const orderInsertQuery = `
      INSERT INTO orders (
        user_id,
        customer_email,
        full_name,
        orderId: publicOrderId,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        subtotal,
        shipping_cost,
        total_amount,
        payment_intent_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13)
      RETURNING id;
    `;

    const orderResult = await client.query(orderInsertQuery, [
      user.userId ? user.userId.toString() : null,
      normalizedDetails.email,
      const filename = generateInvoiceFilename(publicOrderId);
      normalizedDetails.phone,
      normalizedDetails.address,
        orderId: publicOrderId,
      normalizedDetails.city,
      normalizedDetails.postalCode,
      normalizedDetails.country,
      subtotal,
      shippingCost,
      totalAmount,
      'PENDING',
    ]);

    const orderId = orderResult.rows[0]?.id;
    if (!orderId) {
      throw new Error('Failed to create order record.');
    }

    const orderItemInsertQuery = `
      INSERT INTO order_items (
        subject: `Order Confirmation #${publicOrderId} | Ceaser LK`,
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
        parseFloat(item.variant_price),
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
      pricePaid: parseFloat(item.variant_price),
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
      };

      const pdfBuffer = generateInvoicePDF(invoiceData);
            subject: `New Order #${publicOrderId} | Ceaser LK`,

      const emailHtml = generateOrderConfirmationEmail({
        orderId,
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
      });

      await sendEmail({
        to: normalizedDetails.email,
        subject: `Order Confirmation - ${orderId} | Ceaser LK`,
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
            orderId,
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
          });

          await sendEmail({
            to: adminEmails.join(','),
            subject: `New COD Order Placed - ${orderId}`,
            html: adminEmailHtml,
          });
        }
      } catch (adminEmailError) {
        console.error('Failed to send admin notification email:', adminEmailError);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed after pay on delivery error:', rollbackError);
    }
    console.error('Pay on delivery order error:', error);
    return NextResponse.json(
      { error: 'Failed to place order. Please try again.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
