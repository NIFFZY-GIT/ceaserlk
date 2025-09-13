import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInvoicePDF, generateInvoiceFilename, InvoiceData } from '@/lib/pdf-invoice';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const client = await db.connect();
    
    try {
      // Fetch order details with items
      const orderQuery = `
        SELECT 
          o.id, o.customer_email, o.full_name, o.phone_number,
          o.shipping_address_line1, o.shipping_city, o.shipping_postal_code, o.shipping_country,
          o.subtotal, o.shipping_cost, o.total_amount, o.created_at,
          oi.product_name, oi.variant_color, oi.variant_size, oi.price_paid, oi.quantity
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = $1
        ORDER BY oi.id
      `;
      
      const result = await client.query(orderQuery, [orderId]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      const orderData = result.rows[0];
      const items = result.rows.map(row => ({
        productName: row.product_name,
        variantColor: row.variant_color,
        variantSize: row.variant_size,
        quantity: row.quantity,
        pricePaid: parseFloat(row.price_paid)
      }));

      const invoiceData: InvoiceData = {
        orderId: orderData.id,
        orderDate: new Date(orderData.created_at),
        customerName: orderData.full_name,
        customerEmail: orderData.customer_email,
        phoneNumber: orderData.phone_number,
        shippingAddress: {
          line1: orderData.shipping_address_line1,
          city: orderData.shipping_city,
          postalCode: orderData.shipping_postal_code,
          country: orderData.shipping_country
        },
        items,
        subtotal: parseFloat(orderData.subtotal),
        shippingCost: parseFloat(orderData.shipping_cost),
        totalAmount: parseFloat(orderData.total_amount)
      };

      // Generate PDF
      const pdfBuffer = generateInvoicePDF(invoiceData);
      const filename = generateInvoiceFilename(orderId);

      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}