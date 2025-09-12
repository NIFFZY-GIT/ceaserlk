import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';

const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  paymentMethod: z.enum(['stripe', 'paypal', 'cod']),
  cartId: z.string().uuid("Valid cart ID is required"),
});

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    
    // Validate input
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      address, 
      city, 
      zipCode, 
      country,
      paymentMethod,
      cartId 
    } = validation.data;

    await client.query('BEGIN');

    // Check if cart exists and get items
    const cartResult = await client.query(
      'SELECT id, "expiresAt" FROM "Cart" WHERE id = $1',
      [cartId]
    );

    if (cartResult.rows.length === 0) {
      throw new Error('Cart not found');
    }

    const cart = cartResult.rows[0];
    
    // Check if cart is expired
    if (new Date(cart.expiresAt) < new Date()) {
      throw new Error('Cart has expired');
    }

    // Get cart items
    const itemsResult = await client.query(`
      SELECT ci.*, p.name as product_name 
      FROM "CartItem" ci
      JOIN "Product" p ON ci."productId" = p.id
      WHERE ci."cartId" = $1
    `, [cartId]);

    if (itemsResult.rows.length === 0) {
      throw new Error('Cart is empty');
    }

    const items = itemsResult.rows;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shipping = subtotal >= 5000 ? 0 : 500; // Free shipping over LKR 5000
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + shipping + tax;

    // Create order
    const orderResult = await client.query(`
      INSERT INTO "Order" (
        "customerId", email, "firstName", "lastName", phone,
        address, city, "zipCode", country,
        subtotal, shipping, tax, total,
        "paymentMethod", status, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING id
    `, [
      null, // For now, no customer ID for guest checkout
      email, firstName, lastName, phone,
      address, city, zipCode, country,
      subtotal, shipping, tax, total,
      paymentMethod, 'PENDING'
    ]);

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const item of items) {
      await client.query(`
        INSERT INTO "OrderItem" (
          "orderId", "productId", "productSizeId", quantity,
          name, "sizeName", "colorName", "imageUrl", price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        orderId, item.productId, item.productSizeId, item.quantity,
        item.name, item.sizeName, item.colorName, item.imageUrl, item.price
      ]);
    }

    // For Cash on Delivery, mark as confirmed
    if (paymentMethod === 'cod') {
      await client.query(
        'UPDATE "Order" SET status = $1 WHERE id = $2',
        ['CONFIRMED', orderId]
      );
    }

    // Clear the cart
    await client.query('DELETE FROM "Cart" WHERE id = $1', [cartId]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      orderId,
      total,
      message: 'Order placed successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CHECKOUT_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process order';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  } finally {
    client.release();
  }
}
