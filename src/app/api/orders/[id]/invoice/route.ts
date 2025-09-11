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

    // Generate HTML invoice
    const invoiceHtml = generateInvoiceHtml(order, itemsResult.rows);

    // For now, return HTML that can be converted to PDF on the client side
    // In production, you'd use a library like Puppeteer or jsPDF server-side
    return new Response(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${orderId}.html"`,
      },
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface OrderData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  zip_code: string;
  country: string;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: string;
  name: string;
  image_url: string;
  size_name: string;
  color_name: string;
}

function generateInvoiceHtml(order: OrderData, items: OrderItem[]) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice #${order.id}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border: 1px solid #ddd;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #000;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-info h2 {
            margin: 0;
            font-size: 24px;
            color: #000;
        }
        .billing-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .billing-section h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            color: #000;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
        }
        .items-table .price {
            text-align: right;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .totals-row.total {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #000;
            margin-top: 10px;
        }
        .payment-info {
            margin-top: 40px;
            padding: 20px;
            background-color: #f9f9f9;
            border-left: 4px solid #000;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { border: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo">CEASER.LK</div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> ${order.id}</p>
                <p><strong>Date:</strong> ${formatDate(order.created_at)}</p>
                <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
        </div>

        <div class="billing-info">
            <div class="billing-section">
                <h3>Bill To:</h3>
                <p><strong>${order.first_name} ${order.last_name}</strong></p>
                <p>${order.address}</p>
                <p>${order.city}, ${order.zip_code}</p>
                <p>${order.country}</p>
                <p>Phone: ${order.phone}</p>
                <p>Email: ${order.email}</p>
            </div>
            <div class="billing-section">
                <h3>Payment Method:</h3>
                <p style="text-transform: capitalize;">${order.payment_method.replace('_', ' ')}</p>
                <h3 style="margin-top: 20px;">Order Date:</h3>
                <p>${formatDate(order.created_at)}</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Size/Color</th>
                    <th>Qty</th>
                    <th class="price">Unit Price</th>
                    <th class="price">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.size_name || 'N/A'} / ${item.color_name || 'N/A'}</td>
                        <td>${item.quantity}</td>
                        <td class="price">LKR ${parseFloat(item.price).toFixed(2)}</td>
                        <td class="price">LKR ${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>LKR ${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span>Shipping:</span>
                <span>LKR ${parseFloat(order.shipping).toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span>Tax:</span>
                <span>LKR ${parseFloat(order.tax).toFixed(2)}</span>
            </div>
            <div class="totals-row total">
                <span>Total:</span>
                <span>LKR ${parseFloat(order.total).toFixed(2)}</span>
            </div>
        </div>

        <div class="payment-info">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> ${order.payment_method.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Order Status:</strong> ${order.status.toUpperCase()}</p>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>If you have any questions about this invoice, please contact us.</p>
            <p><strong>CEASER.LK</strong> | Email: info@ceaser.lk | Phone: +94 XXX XXX XXX</p>
        </div>
    </div>

    <script>
        // Auto-print when opened as PDF
        if (window.location.search.includes('print=true')) {
            window.print();
        }
    </script>
</body>
</html>
  `;
}
