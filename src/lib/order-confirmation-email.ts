import type { PoolClient } from 'pg';
import { sendEmail, generateOrderConfirmationEmail, generateAdminOrderNotificationEmail } from '@/lib/email';
import { generateInvoicePDF, generateInvoiceFilename, InvoiceData } from '@/lib/pdf-invoice';
import { formatOrderNumber } from '@/lib/order-number';
import { sendTikTokServerEvent } from '@/lib/tiktok-events';

export async function ensureOrderEmailSchema(client: PoolClient) {
  await client.query(
    `ALTER TABLE orders
     ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ`
  );
}

export async function sendOrderConfirmationIfNeeded(client: PoolClient, orderId: string) {
  await ensureOrderEmailSchema(client);

  const orderResult = await client.query(
    `SELECT
      id,
      order_number,
      customer_email,
      full_name,
      phone_number,
      shipping_address_line1,
      shipping_city,
      shipping_postal_code,
      shipping_country,
      subtotal,
      shipping_cost,
      total_amount,
      payment_method,
      status,
      created_at,
      confirmation_email_sent_at
     FROM orders
     WHERE id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return { sent: false, reason: 'order_not_found' as const };
  }

  const order = orderResult.rows[0];
  const normalizedOrderStatus = String(order.status || '').toUpperCase();
  if (['PAID', 'COMPLETED'].includes(normalizedOrderStatus)) {
    const purchaseItemsResult = await client.query(
      `SELECT product_id, product_name, quantity, price_paid
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );
    const purchaseContents = purchaseItemsResult.rows.map((item) => ({
      content_id: String(item.product_id),
      content_type: 'product',
      content_name: item.product_name,
      quantity: Number(item.quantity),
      price: Number(item.price_paid),
    }));
    const eventUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/order-confirmation?orderId=${encodeURIComponent(orderId)}`
      : undefined;

    await sendTikTokServerEvent(
      'CompletePayment',
      `purchase-${orderId}`,
      {
        order_id: orderId,
        content_id: purchaseContents[0]?.content_id,
        content_name: purchaseContents[0]?.content_name,
        content_type: 'product',
        contents: purchaseContents,
        value: Number(order.total_amount),
        currency: 'LKR',
      },
      {
        url: eventUrl,
        email: order.customer_email,
        phone: order.phone_number,
      }
    );
  }

  const publicOrderId = formatOrderNumber(order.order_number) || order.id;
  const normalizedPaymentMethod = (order.payment_method || '').trim().toUpperCase();
  const paymentMethodLabel = (() => {
    if (['COD', 'CASH', 'CASH_ON_DELIVERY'].includes(normalizedPaymentMethod)) return 'Cash on Delivery';
    if (normalizedPaymentMethod === 'KOKO') return 'Koko Buy Now Pay Later';
    if (normalizedPaymentMethod === 'PAYHERE') return 'PayHere';
    if (normalizedPaymentMethod === 'CARD') return 'Card';
    if (normalizedPaymentMethod === 'PAID') return 'Paid';
    if (!normalizedPaymentMethod) return 'Unknown';
    return normalizedPaymentMethod.replace(/_/g, ' ');
  })();
  const invoicePaymentMethod = ['COD', 'CASH', 'CASH_ON_DELIVERY'].includes(normalizedPaymentMethod)
    ? 'COD'
    : normalizedPaymentMethod === 'KOKO'
      ? 'KOKO'
      : 'CARD';

  if (order.confirmation_email_sent_at) {
    return { sent: false, reason: 'already_sent' as const, publicOrderId };
  }

  const itemsResult = await client.query(
    `SELECT product_name, variant_color, variant_size, quantity, price_paid
     FROM order_items
     WHERE order_id = $1`,
    [orderId]
  );

  const items = itemsResult.rows.map((item) => ({
    productName: item.product_name,
    variantColor: item.variant_color,
    variantSize: item.variant_size,
    quantity: item.quantity,
    pricePaid: parseFloat(item.price_paid)
  }));

  const shippingAddressObj = {
    line1: order.shipping_address_line1 || '',
    city: order.shipping_city || '',
    postalCode: order.shipping_postal_code || '',
    country: order.shipping_country || 'Sri Lanka'
  };

  const invoiceData: InvoiceData = {
    orderId: publicOrderId,
    orderDate: order.created_at ? new Date(order.created_at) : new Date(),
    customerName: order.full_name,
    customerEmail: order.customer_email,
    phoneNumber: order.phone_number,
    shippingAddress: shippingAddressObj,
    items,
    subtotal: parseFloat(order.subtotal),
    shippingCost: parseFloat(order.shipping_cost),
    totalAmount: parseFloat(order.total_amount),
    paymentMethod: invoicePaymentMethod
  };

  const pdfBuffer = await generateInvoicePDF(invoiceData);
  const pdfFilename = generateInvoiceFilename(publicOrderId);

  const customerEmailContent = generateOrderConfirmationEmail({
    orderId: publicOrderId,
    customerName: order.full_name,
    customerEmail: order.customer_email,
    items,
    subtotal: parseFloat(order.subtotal),
    shippingCost: parseFloat(order.shipping_cost),
    totalAmount: parseFloat(order.total_amount),
    shippingAddress: shippingAddressObj,
    paymentMethod: invoicePaymentMethod
  });

  await sendEmail({
    to: order.customer_email,
    subject: `Order Confirmation #${publicOrderId} - CEASAR`,
    html: customerEmailContent,
    attachments: [{
      filename: pdfFilename,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });

  const adminEmailContent = generateAdminOrderNotificationEmail({
    orderId: publicOrderId,
    customerName: order.full_name,
    customerEmail: order.customer_email,
    items,
    subtotal: parseFloat(order.subtotal),
    shippingCost: parseFloat(order.shipping_cost),
    totalAmount: parseFloat(order.total_amount),
    shippingAddress: shippingAddressObj,
    paymentMethod: order.payment_method
  });

  await sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@ceaserbrand.com',
    subject: `New Order #${publicOrderId} - ${paymentMethodLabel}`,
    html: adminEmailContent
  });

  await client.query(
    'UPDATE orders SET confirmation_email_sent_at = NOW() WHERE id = $1',
    [orderId]
  );

  return { sent: true, publicOrderId };
}
