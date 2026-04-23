import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const REVENUE_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED'];

const toSafeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeGrowth = (current: number, previous: number): number | null => {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
};

const safeQuery = async <TRow extends Record<string, unknown>>(
  queryPromise: Promise<{ rows: TRow[] }>,
  fallbackRows: TRow[],
  label: string
): Promise<{ rows: TRow[] }> => {
  try {
    return await queryPromise;
  } catch (error) {
    console.error(`[DASHBOARD] Query failed: ${label}`, error);
    return { rows: fallbackRows };
  }
};

export async function GET(request: NextRequest) {
  // Secure the endpoint
  try {
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  let client;
  try {
    client = await db.connect();

    // Period-over-period KPIs
    const currentKpiQuery = client.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as "totalRevenue", 
        COUNT(*) as "totalSales"
      FROM orders
      WHERE status = ANY($1::text[]) AND created_at >= NOW() - INTERVAL '30 days';
    `, [REVENUE_STATUSES]);

    const previousKpiQuery = client.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as "totalRevenue", 
        COUNT(*) as "totalSales"
      FROM orders
      WHERE status = ANY($1::text[])
        AND created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days';
    `, [REVENUE_STATUSES]);

    const currentCustomersQuery = client.query(`
      SELECT COUNT(*) as "newCustomers"
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days';
    `);

    const previousCustomersQuery = client.query(`
      SELECT COUNT(*) as "newCustomers"
      FROM users
      WHERE created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days';
    `);

    // Daily revenue and order count for chart
    const salesDataQuery = client.query(`
      WITH daily AS (
        SELECT 
          DATE_TRUNC('day', created_at)::date AS day,
          COALESCE(SUM(total_amount), 0)::numeric AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE status = ANY($1::text[])
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
      )
      SELECT 
        d.day::date AS date,
        COALESCE(daily.revenue, 0) AS revenue,
        COALESCE(daily.orders, 0) AS orders
      FROM generate_series(
        DATE_TRUNC('day', NOW() - INTERVAL '29 days')::date,
        DATE_TRUNC('day', NOW())::date,
        INTERVAL '1 day'
      ) AS d(day)
      LEFT JOIN daily ON daily.day = d.day
      ORDER BY d.day ASC;
    `, [REVENUE_STATUSES]);

    // Recent orders and operational health
    const recentOrdersQuery = client.query(`
      SELECT id, full_name, total_amount, status, payment_method, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 8;
    `);

    const statusBreakdownQuery = client.query(`
      SELECT
        status,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount), 0)::numeric AS revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status
      ORDER BY count DESC;
    `);

    const paymentBreakdownQuery = client.query(`
      SELECT
        COALESCE(NULLIF(TRIM(payment_method), ''), 'UNKNOWN') AS method,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount), 0)::numeric AS revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY COALESCE(NULLIF(TRIM(payment_method), ''), 'UNKNOWN')
      ORDER BY count DESC;
    `);

    const topProductsQuery = client.query(`
      SELECT
        oi.product_name,
        SUM(oi.quantity)::int AS units,
        COALESCE(SUM(oi.price_paid * oi.quantity), 0)::numeric AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = ANY($1::text[])
        AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY oi.product_name
      ORDER BY units DESC, revenue DESC
      LIMIT 5;
    `, [REVENUE_STATUSES]);
    
    const lowStockQuery = client.query(`
        SELECT p.name, pv.color_name, s.size, s.stock_quantity
        FROM stock_keeping_units s
        JOIN product_variants pv ON s.variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        WHERE s.stock_quantity > 0 AND s.stock_quantity < 10
        ORDER BY s.stock_quantity ASC
        LIMIT 8;
    `);

    const outOfStockCountQuery = client.query(`
      SELECT COUNT(*)::int AS "outOfStockCount"
      FROM stock_keeping_units
      WHERE stock_quantity <= 0;
    `);

    const pendingOrdersQuery = client.query(`
      SELECT COUNT(*)::int AS "pendingOrders"
      FROM orders
      WHERE status = 'PENDING';
    `);

    const cancelledOrdersQuery = client.query(`
      SELECT COUNT(*)::int AS "cancelledLast7d"
      FROM orders
      WHERE status = 'CANCELLED'
        AND created_at >= NOW() - INTERVAL '7 days';
    `);

    const [
      currentKpiResult,
      previousKpiResult,
      currentCustomersResult,
      previousCustomersResult,
      salesDataResult,
      recentOrdersResult,
      statusBreakdownResult,
      paymentBreakdownResult,
      topProductsResult,
      lowStockResult,
      outOfStockCountResult,
      pendingOrdersResult,
      cancelledOrdersResult,
    ] = await Promise.all([
      safeQuery(currentKpiQuery, [{ totalRevenue: 0, totalSales: 0 }], 'currentKpiQuery'),
      safeQuery(previousKpiQuery, [{ totalRevenue: 0, totalSales: 0 }], 'previousKpiQuery'),
      safeQuery(currentCustomersQuery, [{ newCustomers: 0 }], 'currentCustomersQuery'),
      safeQuery(previousCustomersQuery, [{ newCustomers: 0 }], 'previousCustomersQuery'),
      safeQuery(salesDataQuery, [], 'salesDataQuery'),
      safeQuery(recentOrdersQuery, [], 'recentOrdersQuery'),
      safeQuery(statusBreakdownQuery, [], 'statusBreakdownQuery'),
      safeQuery(paymentBreakdownQuery, [], 'paymentBreakdownQuery'),
      safeQuery(topProductsQuery, [], 'topProductsQuery'),
      safeQuery(lowStockQuery, [], 'lowStockQuery'),
      safeQuery(outOfStockCountQuery, [{ outOfStockCount: 0 }], 'outOfStockCountQuery'),
      safeQuery(pendingOrdersQuery, [{ pendingOrders: 0 }], 'pendingOrdersQuery'),
      safeQuery(cancelledOrdersQuery, [{ cancelledLast7d: 0 }], 'cancelledOrdersQuery'),
    ]);

    const currentKpi = currentKpiResult.rows[0] || { totalRevenue: 0, totalSales: 0 };
    const previousKpi = previousKpiResult.rows[0] || { totalRevenue: 0, totalSales: 0 };
    const currentCustomers = currentCustomersResult.rows[0] || { newCustomers: 0 };
    const previousCustomers = previousCustomersResult.rows[0] || { newCustomers: 0 };

    const totalRevenue = toSafeNumber(currentKpi.totalRevenue);
    const totalSales = toSafeNumber(currentKpi.totalSales);
    const previousRevenue = toSafeNumber(previousKpi.totalRevenue);
    const previousSales = toSafeNumber(previousKpi.totalSales);
    const newCustomers = toSafeNumber(currentCustomers.newCustomers);
    const previousNewCustomers = toSafeNumber(previousCustomers.newCustomers);

    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const previousAov = previousSales > 0 ? previousRevenue / previousSales : 0;

    const dashboardData = {
      kpis: {
        totalRevenue,
        totalSales,
        newCustomers,
        averageOrderValue,
      },
      trends: {
        revenueGrowth: computeGrowth(totalRevenue, previousRevenue),
        salesGrowth: computeGrowth(totalSales, previousSales),
        customerGrowth: computeGrowth(newCustomers, previousNewCustomers),
        aovGrowth: computeGrowth(averageOrderValue, previousAov),
      },
      salesData: salesDataResult.rows.map(r => ({
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: toSafeNumber(r.revenue),
        orders: toSafeNumber(r.orders),
      })),
      recentOrders: recentOrdersResult.rows,
      statusBreakdown: statusBreakdownResult.rows.map((row) => ({
        status: String(row.status || 'UNKNOWN'),
        count: toSafeNumber(row.count),
        revenue: toSafeNumber(row.revenue),
      })),
      paymentBreakdown: paymentBreakdownResult.rows.map((row) => ({
        method: String(row.method || 'UNKNOWN'),
        count: toSafeNumber(row.count),
        revenue: toSafeNumber(row.revenue),
      })),
      topProducts: topProductsResult.rows.map((row) => ({
        productName: String(row.product_name || 'Unknown Product'),
        units: toSafeNumber(row.units),
        revenue: toSafeNumber(row.revenue),
      })),
      lowStockItems: lowStockResult.rows,
      alerts: {
        pendingOrders: toSafeNumber(pendingOrdersResult.rows[0]?.pendingOrders),
        cancelledLast7d: toSafeNumber(cancelledOrdersResult.rows[0]?.cancelledLast7d),
        outOfStockCount: toSafeNumber(outOfStockCountResult.rows[0]?.outOfStockCount),
      },
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error("API Dashboard Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Failed to release DB client in dashboard route:', releaseError);
      }
    }
  }
}