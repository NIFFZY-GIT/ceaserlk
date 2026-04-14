/**
 * MintPay "Buy Now, Pay Later" payment gateway integration.
 *
 * Flow:
 *   1. POST order data to MintPay API → receive purchase_id
 *   2. POST hidden form with purchase_id to MintPay login page → user is redirected
 *   3. After payment, user is redirected back to success_url or fail_url
 *   4. Merchant can check payment status via GET status endpoint
 */

const getEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return undefined;
};

export interface MintPayConfig {
  merchantId: string;
  token: string;
  /** Base URL without trailing slash */
  baseUrl: string;
  /** Login/gateway base URL (may differ from API base) */
  gatewayUrl: string;
  sandbox: boolean;
}

export const getMintPayConfig = (): MintPayConfig => {
  const merchantId = getEnv('MINTPAY_MERCHANT_ID');
  const token = getEnv('MINTPAY_TOKEN');
  const sandbox = (getEnv('MINTPAY_SANDBOX') || 'true').toLowerCase() === 'true';

  if (!merchantId || !token) {
    throw new Error('MintPay credentials are missing. Set MINTPAY_MERCHANT_ID and MINTPAY_TOKEN.');
  }

  const baseUrl = sandbox
    ? 'https://dev.mintpay.lk/user-order/api'
    : 'https://app.mintpay.lk/user-order/api';

  const gatewayUrl = sandbox
    ? 'https://dev.mintpay.lk/user-order/login/'
    : 'https://app.mintpay.lk/user-order/login/';

  return { merchantId, token, baseUrl, gatewayUrl, sandbox };
};

// ── Step 1: Create order on MintPay ────────────────────────────────────

export interface MintPayProduct {
  name: string;
  product_id: string;
  sku: string;
  quantity: string;
  unit_price: string;
  discount: string;
  created_date: string;
  updated_date: string;
}

export interface MintPayOrderPayload {
  merchant_id: string;
  order_id: string;
  total_price: string;
  discount: string;
  customer_email: string;
  customer_id: string;
  customer_telephone: string;
  ip: string;
  x_forwarded_for: string;
  delivery_street: string;
  delivery_region: string;
  delivery_postcode: string;
  cart_created_date: string;
  cart_updated_date: string;
  success_url: string;
  fail_url: string;
  products: MintPayProduct[];
}

export interface MintPayOrderResponse {
  message: 'Success' | 'Failed';
  data: string; // purchase_id on success, error message on failure
}

/**
 * POST order data to MintPay and receive a purchase_id.
 */
export async function createMintPayOrder(
  config: MintPayConfig,
  payload: MintPayOrderPayload
): Promise<MintPayOrderResponse> {
  const url = `${config.baseUrl}/`;

  console.log('[MINTPAY] Sending order to:', url);
  console.log('[MINTPAY] Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    // Strip HTML if MintPay returns an HTML error page
    const cleanText = text.replace(/<[^>]*>/g, '').trim().slice(0, 300);
    throw new Error(`MintPay API error (${response.status}): ${cleanText}`);
  }

  const data: MintPayOrderResponse = await response.json();
  return data;
}

// ── Payment status inquiry ─────────────────────────────────────────────

export interface MintPayStatusData {
  order_id: number;
  total_price: number;
  status: string; // "Approved" | "Rejected" etc.
  channel: string;
  created_at: string;
}

export interface MintPayStatusResponse {
  message: 'Success' | 'Failed' | "Order doesn't exists";
  data: MintPayStatusData | Record<string, never>;
}

/**
 * Query MintPay for the payment status of a given purchase.
 */
export async function fetchMintPayStatus(
  config: MintPayConfig,
  purchaseId: string
): Promise<MintPayStatusResponse> {
  const url = `${config.baseUrl}/status/merchantId/${config.merchantId}/purchaseId/${purchaseId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${config.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`MintPay status API error (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Map MintPay status string to internal order status.
 */
export function inferMintPayOrderStatus(mintStatus: string): 'PAID' | 'CANCELLED' | 'PENDING' {
  const normalized = (mintStatus || '').toLowerCase();
  if (normalized === 'approved') return 'PAID';
  if (normalized === 'rejected') return 'CANCELLED';
  return 'PENDING';
}

/**
 * Format a Date to MintPay's expected "Y-M-D H:M:S" format.
 */
export function formatMintPayDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
