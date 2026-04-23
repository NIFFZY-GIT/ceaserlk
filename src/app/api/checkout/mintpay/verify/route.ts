import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMintPayConfig, fetchMintPayStatus, inferMintPayOrderStatus } from '@/lib/mintpay';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

/**
 * Client polls this endpoint after returning from MintPay gateway.
 * Checks payment status via MintPay API and updates order accordingly.
 */
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
         WHERE id = $1 AND payment_method = 'MINTPAY'`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order not found. Please start checkout again.' },
          { status: 404 }
        );
      }

      const existingOrder = orderResult.rows[0];

      // Already settled
      if (existingOrder.status === 'PAID') {
        return NextResponse.json({ success: true, orderId: existingOrder.id, status: 'PAID' });
      }

      // PENDING/CANCELLED — query MintPay status API to ensure final state is accurate
      const purchaseId = existingOrder.payment_intent_id;
      if (!purchaseId) {
        // No purchase_id stored yet — tell client to keep polling
        if (attemptNumber < 20) {
          return NextResponse.json({ pending: true });
        }
        return NextResponse.json({ success: false, error: 'MintPay payment was not initialized properly.' });
      }

      let statusResponse;
      try {
        const config = getMintPayConfig();
        statusResponse = await fetchMintPayStatus(config, purchaseId);
      } catch (mintError) {
        console.error('[MINTPAY VERIFY] MintPay status API call failed:', {
          error: mintError instanceof Error ? mintError.message : String(mintError),
          orderId,
          attempt: attemptNumber,
        });

        // If we can still retry, return pending
        if (attemptNumber < 20) {
          return NextResponse.json({ pending: true });
        }

        return NextResponse.json(
          { error: 'Payment verification is temporarily unavailable. Please try again shortly.' },
          { status: 502 }
        );
      }

      console.log('[MINTPAY VERIFY] Status response:', {
        orderId,
        attempt: attemptNumber,
        message: statusResponse.message,
        data: statusResponse.data,
      });

      // If MintPay says order doesn't exist, keep polling for a bit
      if (statusResponse.message === "Order doesn't exists") {
        if (attemptNumber < 20) {
          return NextResponse.json({ pending: true });
        }
        return NextResponse.json({ success: false, error: 'MintPay could not find this payment.' });
      }

      if (statusResponse.message === 'Success' && 'status' in statusResponse.data && statusResponse.data.status) {
        const mintStatus = inferMintPayOrderStatus(statusResponse.data.status);

        if (mintStatus === 'PAID' && existingOrder.status !== 'PAID') {
          await client.query(
            `UPDATE orders SET status = 'PAID' WHERE id = $1 AND status <> 'PAID'`,
            [orderId]
          );

          if (existingOrder.user_id) {
            try {
              await client.query('DELETE FROM carts WHERE user_id = $1', [existingOrder.user_id]);
            } catch (cartCleanupError) {
              console.error('[MINTPAY VERIFY] Cart cleanup failed:', cartCleanupError);
            }
          }
        }

        if (mintStatus === 'CANCELLED' && existingOrder.status === 'PENDING') {
          await client.query(
            `UPDATE orders SET status = 'CANCELLED' WHERE id = $1 AND status = 'PENDING'`,
            [orderId]
          );
        }

        if (mintStatus === 'PAID') {
          if (existingOrder.status === 'PENDING') {
            try {
              await sendOrderConfirmationIfNeeded(client, orderId);
            } catch (emailError) {
              console.error('[MINTPAY VERIFY] Email send failed:', emailError);
            }
          }
          return NextResponse.json({ success: true, orderId, status: 'PAID' });
        }

        if (mintStatus === 'CANCELLED') {
          return NextResponse.json({ success: false, error: 'Payment failed or was rejected by MintPay.' });
        }
      }

      // Still pending — tell client to continue polling
      if (attemptNumber < 20) {
        return NextResponse.json({ pending: true });
      }

      return NextResponse.json({ success: false, error: 'MintPay payment verification timed out. Please check your order status.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[MINTPAY VERIFY] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
