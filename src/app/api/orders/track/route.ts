import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureOrderNumberSchema, formatOrderNumber } from '@/lib/order-number';
import { ensureDeliveryIdSchema } from '@/lib/delivery-id';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizePublicOrderInput(value: string): string {
  return value.trim().replace(/^#/, '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string };
    const input = normalizePublicOrderInput(body.orderId || '');

    if (!input) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await ensureOrderNumberSchema(db);
    await ensureDeliveryIdSchema(db);

    type OrderRow = {
      id: string;
      order_number: number | null;
      status: string;
      created_at: string;
      delivery_id: string | null;
    };

    let rows: OrderRow[] = [];
    if (isUuid(input)) {
      const query = `
        SELECT id, order_number, status, created_at, delivery_id
        FROM orders
        WHERE id = $1::uuid
        LIMIT 1;
      `;
      const result = await db.query<OrderRow>(query, [input]);
      rows = result.rows;
    } else if (/^\d{1,5}$/.test(input)) {
      const query = `
        SELECT id, order_number, status, created_at, delivery_id
        FROM orders
        WHERE order_number = $1
        LIMIT 1;
      `;
      const result = await db.query<OrderRow>(query, [Number.parseInt(input, 10)]);
      rows = result.rows;
    } else {
      return NextResponse.json({ error: 'Invalid Order ID format' }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = rows[0];

    const publicOrderId = formatOrderNumber(order.order_number) || order.id;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        publicOrderId,
        status: order.status,
        created_at: order.created_at,
        delivery_id: order.delivery_id,
      },
    });
  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json({ error: 'Failed to track order' }, { status: 500 });
  }
}
