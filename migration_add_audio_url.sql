-- Migration: Add audioUrl column to Product table
-- Run this SQL command in your PostgreSQL database to add audio support

-- Add audioUrl column to Product table
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "audioUrl" TEXT NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN "Product"."audioUrl" IS 'URL path to the product audio file (optional)';
