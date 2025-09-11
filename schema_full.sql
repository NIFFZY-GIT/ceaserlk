-- CeaserLK - Consolidated PostgreSQL schema (clean, app-aligned)
-- Generated on 2025-09-11
-- This script creates all tables, types, functions, views, indexes, and constraints
-- required by the current application code in src/.

BEGIN;

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Helper/enum types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('USER', 'ADMIN');
  END IF;
END $$;

-- 2) Core user/auth tables
CREATE TABLE IF NOT EXISTS public.users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  role public.user_role NOT NULL DEFAULT 'USER'
);

-- 3) Catalog: products, colors, sizes, images
CREATE TABLE IF NOT EXISTS public."Product" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  "salePrice" NUMERIC(10,2),
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "audioUrl" VARCHAR(255) NULL
);
COMMENT ON TABLE public."Product" IS 'Stores the core product information.';
COMMENT ON COLUMN public."Product"."audioUrl" IS 'URL for the background audio file on the product page.';

CREATE TABLE IF NOT EXISTS public."ProductColor" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hex_code VARCHAR(7) NOT NULL,
  "productId" INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  UNIQUE ("productId", name)
);
CREATE INDEX IF NOT EXISTS idx_productcolor_productid ON public."ProductColor" ("productId");

CREATE TABLE IF NOT EXISTS public."ProductSize" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  "productId" INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("productId", name)
);
CREATE INDEX IF NOT EXISTS idx_productsize_productid ON public."ProductSize" ("productId");

CREATE TABLE IF NOT EXISTS public."ProductImage" (
  id SERIAL PRIMARY KEY,
  url VARCHAR(255) NOT NULL,
  "productId" INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  "colorId" INTEGER NULL REFERENCES public."ProductColor"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_productimage_productid ON public."ProductImage" ("productId");
CREATE INDEX IF NOT EXISTS idx_productimage_colorid ON public."ProductImage" ("colorId");

-- ProductVariant table for variant-based stock and dashboard queries
CREATE TABLE IF NOT EXISTS public."ProductVariant" (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  "imageId" INTEGER NOT NULL REFERENCES public."ProductImage"(id) ON DELETE CASCADE,
  "colorId" INTEGER NOT NULL REFERENCES public."ProductColor"(id) ON DELETE CASCADE,
  "sizeId" INTEGER NOT NULL REFERENCES public."ProductSize"(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("productId", "imageId", "colorId", "sizeId")
);
CREATE INDEX IF NOT EXISTS idx_product_variant_product ON public."ProductVariant" ("productId");
CREATE INDEX IF NOT EXISTS idx_product_variant_image ON public."ProductVariant" ("imageId");
CREATE INDEX IF NOT EXISTS idx_product_variant_color ON public."ProductVariant" ("colorId");
CREATE INDEX IF NOT EXISTS idx_product_variant_size ON public."ProductVariant" ("sizeId");

-- 4) Cart/session + items
CREATE TABLE IF NOT EXISTS public."Cart" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "sessionId" TEXT UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_session_id ON public."Cart" ("sessionId");

CREATE TABLE IF NOT EXISTS public."CartItem" (
  id SERIAL PRIMARY KEY,
  "cartId" UUID NOT NULL REFERENCES public."Cart"(id) ON DELETE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  "productSizeId" INTEGER NOT NULL REFERENCES public."ProductSize"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  name VARCHAR(255) NOT NULL,
  "sizeName" VARCHAR(50) NOT NULL,
  "colorName" VARCHAR(255) NOT NULL,
  "imageUrl" VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  UNIQUE ("cartId", "productSizeId", "colorName")
);
CREATE INDEX IF NOT EXISTS idx_cartitem_cartid ON public."CartItem" ("cartId");

-- 5) Stock reservations for items in carts
CREATE TABLE IF NOT EXISTS public."StockReservation" (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  "colorId" INTEGER NOT NULL REFERENCES public."ProductColor"(id) ON DELETE CASCADE,
  "sizeId" INTEGER NOT NULL REFERENCES public."ProductSize"(id) ON DELETE CASCADE,
  "cartItemId" INTEGER NOT NULL REFERENCES public."CartItem"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("cartItemId")
);
CREATE INDEX IF NOT EXISTS idx_stock_reservation_expires ON public."StockReservation" ("expiresAt");
CREATE INDEX IF NOT EXISTS idx_stock_reservation_product ON public."StockReservation" ("productId", "colorId", "sizeId");

-- 6) Orders (simple)
CREATE TABLE IF NOT EXISTS public.orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Processing',
  shipping_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE RESTRICT,
  size_name VARCHAR(10) NOT NULL,
  color_name VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC(10,2) NOT NULL
);

-- 7) Wishlist (simple)
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public."Product"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- 8) Functions used by the app
-- Deletes expired reservations and cart sessions; returns count of deleted reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations() RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public."StockReservation" WHERE "expiresAt" < CURRENT_TIMESTAMP;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  DELETE FROM public."Cart" WHERE "expiresAt" < CURRENT_TIMESTAMP;
  RETURN deleted_count;
END;
$$;

-- Reserves stock from ProductSize; returns true on success
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id INTEGER,
  p_color_id   INTEGER,
  p_size_id    INTEGER,
  p_quantity   INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  available_stock INTEGER;
BEGIN
  SELECT stock INTO available_stock FROM public."ProductSize"
  WHERE "productId" = p_product_id AND id = p_size_id
  FOR UPDATE;

  IF available_stock IS NULL OR available_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE public."ProductSize"
  SET stock = stock - p_quantity
  WHERE "productId" = p_product_id AND id = p_size_id;

  RETURN TRUE;
END;
$$;

-- 9) Views
-- Available stock per product/color/size based on ProductSize.stock minus live reservations
CREATE OR REPLACE VIEW public."AvailableStock" AS
SELECT 
  ps."productId",
  pc.id AS "colorId",
  ps.id AS "sizeId",
  pc.name AS "colorName",
  ps.name AS "sizeName",
  ps.stock AS "totalStock",
  COALESCE(SUM(CASE WHEN sr."expiresAt" > CURRENT_TIMESTAMP THEN sr.quantity END), 0) AS "reservedStock",
  (ps.stock - COALESCE(SUM(CASE WHEN sr."expiresAt" > CURRENT_TIMESTAMP THEN sr.quantity END), 0))::INTEGER AS "availableStock"
FROM public."ProductSize" ps
JOIN public."ProductColor" pc ON pc."productId" = ps."productId"
LEFT JOIN public."StockReservation" sr
  ON sr."productId" = ps."productId" AND sr."sizeId" = ps.id AND sr."colorId" = pc.id
GROUP BY ps."productId", pc.id, ps.id, pc.name, ps.name, ps.stock;

-- 10) Compatibility views for legacy tooling expecting lowercase pluralized tables
CREATE OR REPLACE VIEW public.products AS
SELECT 
  p.id           AS product_id,
  p.name         AS name,
  p.description  AS description,
  p.price        AS price,
  p."salePrice" AS sale_price,
  p."createdAt" AS created_at,
  p."updatedAt" AS updated_at
FROM public."Product" p;

COMMIT;

-- Compatibility view for dashboard stats: exposes sessionId in CartItem
CREATE OR REPLACE VIEW public."CartItemWithSession" AS
SELECT ci.*, c."sessionId"
FROM public."CartItem" ci
JOIN public."Cart" c ON ci."cartId" = c.id;
