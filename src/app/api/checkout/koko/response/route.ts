import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getKokoConfig, inferKokoOrderStatus, verifyKokoSignature } from '@/lib/koko';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const orderId = (formData.get('orderId') || formData.get('_orderId')) as string | null;
    const trnId = formData.get('trnId') as string | null;
    const status = (formData.get('status') as string | null) || 'PENDING';
    const signature = formData.get('signature') as string | null;

    console.log('[KOKO RESPONSE] Received callback:', { orderId, trnId, status, hasSignature: !!signature });

    if (!orderId || !signature) {
      console.error('[KOKO RESPONSE] Missing required fields', { orderId: !!orderId, signature: !!signature });
      return new Response('Missing required Koko callback fields', { status: 400 });
    }

    const config = getKokoConfig();
    const verificationDataString = `${orderId}${trnId || ''}${status}`;
    const isValidSignature = verifyKokoSignature(verificationDataString, signature, config.publicKey);

    console.log('[KOKO RESPONSE] Signature verification:', { isValid: isValidSignature });

    if (!isValidSignature) {
      console.error('[KOKO RESPONSE] Invalid signature', { orderId, status });
      return new Response('Invalid signature', { status: 400 });
    }

    const nextOrderStatus = inferKokoOrderStatus({ status, trnId: trnId || undefined });
    console.log('[KOKO RESPONSE] Inferred order status:', { koko_status: status, mapped_status: nextOrderStatus });

    const client = await db.connect();
    try {
      const orderResult = await client.query(
        `SELECT id, status FROM orders WHERE id = $1 AND payment_method = 'KOKO'`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error('[KOKO RESPONSE] Order not found:', { orderId });
        return new Response('Order not found', { status: 404 });
      }

      const currentStatus = orderResult.rows[0].status;
      console.log('[KOKO RESPONSE] Order found:', { orderId, currentStatus, nextOrderStatus });

      // Only allow transition from PENDING -> PAID/CANCELLED
      // If already PAID, do nothing
      if (currentStatus === 'PAID') {
        console.log('[KOKO RESPONSE] Order already PAID, skipping update');
        return new Response('OK', { status: 200 });
      }

      if (
        currentStatus === 'PENDING' &&
        (nextOrderStatus === 'PAID' || nextOrderStatus === 'CANCELLED')
      ) {
        console.log('[KOKO RESPONSE] Updating order status', { from: currentStatus, to: nextOrderStatus });
        await client.query(
          `UPDATE orders
           SET status = $1,
               payment_intent_id = COALESCE($2, payment_intent_id)
           WHERE id = $3`,
          [nextOrderStatus, trnId, orderId]
        );
        console.log('[KOKO RESPONSE] Order updated successfully');
      } else {
        console.log('[KOKO RESPONSE] No status transition needed', { currentStatus, nextOrderStatus });
      }

      if (nextOrderStatus === 'PAID') {
        try {
          console.log('[KOKO RESPONSE] Sending confirmation email');
          await sendOrderConfirmationIfNeeded(client, orderId);
          console.log('[KOKO RESPONSE] Confirmation email sent');
        } catch (emailError) {
          console.error('[KOKO RESPONSE] Email send failed:', emailError);
        }
      }

      console.log('[KOKO RESPONSE] Callback processed successfully');
      return new Response('OK', { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[KOKO RESPONSE] Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  return new Response('Koko response endpoint active', { status: 200 });
}
