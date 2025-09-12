import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        o.id,
        o.email,
        o.first_name,
        o.last_name,
        o.phone,
        o.address,
        o.city,
        o.zip_code,
        o.country,
        o.subtotal,
        o.shipping,
        o.tax,
        o.total,
        o.payment_method,
        o.status,
        o.created_at
      FROM orders o
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await pool.query(`
      SELECT 
        oi.id,
        oi.quantity,
        oi.price,
        p.name,
        p.image_url,
        ps.name as size_name,
        pc.name as color_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      LEFT JOIN product_colors pc ON oi.color_id = pc.id
      WHERE oi.order_id = $1
    `, [orderId]);

    const orderData = {
      id: order.id,
      email: order.email,
      firstName: order.first_name,
      lastName: order.last_name,
      phone: order.phone,
      address: order.address,
      city: order.city,
      zipCode: order.zip_code,
      country: order.country,
      subtotal: parseFloat(order.subtotal),
      shipping: parseFloat(order.shipping),
      tax: parseFloat(order.tax),
      total: parseFloat(order.total),
      paymentMethod: order.payment_method,
      status: order.status,
      createdAt: order.created_at,
      items: itemsResult.rows.map((item: {
        id: number;
        quantity: number;
        price: string;
        name: string;
        image_url: string;
        size_name: string;
        color_name: string;
      }) => ({
        id: item.id,
        name: item.name,
        sizeName: item.size_name,
        colorName: item.color_name,
        imageUrl: item.image_url,
        quantity: item.quantity,
        price: parseFloat(item.price)
      }))
    };

    return NextResponse.json(orderData);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
