-- Migration to Product Variant System
-- This migrates from the old ProductSize.stock column to the new ProductVariant table

BEGIN;

-- Step 1: Drop dependent views that reference ProductSize.stock
DROP VIEW IF EXISTS "AvailableStock" CASCADE;

-- Step 2: Create the ProductVariant table
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "imageId" INTEGER NOT NULL REFERENCES "ProductImage"(id) ON DELETE CASCADE,
  "colorId" INTEGER NOT NULL REFERENCES "ProductColor"(id) ON DELETE CASCADE,
  "sizeId" INTEGER NOT NULL REFERENCES "ProductSize"(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique combinations
  UNIQUE("productId", "imageId", "colorId", "sizeId")
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_product_variant_product" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "idx_product_variant_image" ON "ProductVariant"("imageId");
CREATE INDEX IF NOT EXISTS "idx_product_variant_color" ON "ProductVariant"("colorId");
CREATE INDEX IF NOT EXISTS "idx_product_variant_size" ON "ProductVariant"("sizeId");

-- Step 4: Migrate existing stock data (if any exists and if stock column still exists)
-- Check if stock column exists before trying to migrate
DO $$
BEGIN
    -- Check if stock column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductSize' 
        AND column_name = 'stock'
    ) THEN
        -- Migrate existing stock data
        INSERT INTO "ProductVariant" ("productId", "imageId", "colorId", "sizeId", stock)
        SELECT DISTINCT 
            ps."productId",
            (SELECT id FROM "ProductImage" pi WHERE pi."productId" = ps."productId" LIMIT 1) as "imageId",
            (SELECT id FROM "ProductColor" pc WHERE pc."productId" = ps."productId" LIMIT 1) as "colorId",
            ps.id as "sizeId",
            COALESCE(ps.stock, 0) as stock
        FROM "ProductSize" ps
        WHERE ps.stock IS NOT NULL
        AND EXISTS (SELECT 1 FROM "ProductImage" pi WHERE pi."productId" = ps."productId")
        AND EXISTS (SELECT 1 FROM "ProductColor" pc WHERE pc."productId" = ps."productId")
        ON CONFLICT ("productId", "imageId", "colorId", "sizeId") DO NOTHING;
        
        -- Remove the stock column
        ALTER TABLE "ProductSize" DROP COLUMN stock;
        
        RAISE NOTICE 'Stock column found and migrated successfully';
    ELSE
        RAISE NOTICE 'Stock column does not exist, skipping migration step';
    END IF;
END $$;

-- Step 6: Create a new view for available stock (replacement for old AvailableStock view)
CREATE OR REPLACE VIEW "AvailableStock" AS
SELECT 
    pv."productId",
    p.name as "productName",
    ps.name as "sizeName", 
    pc.name as "colorName",
    pi.url as "imageUrl",
    pv.stock,
    pv.id as "variantId"
FROM "ProductVariant" pv
JOIN "Product" p ON pv."productId" = p.id
JOIN "ProductSize" ps ON pv."sizeId" = ps.id
JOIN "ProductColor" pc ON pv."colorId" = pc.id
JOIN "ProductImage" pi ON pv."imageId" = pi.id
WHERE pv.stock > 0;

-- Step 7: Create a view for product variant details
CREATE OR REPLACE VIEW "ProductVariantDetails" AS
SELECT 
    pv.id,
    pv."productId",
    p.name as "productName",
    p.price,
    p."salePrice",
    ps.name as "sizeName",
    pc.name as "colorName",
    pc.hex_code as "colorHex",
    pi.url as "imageUrl",
    pv.stock,
    pv."createdAt",
    pv."updatedAt"
FROM "ProductVariant" pv
JOIN "Product" p ON pv."productId" = p.id
JOIN "ProductSize" ps ON pv."sizeId" = ps.id
JOIN "ProductColor" pc ON pv."colorId" = pc.id
JOIN "ProductImage" pi ON pv."imageId" = pi.id;

-- Step 8: Create trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_product_variant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_variant_timestamp
    BEFORE UPDATE ON "ProductVariant"
    FOR EACH ROW
    EXECUTE FUNCTION update_product_variant_timestamp();

COMMIT;

-- Verify the migration
SELECT 
    'ProductVariant table created' as status,
    COUNT(*) as variant_count
FROM "ProductVariant";

SELECT 
    'ProductSize stock column removed' as status,
    COUNT(*) as size_count
FROM "ProductSize";

SELECT 
    'Views created' as status,
    COUNT(*) as available_stock_count
FROM "AvailableStock";
