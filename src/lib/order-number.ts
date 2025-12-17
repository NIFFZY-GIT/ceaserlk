type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

const ORDER_NUMBER_WIDTH = 5;

export function formatOrderNumber(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'number' ? String(value) : String(value).trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return raw;
  return raw.padStart(ORDER_NUMBER_WIDTH, '0');
}

export async function ensureOrderNumberSchema(db: Queryable): Promise<void> {
  // Idempotent schema changes to support 5-digit public order numbers.
  // Safe to call multiple times.
  const sql = `
    CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 10000;

    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS order_number integer;

    ALTER TABLE public.orders
      ALTER COLUMN order_number SET DEFAULT nextval('public.order_number_seq');

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_order_number_unique'
      ) THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
      END IF;
    END $$;

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM public.orders WHERE order_number IS NULL) THEN
        UPDATE public.orders
          SET order_number = nextval('public.order_number_seq')
          WHERE order_number IS NULL;
      END IF;
    END $$;
  `;

  await db.query(sql);
}
