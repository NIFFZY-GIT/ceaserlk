const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from .env.local
const pool = new Pool({
  host: 'localhost',
  user: 'postgres', 
  password: 'admin',
  database: 'ceaser_db',
  port: 5432,
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up database...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'schema_full.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing schema...');
    await client.query(schemaSQL);
    
    console.log('✅ Schema executed successfully!');
    
    // Check what tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });
    
    // Check orders count
    const ordersCount = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log(`\n📦 Orders in database: ${ordersCount.rows[0].count}`);
    
    console.log('\n🎉 Database setup complete!');
    console.log('💡 You can now:');
    console.log('   1. Go through the checkout process to create test orders');
    console.log('   2. Visit /admin/orders to see the orders list');
    console.log('   3. Click on individual orders to see their details');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();