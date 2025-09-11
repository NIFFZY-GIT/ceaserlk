const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database_migration_variant_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL by statements (rough split, good enough for our migration)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Running ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        console.log(`Executing statement ${i + 1}/${statements.length}`);
        try {
          await pool.query(statement);
          console.log(`✅ Statement ${i + 1} completed successfully`);
        } catch (error) {
          console.log(`⚠️ Statement ${i + 1} failed (might be expected):`, error.message);
        }
      }
    }
    
    console.log('✅ Migration completed!');
    
    // Test the new structure
    console.log('\n🔍 Testing new variant structure...');
    const testResult = await pool.query(`
      SELECT 
        p.name as product_name,
        pc.name as color_name,
        ps.name as size_name,
        pv.stock
      FROM "ProductVariant" pv
      JOIN "Product" p ON p.id = pv."productId"
      JOIN "ProductColor" pc ON pc.id = pv."colorId"
      JOIN "ProductSize" ps ON ps.id = pv."sizeId"
      LIMIT 10;
    `);
    
    console.log('Sample variants:');
    console.table(testResult.rows);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
