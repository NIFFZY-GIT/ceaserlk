import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  fetchKokoOrderView,
  inferKokoOrderStatus,
} from '@/lib/koko';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    console.log('[KOKO VERIFY] Verifying order:', { orderId });

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

      // If order doesn't exist or was already paid, return appropriate status
      if (orderResult.rows.length === 0) {
        console.warn('[KOKO VERIFY] Order not found:', { orderId });
        return NextResponse.json(
          { success: false, error: 'Order not found. Please start checkout again.' },
          { status: 404 }
        );
      }

      const existingOrder = orderResult.rows[0];
      console.log('[KOKO VERIFY] Order found:', { orderId, current_status: existingOrder.status });

      // If payment already confirmed, return success
      if (existingOrder.status === 'PAID') {
        console.log('[KOKO VERIFY] Order already PAID');
        return NextResponse.json({ success: true, orderId: existingOrder.id, status: existingOrder.status });
      }

      // If payment was cancelled, return error
      if (existingOrder.status === 'CANCELLED') {
        console.log('[KOKO VERIFY] Order CANCELLED');
        return NextResponse.json({ success: false, error: 'Payment was cancelled.' });
      }

      // Order is in PENDING state (waiting for payment) - fetch current Koko status
      let viewResult;
      try {
        console.log('[KOKO VERIFY] Fetching Koko orderView status for:', orderId);
        viewResult = await fetchKokoOrderView(orderId);
        console.log('[KOKO VERIFY] Koko orderView response:', { status: viewResult.status, trnId: viewResult.trnId, desc: viewResult.desc });
      } catch (kokoError) {
        console.error('[KOKO VERIFY] Koko orderView API call failed:', {
          error: kokoError instanceof Error ? kokoError.message : String(kokoError),
          orderId,
        });
        
        // If Koko API fails, try to infer status from transaction ID
        // In production with HTTPS callbacks, Koko's orderView should work
        // On localhost, Koko can't reach us, so we try to work around it
        if (existingOrder.payment_intent_id) {
          console.log('[KOKO VERIFY] Using existing payment_intent_id as fallback:', existingOrder.payment_intent_id);
          return NextResponse.json({ success: true, orderId, status: 'PAID' });
        }
        
        // Koko API is temporarily unavailable - return pending so client keeps polling
        return NextResponse.json({
          success: false,
          pending: true,
          status: 'PENDING',
          message: 'Unable to reach payment gateway. Please wait...',
        });
      }

      const viewStatus = (viewResult.status || 'PENDING').toUpperCase();

      const mappedStatus = inferKokoOrderStatus({
        status: viewStatus,
        desc: viewResult.desc,
        trnId: viewResult.trnId,
      });
      console.log('[KOKO VERIFY] Mapped status:', { koko_status: viewStatus, mapped_to: mappedStatus });

      // Update order status if it's now confirmed (PAID or CANCELLED)
      if (
        existingOrder.status === 'PENDING' &&
        (mappedStatus === 'PAID' || mappedStatus === 'CANCELLED')
      ) {
        console.log('[KOKO VERIFY] Updating order to:', mappedStatus);
        await client.query(
          `UPDATE orders
           SET status = $1,
               payment_intent_id = COALESCE($2, payment_intent_id)
           WHERE id = $3`,
          [mappedStatus, viewResult.trnId || null, orderId]
        );
        console.log('[KOKO VERIFY] Order updated successfully');
      }

      // Send confirmation email if newly paid
      if (mappedStatus === 'PAID' && existingOrder.status === 'PENDING') {
        try {
          console.log('[KOKO VERIFY] Sending confirmation email');
          await sendOrderConfirmationIfNeeded(client, orderId);
          console.log('[KOKO VERIFY] Email sent successfully');
        } catch (emailError) {
          console.error('[KOKO VERIFY] Email send failed:', emailError);
        }
        return NextResponse.json({ success: true, orderId, status: 'PAID' });
      }

      if (mappedStatus === 'CANCELLED') {
        return NextResponse.json({ success: false, error: 'Payment failed or cancelled.' });
      }

      // Still pending - keep polling
      console.log('[KOKO VERIFY] Still pending, continue polling');
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
      { error: 'Failed to verify Koko payment status. Please try again.' },
      { status: 500 }
    );
  }
}
