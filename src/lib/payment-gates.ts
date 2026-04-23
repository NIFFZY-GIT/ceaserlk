type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export const PAYMENT_GATEWAYS = ['PAYHERE', 'KOKO', 'MINTPAY', 'COD'] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

const PAYMENT_GATEWAY_SET = new Set<string>(PAYMENT_GATEWAYS);

export const ensureProductPaymentGateSchema = async (queryable: Queryable): Promise<void> => {
  await queryable.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS blocked_payment_methods text[] NOT NULL DEFAULT '{}'::text[];
  `);
};

export const normalizeBlockedPaymentMethods = (value: unknown): PaymentGateway[] => {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item): item is PaymentGateway => PAYMENT_GATEWAY_SET.has(item));

  return Array.from(new Set(normalized));
};

export const parsePaymentGateway = (value: unknown): PaymentGateway | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (!PAYMENT_GATEWAY_SET.has(normalized)) return null;
  return normalized as PaymentGateway;
};

export const isPaymentMethodBlockedInCart = async (
  queryable: Queryable,
  cartId: string,
  paymentMethod: PaymentGateway
): Promise<boolean> => {
  const blockedCheck = await queryable.query(
    `
      SELECT 1
      FROM cart_items ci
      JOIN stock_keeping_units sku ON sku.id = ci.sku_id
      JOIN product_variants pv ON pv.id = sku.variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE ci.cart_id = $1
        AND $2 = ANY(COALESCE(p.blocked_payment_methods, '{}'::text[]))
      LIMIT 1
    `,
    [cartId, paymentMethod]
  );

  return blockedCheck.rows.length > 0;
};
