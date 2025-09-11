import { Pool } from 'pg';

let pool: Pool | undefined;

if (!pool) {
  // Try to use DATABASE_URL first, then fall back to individual parameters
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  } else {
    // Fallback to individual connection parameters
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ceaser_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin',
    });
  }
  
  // Test the connection
  pool.on('connect', () => {
    console.log('✅ Database connection established');
  });
  
  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
  });
}

export default pool as Pool;