import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMintPayConfig, fetchMintPayStatus, inferMintPayOrderStatus } from '@/lib/mintpay';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email';

/**
 * MintPay redirects the user here after payment success or failure.
 * We check the actual status via MintPay's status API, update the order,
 * and redirect to the order-confirmation page.
 */
export async function GET(request: NextRequest) {
  const incoming = request.nextUrl;
  const callbackStatus = incoming.searchParams.get('status') || '';
  const orderId = incoming.searchParams.get('orderId') || '';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || incoming.origin;

  if (!orderId) {
    return NextResponse.redirect(new URL('/checkout?payment_error=mintpay_failed', appUrl));
  }

  const client = await db.connect();
  try {
    // Look up our order
    const orderResult = await client.query(
      `SELECT id, status, user_id, payment_intent_id FROM orders WHERE id = $1 AND payment_method = 'MINTPAY'`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.redirect(new URL('/checkout?payment_error=mintpay_failed', appUrl));
    }

    const order = orderResult.rows[0];

    // If already settled, just redirect
    if (order.status === 'PAID') {
      return NextResponse.redirect(new URL(`/order-confirmation?orderId=${orderId}`, appUrl));
    }

    // If callback says fail, redirect to checkout with error
    if (callbackStatus === 'fail') {
      // Mark as cancelled if still pending
      if (order.status === 'PENDING') {
        await client.query(
          `UPDATE orders SET status = 'CANCELLED' WHERE id = $1 AND status = 'PENDING'`,
          [orderId]
        );
      }
      return NextResponse.redirect(new URL('/checkout?payment_error=mintpay_failed', appUrl));
    }

    // Success callback — verify with MintPay status API
    if (order.payment_intent_id && order.status === 'PENDING') {
      try {
        const config = getMintPayConfig();
        const statusResponse = await fetchMintPayStatus(config, order.payment_intent_id);

        if (statusResponse.message === 'Success' && 'status' in statusResponse.data) {
          const mintStatus = inferMintPayOrderStatus(statusResponse.data.status);

          if (mintStatus === 'PAID') {
            await client.query(
              `UPDATE orders SET status = 'PAID' WHERE id = $1 AND status = 'PENDING'`,
              [orderId]
            );

            // Clear authenticated user's cart
            if (order.user_id) {
              await client.query('DELETE FROM carts WHERE user_id = $1', [order.user_id]);
            }

            try {
              await sendOrderConfirmationIfNeeded(client, orderId);
            } catch (emailError) {
              console.error('[MINTPAY RETURN] Email send failed:', emailError);
            }

            // Payment confirmed — redirect directly with orderId (no polling needed)
            return NextResponse.redirect(new URL(`/order-confirmation?orderId=${orderId}`, appUrl));
          } else if (mintStatus === 'CANCELLED') {
            await client.query(
              `UPDATE orders SET status = 'CANCELLED' WHERE id = $1 AND status = 'PENDING'`,
              [orderId]
            );
            return NextResponse.redirect(new URL('/checkout?payment_error=mintpay_failed', appUrl));
          }
        }
      } catch (statusError) {
        console.error('[MINTPAY RETURN] Status check failed:', statusError);
        // Don't block the redirect — verify endpoint will retry
      }
    }

    // Redirect to order confirmation (verify endpoint will poll for final status)
    const redirectUrl = new URL('/order-confirmation', appUrl);
    redirectUrl.searchParams.set('mintpay_order', orderId);
    redirectUrl.searchParams.set('mintpay_status', callbackStatus);
    return NextResponse.redirect(redirectUrl);
  } finally {
    client.release();
  }
}
