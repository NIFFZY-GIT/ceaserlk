import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { PoolClient } from 'pg';
import { verifyAuth, createUnauthorizedResponse } from '@/lib/auth';

const CART_EXPIRATION_SECONDS = 1800;

// --- HELPER FUNCTION: Cleanup expired carts and restore stock ---
async function cleanupExpiredCarts(client: PoolClient): Promise<void> {
  try {
    // Find all expired carts with their items
    const expiredCartsQuery = `
      SELECT ci.sku_id, ci.quantity
      FROM carts c
      JOIN cart_items ci ON c.id = ci.cart_id
      WHERE c.expires_at < NOW()
    `;
    
    const expiredItems = await client.query(expiredCartsQuery);
    
    // Restore stock for each expired item
    for (const item of expiredItems.rows) {
      await client.query(
        'UPDATE stock_keeping_units SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.quantity, item.sku_id]
      );
    }
    
    // Delete expired carts (cascade will delete cart_items)
    await client.query('DELETE FROM carts WHERE expires_at < NOW()');
    
    if (expiredItems.rows.length > 0) {
      console.log(`Cleaned up ${expiredItems.rows.length} expired cart items and restored stock`);
    }
  } catch (error) {
    console.error('Error cleaning up expired carts:', error);
  }
}

// --- THIS IS THE MISSING HELPER FUNCTION ---
async function getOrCreateCartId(sessionId: string, client: PoolClient): Promise<string> {
  // Clean up expired carts before creating/updating current cart
  await cleanupExpiredCarts(client);
  
  const expiration = new Date(Date.now() + CART_EXPIRATION_SECONDS * 1000);

  const query = `
    INSERT INTO carts (session_id, expires_at)
    VALUES ($1, $2)
    ON CONFLICT (session_id)
    DO UPDATE SET expires_at = EXCLUDED.expires_at
    RETURNING id;
  `;

  const { rows } = await client.query(query, [sessionId, expiration]);
  return rows[0].id;
}
// --- END OF HELPER FUNCTION ---

// --- Your existing route handlers now have access to the helper ---

