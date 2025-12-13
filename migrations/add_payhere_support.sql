-- PayHere Integration: Create pending orders table
-- Run this migration to add PayHere payment support

-- Table to store pending PayHere orders until webhook confirms payment
CREATE TABLE IF NOT EXISTS pending_payhere_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,  -- PayHere order ID (e.g., ORD-1234567890-ABC123)
    user_id INTEGER NOT NULL REFERENCES users(id),
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
    hash VARCHAR(64) NOT NULL,  -- PayHere hash for verification
    status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed
    processed_order_id INTEGER REFERENCES orders(id),  -- Reference to actual order after completion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_payhere_order_id ON pending_payhere_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payhere_user_id ON pending_payhere_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payhere_status ON pending_payhere_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_payhere_created ON pending_payhere_orders(created_at);

-- Add PayHere columns to orders table if they don't exist
DO $$ 
BEGIN
    -- Add payhere_order_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payhere_order_id') THEN
        ALTER TABLE orders ADD COLUMN payhere_order_id VARCHAR(100);
    END IF;
    
    -- Add payhere_payment_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payhere_payment_id') THEN
        ALTER TABLE orders ADD COLUMN payhere_payment_id VARCHAR(100);
    END IF;
    
    -- Add payment_method column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'STRIPE';
    END IF;
END $$;

-- Create index on payhere_order_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_orders_payhere_order_id ON orders(payhere_order_id);

-- Cleanup job: Delete old pending orders (older than 24 hours) that weren't completed
-- You can run this periodically via a cron job
-- DELETE FROM pending_payhere_orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours';

COMMENT ON TABLE pending_payhere_orders IS 'Stores pending PayHere payment orders until webhook confirms payment';
COMMENT ON COLUMN pending_payhere_orders.order_id IS 'Unique order ID sent to PayHere';
COMMENT ON COLUMN pending_payhere_orders.hash IS 'PayHere security hash for verification';
COMMENT ON COLUMN pending_payhere_orders.processed_order_id IS 'Reference to orders table after successful payment';
