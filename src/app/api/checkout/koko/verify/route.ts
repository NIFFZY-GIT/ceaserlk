import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  canTransitionOrderStatus,
  fetchKokoOrderView,
  getKokoConfig,
  inferKokoOrderStatus,
  verifyKokoSignature,
} from '@/lib/koko';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const client = await db.connect();
    try {
      const orderResult = await client.query(
        `SELECT id, status, order_number, payment_intent_id
         FROM orders
         WHERE id = $1 AND payment_method = 'KOKO'`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return NextResponse.json({ error: 'Koko order not found.' }, { status: 404 });
      }

      const existingOrder = orderResult.rows[0];

      if (existingOrder.status === 'PAID') {
        return NextResponse.json({ success: true, orderId: existingOrder.id, status: existingOrder.status });
      }

      if (existingOrder.status === 'CANCELLED') {
        return NextResponse.json({ success: false, error: 'Payment was cancelled.' });
      }

      const viewResult = await fetchKokoOrderView(orderId);
      const viewStatus = (viewResult.status || 'PENDING').toUpperCase();

      if (viewResult.signature && viewResult.orderId && viewResult.trnId) {
        const config = getKokoConfig();
        const validationDataString = `${viewResult.orderId}${viewResult.trnId}${viewStatus}`;
        const validSignature = verifyKokoSignature(validationDataString, viewResult.signature, config.publicKey);
        if (!validSignature) {
          return NextResponse.json({ success: false, error: 'Invalid Koko verification signature.' }, { status: 400 });
        }
      }

      const mappedStatus = inferKokoOrderStatus({
        status: viewStatus,
        desc: viewResult.desc,
        trnId: viewResult.trnId,
      });

      if (canTransitionOrderStatus(existingOrder.status, mappedStatus)) {
        await client.query(
          `UPDATE orders
           SET status = $1,
               payment_intent_id = COALESCE($2, payment_intent_id),
               updated_at = NOW()
           WHERE id = $3`,
          [mappedStatus, viewResult.trnId || null, orderId]
        );
      }

      if (mappedStatus === 'PAID') {
        try {
          await sendOrderConfirmationIfNeeded(client, orderId);
        } catch (emailError) {
          console.error('Koko verify email send failed:', emailError);
        }
        return NextResponse.json({ success: true, orderId, status: mappedStatus });
      }

      if (mappedStatus === 'CANCELLED') {
        return NextResponse.json({ success: false, error: 'Payment failed or cancelled.' });
      }

      return NextResponse.json({
        success: false,
        pending: true,
        status: mappedStatus,
        message: 'Payment is still pending.',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Koko verify error:', error);
    return NextResponse.json({ error: 'Failed to verify Koko payment status.' }, { status: 500 });
  }
}
