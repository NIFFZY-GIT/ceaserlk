import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ... (interface definitions remain the same)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    await pool.query('SELECT cleanup_expired_reservations()');

    const cartRes = await pool.query(
      'SELECT * FROM "Cart" WHERE "sessionId" = $1',
      [sessionId]
    );

    if (cartRes.rows.length === 0) {
      return NextResponse.json({ sessionId, items: [], expiresAt: null });
    }

    const cart = cartRes.rows[0];
    const cartItemsRes = await pool.query(
      'SELECT * FROM "CartItem" WHERE "cartId" = $1',
      [cart.id]
    );

    return NextResponse.json({
      sessionId,
      items: cartItemsRes.rows,
      expiresAt: cart.expiresAt,
    });
  } catch (error) {
    console.error('[API_GET_CART_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
    const { sessionId, productId, colorId, sizeId, quantity, name, price, colorName, sizeName, imageUrl } = body;

    if (!sessionId || !productId || !colorId || !sizeId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const reserveRes = await pool.query('SELECT reserve_stock($1, $2, $3, $4) AS reserved', [productId, colorId, sizeId, quantity]);
    if (!reserveRes.rows[0].reserved) {
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 400 });
    }

    let cart;
    const cartRes = await pool.query('SELECT * FROM "Cart" WHERE "sessionId" = $1', [sessionId]);
    
    if (cartRes.rows.length === 0) {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const newCartRes = await pool.query(
        'INSERT INTO "Cart" ("sessionId", "expiresAt") VALUES ($1, $2) RETURNING *',
        [sessionId, expiresAt]
      );
      cart = newCartRes.rows[0];
    } else {
      cart = cartRes.rows[0];
    }

    const existingItemRes = await pool.query(
      'SELECT * FROM "CartItem" WHERE "cartId" = $1 AND "productId" = $2 AND "productSizeId" = $3 AND "colorName" = $4',
      [cart.id, productId, sizeId, colorName]
    );

    let cartItem;
    if (existingItemRes.rows.length > 0) {
      const newQuantity = existingItemRes.rows[0].quantity + quantity;
      const updateRes = await pool.query(
        'UPDATE "CartItem" SET quantity = $1 WHERE id = $2 RETURNING *',
        [newQuantity, existingItemRes.rows[0].id]
      );
      cartItem = updateRes.rows[0];
      
      // Update existing stock reservation
      await pool.query(
        'UPDATE "StockReservation" SET quantity = $1, "expiresAt" = $2 WHERE "cartItemId" = $3',
        [newQuantity, new Date(Date.now() + 30 * 60 * 1000), cartItem.id]
      );
    } else {
      const insertRes = await pool.query(
        `INSERT INTO "CartItem" ("cartId", "productId", "productSizeId", quantity, name, "sizeName", "colorName", "imageUrl", price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [cart.id, productId, sizeId, quantity, name, sizeName, colorName, imageUrl, price]
      );
      cartItem = insertRes.rows[0];
      
      // Create a stock reservation for new items only
      const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await pool.query(
        `INSERT INTO "StockReservation" ("productId", "colorId", "sizeId", "cartItemId", quantity, "expiresAt")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [productId, colorId, sizeId, cartItem.id, quantity, reservationExpiresAt]
      );
    }

    const cartItemsRes = await pool.query(
      'SELECT * FROM "CartItem" WHERE "cartId" = $1',
      [cart.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Item added to cart successfully',
      cart: {
        sessionId,
        items: cartItemsRes.rows,
        expiresAt: cart.expiresAt,
      },
    });
  } catch (error) {
    console.error('[API_POST_CART_ERROR]', error);
    if (body) {
      const { productId, sizeId, quantity } = body;
      await pool.query('UPDATE "ProductSize" SET stock = stock + $1 WHERE "productId" = $2 AND id = $3', [quantity, productId, sizeId]);
    }
    return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
  }
}
