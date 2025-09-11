const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:admin@localhost:5432/ceaser_db"
  });

  try {
    console.log('Checking existing database schema...');
    
    // Check ProductVariant table existence
    const variantCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ProductVariant'
      );
    `);
    console.log('ProductVariant table exists:', variantCheck.rows[0].exists);
    
    // Check ProductSize columns
    const sizeColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ProductSize'
      ORDER BY column_name;
    `);
    console.log('ProductSize columns:', sizeColumns.rows);
    
    // Check Product columns
    const productColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Product'
      ORDER BY column_name;
    `);
    console.log('Product columns:', productColumns.rows);
    
  } catch (error) {
    console.error('Schema check failed:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
