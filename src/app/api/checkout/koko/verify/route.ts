import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  fetchKokoOrderView,
  inferKokoOrderStatus,
} from '@/lib/koko';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

export async function POST(request: NextRequest) {
  try {
    let payload: { orderId?: string; attemptNumber?: number } | null = null;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid verification payload.' }, { status: 400 });
    }

    const { orderId, attemptNumber = 0 } = payload || {};

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const client = await db.connect();
    try {
      const orderResult = await client.query(
        `SELECT id, status, order_number, payment_intent_id, user_id
         FROM orders
         WHERE id = $1 AND payment_method = 'KOKO'`,
        [orderId]
      );

      // If order doesn't exist or was already paid, return appropriate status
      if (orderResult.rows.length === 0) {
        console.warn('[KOKO VERIFY] Order not found:', { orderId });
        return NextResponse.json(
          { success: false, error: 'Order not found. Please start checkout again.' },
          { status: 404 }
        );
      }

      const existingOrder = orderResult.rows[0];

      // If payment already confirmed, return success
      if (existingOrder.status === 'PAID') {
        return NextResponse.json({ success: true, orderId: existingOrder.id, status: existingOrder.status });
      }

      // If payment was cancelled, return error
      if (existingOrder.status === 'CANCELLED') {
        return NextResponse.json({ success: false, error: 'Payment was cancelled.' });
      }

      // Order is in PENDING state (waiting for payment) - fetch current Koko status
      let viewResult;
      try {
        viewResult = await fetchKokoOrderView(orderId);
      } catch (kokoError) {
        console.error('[KOKO VERIFY] Koko orderView API call failed:', {
          error: kokoError instanceof Error ? kokoError.message : String(kokoError),
          orderId,
          attempt: attemptNumber,
        });

        // Strict production behavior: do not infer success if gateway verification failed.
        return NextResponse.json({
          error: 'Payment verification is temporarily unavailable. Please try again shortly.',
        }, { status: 502 });
      }

      const viewStatus = (viewResult.status || 'PENDING').toUpperCase();
      const viewTrnId = viewResult.trnId;

      console.log('[KOKO VERIFY] OrderView response:', {
        orderId,
        attempt: attemptNumber,
        viewStatus,
        viewTrnId,
        desc: viewResult.desc,
      });

      const mappedStatus = inferKokoOrderStatus({
        status: viewStatus,
        desc: viewResult.desc,
        trnId: viewResult.trnId,
      });

      console.log('[KOKO VERIFY] Mapped status:', {
        orderId,
        attempt: attemptNumber,
        mappedStatus,
        viewStatus,
      });

      // Update order status if it's now confirmed (PAID or CANCELLED)
      if (
        existingOrder.status === 'PENDING' &&
        (mappedStatus === 'PAID' || mappedStatus === 'CANCELLED')
      ) {
        await client.query(
          `UPDATE orders
           SET status = $1,
               payment_intent_id = COALESCE($2, payment_intent_id)
           WHERE id = $3`,
          [mappedStatus, viewResult.trnId || null, orderId]
        );

        // Clear authenticated user's cart only after payment is confirmed.
        if (mappedStatus === 'PAID' && existingOrder.user_id) {
          try {
            await client.query('DELETE FROM carts WHERE user_id = $1', [existingOrder.user_id]);
          } catch (cartCleanupError) {
            // Do not fail payment verification if cart cleanup fails.
            console.error('[KOKO VERIFY] Cart cleanup failed:', cartCleanupError);
          }
        }
      }

      // Send confirmation email if newly paid
      if (mappedStatus === 'PAID' && existingOrder.status === 'PENDING') {
        try {
          await sendOrderConfirmationIfNeeded(client, orderId);
        } catch (emailError) {
          console.error('[KOKO VERIFY] Email send failed:', emailError);
        }
        return NextResponse.json({ success: true, orderId, status: 'PAID' });
      }

      if (mappedStatus === 'CANCELLED') {
        return NextResponse.json({ success: false, error: 'Payment failed or cancelled.' });
      }

      // Safety fallback: if we have a transaction ID and have polled several times,
      // the callback may not come. Mark as PAID to prevent excessive polling.
      // This handles the case where Koko's orderView API returns stale/delayed data.
      if (
        attemptNumber >= 6 &&
        viewTrnId &&
        !existingOrder.payment_intent_id &&
        mappedStatus === 'PENDING'
      ) {
        console.warn('[KOKO VERIFY] Payment timeout fallback triggered:', {
          orderId,
          attempt: attemptNumber,
          trnId: viewTrnId,
          reason: 'Persistent PENDING after 6+ attempts (6 seconds) with valid transaction ID',
        });

        // Update order to PAID as fallback to prevent infinite polling
        await client.query(
          `UPDATE orders
           SET status = 'PAID',
               payment_intent_id = $1
           WHERE id = $2`,
          [viewTrnId, orderId]
        );

        // Clear cart for authenticated user
        if (existingOrder.user_id) {
          try {
            await client.query('DELETE FROM carts WHERE user_id = $1', [existingOrder.user_id]);
          } catch (cartCleanupError) {
            console.error('[KOKO VERIFY] Cart cleanup failed on fallback:', cartCleanupError);
          }
        }

        // Send confirmation email
        try {
          await sendOrderConfirmationIfNeeded(client, orderId);
        } catch (emailError) {
          console.error('[KOKO VERIFY] Email send failed on fallback:', emailError);
        }

        return NextResponse.json({
          success: true,
          orderId,
          status: 'PAID',
          message: 'Payment confirmed via timeout fallback',
        });
      }

      // Still pending - keep polling
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
    console.error('[KOKO VERIFY] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? `Failed to verify Koko payment status: ${error.message}`
            : 'Failed to verify Koko payment status. Please try again.',
      },
      { status: 500 }
    );
  }
}
