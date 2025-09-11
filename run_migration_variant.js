const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:admin@localhost:5432/ceaser_db"
  });

  try {
    console.log('Starting database migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database_migration_variant_system.sql'), 
      'utf8'
    );
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
