const { Pool } = require('pg');

console.log('Environment check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Using connection string:', process.env.DATABASE_URL);
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test if tables exist
    try {
      const result = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
      console.log('📋 Available tables:', result.rows.map(r => r.tablename));
    } catch (err) {
      console.error('❌ Failed to list tables:', err.message);
    }
    
    // Test specific queries
    try {
      const productCount = await client.query(`SELECT COUNT(*) as product_count FROM "Product"`);
      console.log('✅ Product count query successful:', productCount.rows[0]);
    } catch (err) {
      console.error('❌ Product count query failed:', err.message);
    }
    
    try {
      const variantCount = await client.query(`SELECT COUNT(*) as variant_count, SUM(stock) as total_stock FROM "ProductVariant"`);
      console.log('✅ Variant count query successful:', variantCount.rows[0]);
    } catch (err) {
      console.error('❌ Variant count query failed:', err.message);
    }
    
    try {
      const cartCount = await client.query(`SELECT COUNT(DISTINCT "sessionId") as active_sessions FROM "CartItem"`);
      console.log('✅ Cart count query successful:', cartCount.rows[0]);
    } catch (err) {
      console.error('❌ Cart count query failed:', err.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
    
    // Try alternative connection method
    console.log('\nTrying alternative connection method...');
    try {
      const altPool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'ceaser_db',
        user: 'postgres',
        password: 'admin'
      });
      
      const altClient = await altPool.connect();
      console.log('✅ Alternative connection method successful!');
      
      const result = await altClient.query('SELECT 1 as test');
      console.log('✅ Test query successful:', result.rows[0]);
      
      altClient.release();
      altPool.end();
    } catch (altError) {
      console.error('❌ Alternative connection also failed:', altError.message);
    }
  }
  
  pool.end();
}

testConnection();
