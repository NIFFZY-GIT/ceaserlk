import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getTikTokEventContext,
  normalizeTikTokEventProperties,
  sendTikTokServerEvent,
} from '@/lib/tiktok-events';

const allowedEvents = new Set([
  'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'CompletePayment', 'PlaceAnOrder',
]);
const allowedPropertyKeys = new Set([
  'order_id', 'content_id', 'content_name', 'content_type', 'contents', 'value', 'currency', 'quantity', 'search_string',
]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 });
  }

  const eventBody = body as Record<string, unknown>;
  const event = eventBody.event;
  const eventId = eventBody.event_id;
  if (
    typeof event !== 'string' || !allowedEvents.has(event) ||
    typeof eventId !== 'string' || eventId.length < 1 || eventId.length > 200
  ) {
    return NextResponse.json({ error: 'Unsupported event' }, { status: 400 });
  }

  const rawProperties = eventBody.properties;
  const properties: Record<string, unknown> = {};
  if (rawProperties && typeof rawProperties === 'object' && !Array.isArray(rawProperties)) {
    for (const [key, value] of Object.entries(rawProperties)) {
      if (allowedPropertyKeys.has(key)) properties[key] = value;
    }
  }

  let eventContext = getTikTokEventContext(
    request,
    typeof eventBody.url === 'string' ? eventBody.url.slice(0, 2048) : request.nextUrl.href,
    typeof eventBody.referrer === 'string' ? eventBody.referrer.slice(0, 2048) : undefined
  );

  if (event === 'CompletePayment' || event === 'PlaceAnOrder') {
    const orderId = properties.order_id;
    const expectedEventId = `${event === 'CompletePayment' ? 'purchase' : 'order'}-${String(orderId || '')}`;
    if (typeof orderId !== 'string' || eventId !== expectedEventId) {
      return NextResponse.json({ error: 'Invalid order event' }, { status: 400 });
    }

    const client = await db.connect();
    try {
      const orderResult = await client.query(
        `SELECT id, status, payment_method, customer_email, phone_number, total_amount
         FROM orders WHERE id = $1`,
        [orderId]
      );
      const order = orderResult.rows[0];
      const orderStatus = String(order?.status || '').toUpperCase();
      const paymentMethod = String(order?.payment_method || '').toUpperCase();
      const validOrder = event === 'CompletePayment'
        ? ['PAID', 'COMPLETED'].includes(orderStatus)
        : paymentMethod === 'COD';
      if (!order || !validOrder) {
        return NextResponse.json({ error: 'Order is not eligible for this event' }, { status: 403 });
      }

      const itemsResult = await client.query(
        `SELECT product_id, product_name, quantity, price_paid
         FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      const contents = itemsResult.rows.map((item) => ({
        content_id: String(item.product_id),
        content_type: 'product',
        content_name: item.product_name,
        quantity: Number(item.quantity),
        price: Number(item.price_paid),
      }));
      properties.content_id = contents[0]?.content_id;
      properties.content_name = contents[0]?.content_name;
      properties.content_type = 'product';
      properties.contents = contents;
      properties.value = Number(order.total_amount);
      properties.currency = 'LKR';
      eventContext = {
        ...eventContext,
        email: order.customer_email,
        phone: order.phone_number,
      };
    } finally {
      client.release();
    }
  }

  let normalizedProperties: Record<string, unknown>;
  try {
    normalizedProperties = await normalizeTikTokEventProperties(properties);
  } catch (error) {
    console.error('TikTok event currency conversion failed:', error);
    return NextResponse.json({ error: 'Currency conversion unavailable' }, { status: 503 });
  }

  const serverSent = await sendTikTokServerEvent(event, eventId, normalizedProperties, eventContext);
  return NextResponse.json({ success: true, serverSent, properties: normalizedProperties });
}