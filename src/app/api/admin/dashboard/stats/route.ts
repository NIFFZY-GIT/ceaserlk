import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Get basic counts from our actual database schema
    const [
      productsRes,
      variantsRes,
      cartItemsRes
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as product_count FROM "Product"`),
      pool.query(`SELECT COUNT(*) as variant_count, SUM(stock) as total_stock FROM "ProductVariant"`),
  pool.query(`SELECT COUNT(DISTINCT "sessionId") as active_sessions FROM "CartItemWithSession"`)
    ]);

    // Create dashboard data with available information
    const dashboardData = {
      totalRevenue: 0, // No orders table yet
      totalSales: 0,   // No orders table yet  
      totalCustomers: parseInt(cartItemsRes.rows[0]?.active_sessions) || 0,
      totalStock: parseInt(variantsRes.rows[0]?.total_stock) || 0,
      totalProducts: parseInt(productsRes.rows[0]?.product_count) || 0,
      totalVariants: parseInt(variantsRes.rows[0]?.variant_count) || 0,
      recentOrders: [], // No orders table yet
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch dashboard statistics.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}