export async function GET(request: NextRequest) {
  // Check authentication
  const user = await verifyAuth(request);
  if (!user) {
    return createUnauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const client = await db.connect();
  try {
    // This query ensures a cart exists before we try to select from it.
    const cartId = await getOrCreateCartId(sessionId, client);

    // --- THIS IS THE CORRECTED QUERY WITH VARIANT IMAGES ---
    const cartQuery = `
      SELECT
        c.id as "cartId",
        c.expires_at AS "expiresAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', ci.id,
              'quantity', ci.quantity,
              'sku', json_build_object(
                'id', s.id,
                'size', s.size,
                'variant', json_build_object(
                  'price', v.price,
                  'thumbnail_url', v.thumbnail_url,
                  'color_name', v.color_name,
                  'variant_images', COALESCE(vi.images, '[]'::json),
                  'product', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'shipping_cost', p.shipping_cost
                  )
                )
              )
            )
          ) FILTER (WHERE ci.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      LEFT JOIN stock_keeping_units s ON ci.sku_id = s.id
      LEFT JOIN product_variants v ON s.variant_id = v.id
      LEFT JOIN products p ON v.product_id = p.id
      LEFT JOIN (
        SELECT 
          variant_id,
          json_agg(
            json_build_object(
              'id', id,
              'image_url', image_url,
              'alt_text', alt_text,
              'display_order', display_order
            ) ORDER BY display_order ASC
          ) as images
        FROM variant_images
        GROUP BY variant_id
      ) vi ON v.id = vi.variant_id
      WHERE c.id = $1
      GROUP BY c.id, c.expires_at;
    `;

    const result = await client.query(cartQuery, [cartId]);

    if (result.rows.length === 0) {
      // This case handles a brand new, empty cart
      const cartInfo = await client.query('SELECT expires_at FROM carts WHERE id = $1', [cartId]);
      return NextResponse.json({
        id: cartId,
        items: [],
        expiresAt: cartInfo.rows[0].expires_at,
        subtotal: 0,
        totalShipping: 0,
        totalAmount: 0,
      });
    }

    const cartData = result.rows[0];
    const items = cartData.items || [];
    
    const subtotal = items.reduce((total: number, item: { sku: { variant: { price: string } }, quantity: number }) => {
      const price = parseFloat(item.sku.variant.price);
      return total + (price * item.quantity);
    }, 0);

    const totalShipping = items.reduce((total: number, item: { sku: { variant: { product: { shipping_cost: string } } }, quantity: number }) => {
      const shippingCost = parseFloat(item.sku.variant.product.shipping_cost) || 0;
      return total + (shippingCost * item.quantity);
    }, 0);

    const totalAmount = subtotal + totalShipping;

    const cart = {
      id: cartData.cartId,
      items: items,
      subtotal: subtotal,
      totalShipping: totalShipping,
      totalAmount: totalAmount,
      expiresAt: cartData.expiresAt
    };

    return NextResponse.json(cart);

  } catch (error) {
    console.error('API GET CART ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const user = await verifyAuth(request);
  if (!user) {
    return createUnauthorizedResponse();
  }

  const { skuId, quantity, sessionId } = await request.json();
  if (!skuId || !quantity || !sessionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const stockCheck = await client.query('SELECT stock_quantity FROM stock_keeping_units WHERE id = $1 FOR UPDATE', [skuId]);
    if (stockCheck.rows.length === 0) throw new Error('Product SKU not found.');
    if (stockCheck.rows[0].stock_quantity < quantity) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: `Not enough stock.` }, { status: 409 });
    }

    // This line will now work correctly
    const cartId = await getOrCreateCartId(sessionId, client);

    await client.query(
      `INSERT INTO cart_items (cart_id, sku_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, sku_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity;`,
      [cartId, skuId, quantity]
    );

    await client.query('UPDATE stock_keeping_units SET stock_quantity = stock_quantity - $1 WHERE id = $2', [quantity, skuId]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Item added to cart' }, { status: 200 });

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('API POST CART ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    client.release();
  }
}

// --- UPDATED: Update an item's quantity WITH stock management ---
export async function PUT(request: NextRequest) {
  // Check authentication
  const user = await verifyAuth(request);
  if (!user) {
    return createUnauthorizedResponse();
  }

  const { cartItemId, newQuantity } = await request.json();

  if (!cartItemId || newQuantity === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Get the current item details (sku_id, old quantity)
    const itemQuery = await client.query('SELECT sku_id, quantity FROM cart_items WHERE id = $1', [cartItemId]);
    if (itemQuery.rows.length === 0) throw new Error('Cart item not found.');
    
    const { sku_id: skuId, quantity: oldQuantity } = itemQuery.rows[0];
    const quantityChange = newQuantity - oldQuantity;

    if (quantityChange > 0) { // Increasing quantity
      // Check if there is enough stock for the INCREASE
      const stockCheck = await client.query('SELECT stock_quantity FROM stock_keeping_units WHERE id = $1 FOR UPDATE', [skuId]);
      if (stockCheck.rows[0].stock_quantity < quantityChange) {
        throw new Error('Not enough stock to increase quantity.');
      }
      await client.query('UPDATE stock_keeping_units SET stock_quantity = stock_quantity - $1 WHERE id = $2', [quantityChange, skuId]);
    } else if (quantityChange < 0) { // Decreasing quantity
      // Add stock back
      await client.query('UPDATE stock_keeping_units SET stock_quantity = stock_quantity + $1 WHERE id = $2', [Math.abs(quantityChange), skuId]);
    }

    // Step 2: Update or delete the cart item
    if (newQuantity > 0) {
      await client.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [newQuantity, cartItemId]);
    } else {
      await client.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Quantity updated' }, { status: 200 });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('API PUT CART ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    client.release();
  }
}

// --- UPDATED: Remove an item from the cart WITH stock restoration ---
export async function DELETE(request: NextRequest) {
  // Check authentication
  const user = await verifyAuth(request);
  if (!user) {
    return createUnauthorizedResponse();
  }

  const { cartItemId } = await request.json();
  if (!cartItemId) return NextResponse.json({ error: 'Cart item ID is required' }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Find the item to get its quantity and sku_id before deleting
    const itemQuery = await client.query('SELECT sku_id, quantity FROM cart_items WHERE id = $1', [cartItemId]);
    if (itemQuery.rows.length === 0) { // Item already deleted, success
        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: 'Item already removed' }, { status: 200 });
    }
    const { sku_id: skuId, quantity } = itemQuery.rows[0];

    // Step 2: Restore the stock
    await client.query('UPDATE stock_keeping_units SET stock_quantity = stock_quantity + $1 WHERE id = $2', [quantity, skuId]);

    // Step 3: Delete the item from the cart
    await client.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Item removed and stock restored' }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('API DELETE CART ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}