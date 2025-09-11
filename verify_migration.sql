-- Simple verification migration to create only what's missing

-- Create cleanup function if it doesn't exist
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only delete if tables exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'StockReservation') THEN
    DELETE FROM "StockReservation" WHERE "expiresAt" < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  ELSE
    deleted_count := 0;
  END IF;
  
  -- Delete expired cart sessions if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CartSession') THEN
    DELETE FROM "CartSession" WHERE "expiresAt" < CURRENT_TIMESTAMP;
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create tables step by step if they don't exist

-- 1. CartSession table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CartSession') THEN
        CREATE TABLE "CartSession" (
          id SERIAL PRIMARY KEY,
          "sessionId" VARCHAR(255) UNIQUE NOT NULL,
          "userId" INTEGER NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created CartSession table';
    ELSE
        RAISE NOTICE 'CartSession table already exists';
    END IF;
END $$;

-- 2. CartItem table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CartItem') THEN
        CREATE TABLE "CartItem" (
          id SERIAL PRIMARY KEY,
          "cartSessionId" INTEGER NOT NULL REFERENCES "CartSession"(id) ON DELETE CASCADE,
          "productId" INTEGER NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
          "colorId" INTEGER NOT NULL REFERENCES "ProductColor"(id) ON DELETE CASCADE,
          "sizeId" INTEGER NOT NULL REFERENCES "ProductSize"(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          "reservedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE("cartSessionId", "productId", "colorId", "sizeId")
        );
        RAISE NOTICE 'Created CartItem table';
    ELSE
        RAISE NOTICE 'CartItem table already exists';
    END IF;
END $$;

-- 3. StockReservation table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'StockReservation') THEN
        CREATE TABLE "StockReservation" (
          id SERIAL PRIMARY KEY,
          "productId" INTEGER NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
          "colorId" INTEGER NOT NULL REFERENCES "ProductColor"(id) ON DELETE CASCADE,
          "sizeId" INTEGER NOT NULL REFERENCES "ProductSize"(id) ON DELETE CASCADE,
          "cartItemId" INTEGER NOT NULL REFERENCES "CartItem"(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE("cartItemId")
        );
        RAISE NOTICE 'Created StockReservation table';
    ELSE
        RAISE NOTICE 'StockReservation table already exists';
    END IF;
END $$;

-- Create available stock view
CREATE OR REPLACE VIEW "AvailableStock" AS
SELECT 
  ps."productId",
  ps.id as "sizeId",
  pc.id as "colorId",
  ps.stock as "actualStock",
  COALESCE(SUM(sr.quantity), 0) as "reservedStock",
  (ps.stock - COALESCE(SUM(sr.quantity), 0)) as "availableStock"
FROM "ProductSize" ps
CROSS JOIN "ProductColor" pc
LEFT JOIN "StockReservation" sr ON (
  sr."productId" = ps."productId" 
  AND sr."sizeId" = ps.id 
  AND sr."colorId" = pc.id 
  AND sr."expiresAt" > CURRENT_TIMESTAMP
)
WHERE pc."productId" = ps."productId"
GROUP BY ps."productId", ps.id, pc.id, ps.stock;
