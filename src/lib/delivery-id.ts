type Queryable = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

export async function ensureDeliveryIdSchema(db: Queryable): Promise<void> {
  // Idempotent schema changes to support delivery tracking.
  // Safe to call multiple times.
  const sql = `
    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS delivery_id character varying(255);

    COMMENT ON COLUMN public.orders.delivery_id IS 'Tracking/delivery ID from delivery partner (e.g., Koombiya tracking code)';
  `;

  await db.query(sql);
}
