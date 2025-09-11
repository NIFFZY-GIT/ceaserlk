const { Pool } = require('pg');

async function checkVariantSchema() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:admin@localhost:5432/ceaser_db"
  });

  try {
    // Check ProductVariant columns
    const variantColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ProductVariant'
      ORDER BY column_name;
    `);
    console.log('ProductVariant columns:', variantColumns.rows);
    
  } catch (error) {
    console.error('Schema check failed:', error);
  } finally {
    await pool.end();
  }
}

checkVariantSchema();
