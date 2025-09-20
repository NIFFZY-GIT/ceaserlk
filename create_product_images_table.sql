-- Create product_images table to store multiple images per product
-- Run this SQL in your PostgreSQL database

CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url character varying(255) NOT NULL,
    alt_text character varying(255),
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT product_images_pkey PRIMARY KEY (id),
    CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images USING btree (display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON public.product_images USING btree (is_primary) WHERE is_primary = true;

-- Add a unique constraint to ensure only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_primary_unique ON public.product_images (product_id) WHERE is_primary = true;

-- Set proper ownership
ALTER TABLE public.product_images OWNER TO postgres;

-- Add comments to explain the table purpose
COMMENT ON TABLE public.product_images IS 'Stores multiple images for products (general product images, not variant-specific)';
COMMENT ON COLUMN public.product_images.is_primary IS 'Indicates if this is the main/featured image for the product';
COMMENT ON COLUMN public.product_images.display_order IS 'Order in which images should be displayed (0 = first)';

-- Test query to verify the table was created successfully
-- SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'product_images' ORDER BY ordinal_position;