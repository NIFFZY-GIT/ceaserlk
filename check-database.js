const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres', 
  password: 'admin',
  database: 'ceaser_db',
  port: 5432,
});

async function checkAndCreateTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database state...');
    
    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Existing tables:');
    const existingTables = tablesResult.rows.map(row => row.table_name);
    existingTables.forEach(table => {
      console.log('  ✓', table);
    });
    
    // Check if orders table exists
    if (existingTables.includes('orders')) {
      const ordersCount = await client.query('SELECT COUNT(*) as count FROM orders');
      console.log(`\n📦 Orders in database: ${ordersCount.rows[0].count}`);
      
      if (parseInt(ordersCount.rows[0].count) > 0) {
        const sampleOrders = await client.query('SELECT id, full_name, status FROM orders LIMIT 3');
        console.log('\n📄 Sample orders:');
        sampleOrders.rows.forEach(order => {
          console.log(`  • ${order.id} - ${order.full_name} (${order.status})`);
        });
      }
    } else {
      console.log('\n❌ Orders table does not exist - creating it...');
      
      // Create orders table
      await client.query(`
        CREATE TABLE orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_email VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          phone_number VARCHAR(20),
          shipping_address_line1 VARCHAR(500) NOT NULL,
          shipping_address_line2 VARCHAR(500),
          shipping_city VARCHAR(100) NOT NULL,
          shipping_state VARCHAR(100),
          shipping_postal_code VARCHAR(20) NOT NULL,
          shipping_country VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
          subtotal DECIMAL(10, 2) NOT NULL,
          shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
          tax_amount DECIMAL(10, 2) DEFAULT 0,
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_intent_id VARCHAR(255) UNIQUE,
          payment_method VARCHAR(50) DEFAULT 'stripe',
          payment_status VARCHAR(20) DEFAULT 'PENDING',
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          order_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          shipped_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      console.log('✅ Orders table created!');
    }
    
    // Check if order_items table exists
    if (!existingTables.includes('order_items')) {
      console.log('\n❌ Order_items table does not exist - creating it...');
      
      await client.query(`
        CREATE TABLE order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER,
          product_name VARCHAR(255) NOT NULL,
          product_price DECIMAL(10, 2) NOT NULL,
          product_shipping_cost DECIMAL(10, 2) DEFAULT 0,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Order_items table created!');
    }
    
    console.log('\n🎉 Database check complete!');
    
    // Final verification
    const finalTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('orders', 'order_items')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Order-related tables:');
    finalTablesResult.rows.forEach(row => {
      console.log('  ✅', row.table_name);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndCreateTables();