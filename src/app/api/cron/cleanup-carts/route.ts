import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  // IMPORTANT: Secure this endpoint to prevent abuse
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Find all items from carts that have expired
    const expiredItemsQuery = `
      SELECT
        ci.sku_id,
        SUM(ci.quantity) as total_quantity
      FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE c.expires_at <= NOW()
      GROUP BY ci.sku_id;
    `;
    const { rows: itemsToRestore } = await client.query(expiredItemsQuery);

    // Step 2: Restore the stock for each SKU in a loop
    for (const item of itemsToRestore) {
      await client.query(
        'UPDATE stock_keeping_units SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.total_quantity, item.sku_id]
      );
    }

    // Step 3: Delete the expired carts. The 'ON DELETE CASCADE' will handle removing the cart_items.
    const { rowCount: deletedCartsCount } = await client.query('DELETE FROM carts WHERE expires_at <= NOW()');

    await client.query('COMMIT');

    const message = `Cart cleanup complete. Restored items for ${itemsToRestore.length} SKUs. Deleted ${deletedCartsCount} expired carts.`;
    console.log(message);
    return NextResponse.json({ success: true, message });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CRON JOB ERROR: Failed to cleanup expired carts', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}