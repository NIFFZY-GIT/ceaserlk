const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'ceaser_db',
  password: process.env.DATABASE_PASSWORD || 'password',
  port: process.env.DATABASE_PORT || 5432,
});

async function testDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected at:', result.rows[0].now);
    
    // Check if orders table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'order_items', 'users', 'products')
    `);
    
    console.log('\n📋 Existing tables:');
    tableCheck.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });
    
    // Check if orders table exists and has data
    try {
      const ordersCount = await client.query('SELECT COUNT(*) FROM orders');
      console.log('\n📊 Orders count:', ordersCount.rows[0].count);
      
      if (parseInt(ordersCount.rows[0].count) > 0) {
        const sampleOrders = await client.query('SELECT id, full_name, status, created_at FROM orders LIMIT 5');
        console.log('\n📄 Sample orders:');
        sampleOrders.rows.forEach(order => {
          console.log(`  • ${order.id} - ${order.full_name} (${order.status}) - ${order.created_at}`);
        });
      } else {
        console.log('\n⚠️  No orders found in database');
      }
    } catch (error) {
      console.log('\n❌ Orders table does not exist or is inaccessible:', error.message);
    }
    
    // Check order_items table
    try {
      const orderItemsCount = await client.query('SELECT COUNT(*) FROM order_items');
      console.log('\n📦 Order items count:', orderItemsCount.rows[0].count);
    } catch (error) {
      console.log('\n❌ Order items table does not exist:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase();