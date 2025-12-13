// Run PayHere migration
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/ceasar_db'
});

const migration = `
-- Drop and recreate table with correct types
DROP TABLE IF EXISTS pending_payhere_orders;

-- Table to store pending PayHere orders until webhook confirms payment
CREATE TABLE pending_payhere_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    cart_id VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'LKR',
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    subtotal DECIMAL(10, 2),
    shipping_cost DECIMAL(10, 2),
    hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    processed_order_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_payhere_order_id ON pending_payhere_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payhere_user_id ON pending_payhere_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payhere_status ON pending_payhere_orders(status);

-- Add PayHere columns to orders table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payhere_order_id') THEN
        ALTER TABLE orders ADD COLUMN payhere_order_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payhere_payment_id') THEN
        ALTER TABLE orders ADD COLUMN payhere_payment_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'PAYHERE';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payhere_order_id ON orders(payhere_order_id);
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running PayHere migration...');
    await client.query(migration);
    console.log('✅ PayHere migration completed successfully!');
    
    // Verify table was created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'pending_payhere_orders'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table pending_payhere_orders exists');
    } else {
      console.log('❌ Table pending_payhere_orders was NOT created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
