import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all orders for the admin dashboard
export async function GET() {
  // TODO: Re-enable admin authentication after testing
  // In a real app, you would verify admin authentication here
  try {
    const query = `
      SELECT
        o.id,
        o.created_at,
        o.full_name,
        o.total_amount,
        o.status,
        COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;
    
    const { rows } = await db.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ API GET Orders Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: "Failed to fetch orders", details: errorMessage }, { status: 500 });
  }
}

// DELETE all orders - Admin bulk deletion
export async function DELETE() {
  // TODO: Re-enable admin authentication after testing
  // In a real app, you would verify admin authentication here
  try {
    // TEMPORARY: BYPASS AUTH FOR TESTING - REMOVE IN PRODUCTION
    /*
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    */

    console.log('🗑️ Starting bulk deletion of all orders...');
    
    // Start a transaction to ensure data consistency
    await db.query('BEGIN');

    // First, count how many orders will be deleted
    const countResult = await db.query('SELECT COUNT(*) as total FROM orders');
    const totalOrders = parseInt(countResult.rows[0].total);

    if (totalOrders === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json({ 
        message: "No orders to delete", 
        deletedCount: 0 
      });
    }

    // Delete all order items first (foreign key constraint)
    const deletedItemsResult = await db.query('DELETE FROM order_items RETURNING id');
    const deletedItemsCount = deletedItemsResult.rows.length;

    // Then delete all orders
    const deletedOrdersResult = await db.query('DELETE FROM orders RETURNING id');
    const deletedOrdersCount = deletedOrdersResult.rows.length;

    await db.query('COMMIT');
    
    console.log(`✅ Successfully deleted ${deletedOrdersCount} orders and ${deletedItemsCount} order items`);
    
    return NextResponse.json({ 
      message: "All orders deleted successfully", 
      deletedOrdersCount: deletedOrdersCount,
      deletedItemsCount: deletedItemsCount
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("❌ API DELETE All Orders Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: "Failed to delete all orders", 
      details: errorMessage 
    }, { status: 500 });
  }
}