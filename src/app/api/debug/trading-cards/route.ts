import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check products with trading cards
    const productsQuery = `
      SELECT id, name, trading_card_image 
      FROM products 
      WHERE trading_card_image IS NOT NULL 
      LIMIT 5
    `;
    const productsResult = await db.query(productsQuery);

    // Check orders with those products
    const ordersQuery = `
      SELECT o.id, o.customer_email, o.status, oi.product_id, p.name, p.trading_card_image
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.trading_card_image IS NOT NULL
      LIMIT 5
    `;
    const ordersResult = await db.query(ordersQuery);

    return NextResponse.json({
      products: productsResult.rows,
      orders: ordersResult.rows,
      environment: {
        JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
  }
}