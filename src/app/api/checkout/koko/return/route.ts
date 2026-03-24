import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const incoming = request.nextUrl;
  const orderId = incoming.searchParams.get('orderId') || incoming.searchParams.get('_orderId');
  const status = incoming.searchParams.get('status') || '';
  const trnId = incoming.searchParams.get('trnId') || '';

  const redirectUrl = new URL('/order-confirmation', incoming.origin);

  if (orderId) {
    redirectUrl.searchParams.set('koko_order', orderId);
  }

  if (status) {
    redirectUrl.searchParams.set('koko_status', status);
  }

  if (trnId) {
    redirectUrl.searchParams.set('koko_trn', trnId);
  }

  return NextResponse.redirect(redirectUrl);
}
