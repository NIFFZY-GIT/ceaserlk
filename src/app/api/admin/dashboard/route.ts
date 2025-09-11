import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const queryClient = await db.connect();
    try {
      // Total Revenue
      const totalRevenueRes = await queryClient.query(
        `SELECT SUM(total) as totalRevenue FROM "Order" WHERE status = 'COMPLETED'`
      );
      const totalRevenue = totalRevenueRes.rows[0]?.totalrevenue ?? 0;

      // Total Sales
      const totalSalesRes = await queryClient.query(`SELECT COUNT(*) as totalSales FROM "Order"`);
      const totalSales = parseInt(totalSalesRes.rows[0]?.totalsales ?? '0', 10);

      // New Customers (in the last 30 days)
      const newCustomersRes = await queryClient.query(
        `SELECT COUNT(*) as newCustomers FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '30 days'`
      );
      const newCustomers = parseInt(newCustomersRes.rows[0]?.newcustomers ?? '0', 10);

      // Products in Stock
      const productsInStockRes = await queryClient.query(
        `SELECT COUNT(DISTINCT p.product_id) as productsInStock 
         FROM "Product" p 
         JOIN "Variant" v ON p.product_id = v.product_id 
         WHERE v.stock > 0`
      );
      const productsInStock = parseInt(productsInStockRes.rows[0]?.productsinstock ?? '0', 10);

      // Recent Orders
      const recentOrdersRes = await queryClient.query(
        `SELECT o.*, u.first_name, u.last_name 
         FROM "Order" o
         JOIN "User" u ON o.user_id = u.user_id
         ORDER BY o."createdAt" DESC 
         LIMIT 5`
      );
      const recentOrders = recentOrdersRes.rows;

      return NextResponse.json({
        totalRevenue,
        totalSales,
        newCustomers,
        productsInStock,
        recentOrders: recentOrders.map((order) => ({
          id: order.order_id,
          customer: `${order.first_name} ${order.last_name}`,
          date: new Date(order.createdAt).toISOString().split('T')[0],
          amount: `$${Number(order.total).toFixed(2)}`,
          status: order.status,
        })),
      });
    } finally {
      queryClient.release();
    }
  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
