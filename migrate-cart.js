const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    const migration = fs.readFileSync('./database_cart_reservation_system.sql', 'utf8');
    console.log('Running cart reservation system migration...');
    
    // Execute the entire migration as a single transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration);
      await client.query('COMMIT');
      console.log('Migration completed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
