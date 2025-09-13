import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  // Secure the endpoint
  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const client = await db.connect();

    // --- We will run all queries concurrently for maximum performance ---

    // Query 1: KPI - Total Revenue and Sales
    const revenueQuery = client.query(`
      SELECT 
        SUM(total_amount) as "totalRevenue", 
        COUNT(*) as "totalSales" 
      FROM orders WHERE status IN ('PAID', 'SHIPPED', 'DELIVERED');
    `);

    // Query 2: KPI - New customers in the last 30 days
    const customersQuery = client.query(`
      SELECT COUNT(*) as "newCustomers" FROM users WHERE created_at > NOW() - INTERVAL '30 days';
    `);

    // Query 3: Data for Sales Chart (Sales per day for the last 30 days)
    const salesDataQuery = client.query(`
      SELECT 
        DATE_TRUNC('day', created_at)::DATE as date, 
        SUM(total_amount) as revenue 
      FROM orders 
      WHERE status IN ('PAID', 'SHIPPED', 'DELIVERED') AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC;
    `);

    // Query 4: Recent Orders (Last 5)
    const recentOrdersQuery = client.query(`
      SELECT id, full_name, total_amount, status, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    // Query 5: Low Stock Items (quantity < 10)
    const lowStockQuery = client.query(`
        SELECT p.name, pv.color_name, s.size, s.stock_quantity
        FROM stock_keeping_units s
        JOIN product_variants pv ON s.variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        WHERE s.stock_quantity > 0 AND s.stock_quantity < 10
        ORDER BY s.stock_quantity ASC
        LIMIT 5;
    `);

    // Await all promises
    const [
      revenueResult, 
      customersResult, 
      salesDataResult, 
      recentOrdersResult,
      lowStockResult
    ] = await Promise.all([
        revenueQuery, 
        customersQuery, 
        salesDataQuery, 
        recentOrdersQuery,
        lowStockQuery
    ]);
    
    client.release();

    const dashboardData = {
      kpis: {
        totalRevenue: revenueResult.rows[0].totalRevenue || '0',
        totalSales: revenueResult.rows[0].totalSales || '0',
        newCustomers: customersResult.rows[0].newCustomers || '0',
      },
      salesData: salesDataResult.rows.map(r => ({
          date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: parseFloat(r.revenue)
      })),
      recentOrders: recentOrdersResult.rows,
      lowStockItems: lowStockResult.rows,
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error("API Dashboard Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}