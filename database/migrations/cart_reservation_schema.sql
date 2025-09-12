-- This script creates the necessary tables and functions for a cart reservation system.

-- Drop existing tables and functions if they exist, for a clean setup.
DROP VIEW IF EXISTS "AvailableStock";
DROP TABLE IF EXISTS "StockReservation";
DROP TABLE IF EXISTS "CartItem";
DROP TABLE IF EXISTS "CartSession";
DROP FUNCTION IF EXISTS cleanup_expired_reservations();

-- CartSession: Stores session information for each user's cart.
CREATE TABLE "CartSession" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(255) UNIQUE NOT NULL,
  "userId" INTEGER, -- Nullable, for guest carts
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT "fk_user"
    FOREIGN KEY("userId") 
    REFERENCES "User"("id")
    ON DELETE SET NULL
);

-- CartItem: Stores items within each cart session.
CREATE TABLE "CartItem" (
  "id" SERIAL PRIMARY KEY,
  "cartSessionId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "colorId" INTEGER NOT NULL,
  "sizeId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "addedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_cart_session"
    FOREIGN KEY("cartSessionId") 
    REFERENCES "CartSession"("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product"
    FOREIGN KEY("productId") 
    REFERENCES "Product"("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_color"
    FOREIGN KEY("colorId") 
    REFERENCES "ProductColor"("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_size"
    FOREIGN KEY("sizeId") 
    REFERENCES "ProductSize"("id")
    ON DELETE CASCADE,
  UNIQUE ("cartSessionId", "productId", "colorId", "sizeId")
);

-- StockReservation: Temporarily holds stock for items in carts.
CREATE TABLE "StockReservation" (
  "id" SERIAL PRIMARY KEY,
  "cartItemId" INTEGER NOT NULL,
  "sizeId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reservedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_cart_item"
    FOREIGN KEY("cartItemId") 
    REFERENCES "CartItem"("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_size"
    FOREIGN KEY("sizeId") 
    REFERENCES "ProductSize"("id")
    ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX "idx_cart_session_id" ON "CartSession"("sessionId");
CREATE INDEX "idx_cart_item_session" ON "CartItem"("cartSessionId");
CREATE INDEX "idx_stock_reservation_item" ON "StockReservation"("cartItemId");

-- Function to clean up expired reservations and restore stock.
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS TRIGGER AS $$
DECLARE
    reservation RECORD;
BEGIN
    FOR reservation IN
        SELECT sr."sizeId", sr.quantity
        FROM "StockReservation" sr
        JOIN "CartItem" ci ON sr."cartItemId" = ci.id
        JOIN "CartSession" cs ON ci."cartSessionId" = cs.id
        WHERE cs."expiresAt" < CURRENT_TIMESTAMP
    LOOP
        -- Restore stock for the expired reservation
        UPDATE "ProductSize"
        SET stock = stock + reservation.quantity
        WHERE id = reservation."sizeId";
    END LOOP;

    -- Delete the expired reservations and cart items
    DELETE FROM "StockReservation"
    WHERE "cartItemId" IN (
        SELECT ci.id
        FROM "CartItem" ci
        JOIN "CartSession" cs ON ci."cartSessionId" = cs.id
        WHERE cs."expiresAt" < CURRENT_TIMESTAMP
    );

    DELETE FROM "CartItem"
    WHERE "cartSessionId" IN (
        SELECT id FROM "CartSession" WHERE "expiresAt" < CURRENT_TIMESTAMP
    );

    -- Finally, delete the expired cart sessions
    DELETE FROM "CartSession"
    WHERE "expiresAt" < CURRENT_TIMESTAMP;

    RETURN NULL; -- For trigger, but can be called directly
END;
$$ LANGUAGE plpgsql;

-- AvailableStock View: Calculates available stock by subtracting reserved stock.
CREATE OR REPLACE VIEW "AvailableStock" AS
SELECT 
    ps.id as "sizeId",
    ps."productId",
    ps.stock - COALESCE(SUM(sr.quantity), 0) as "availableStock"
FROM "ProductSize" ps
LEFT JOIN "StockReservation" sr ON ps.id = sr."sizeId"
GROUP BY ps.id;

-- Trigger to automatically clean up before new inserts on CartItem
CREATE TRIGGER before_insert_cart_item_trigger
BEFORE INSERT ON "CartItem"
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_reservations();

-- You can also call this function periodically or at the start of certain operations.
-- SELECT cleanup_expired_reservations();
