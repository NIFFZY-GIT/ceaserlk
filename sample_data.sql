-- Sample Data for Testing CEASER.LK E-commerce Platform
-- Run this after running database_setup.sql

-- Ensure we have some sample products (if they don't exist)
INSERT INTO products (name, description, price, sale_price, image_url, category_id, is_active) VALUES 
    ('Conquer Tee', 'The Conquer Tee isn''t just a piece of clothing; it''s a mindset. Made from a premium tri-blend fabric, it offers unmatched comfort and durability.', 2999.00, 2499.00, '/images/image.jpg', 1, true),
    ('Victory Hoodie', 'Stay warm and look sharp with our Victory Hoodie. Premium cotton blend with a modern fit.', 4999.00, NULL, '/images/image1.jpg', 1, true),
    ('Champion Shorts', 'Comfortable athletic shorts perfect for workouts or casual wear.', 1999.00, 1499.00, '/images/image.jpg', 2, true)
ON CONFLICT (name) DO NOTHING;

-- Get the product IDs for size insertion
DO $$
DECLARE
    product_id_1 INTEGER;
    product_id_2 INTEGER;
    product_id_3 INTEGER;
BEGIN
    -- Get product IDs
    SELECT id INTO product_id_1 FROM products WHERE name = 'Conquer Tee' LIMIT 1;
    SELECT id INTO product_id_2 FROM products WHERE name = 'Victory Hoodie' LIMIT 1;
    SELECT id INTO product_id_3 FROM products WHERE name = 'Champion Shorts' LIMIT 1;
    
    -- Insert sizes for Conquer Tee
    IF product_id_1 IS NOT NULL THEN
        INSERT INTO product_sizes (product_id, name, stock) VALUES 
            (product_id_1, 'S', 25),
            (product_id_1, 'M', 30),
            (product_id_1, 'L', 20),
            (product_id_1, 'XL', 15),
            (product_id_1, 'XXL', 10)
        ON CONFLICT (product_id, name) DO UPDATE SET stock = EXCLUDED.stock;
    END IF;
    
    -- Insert sizes for Victory Hoodie
    IF product_id_2 IS NOT NULL THEN
        INSERT INTO product_sizes (product_id, name, stock) VALUES 
            (product_id_2, 'S', 15),
            (product_id_2, 'M', 25),
            (product_id_2, 'L', 20),
            (product_id_2, 'XL', 12),
            (product_id_2, 'XXL', 8)
        ON CONFLICT (product_id, name) DO UPDATE SET stock = EXCLUDED.stock;
    END IF;
    
    -- Insert sizes for Champion Shorts
    IF product_id_3 IS NOT NULL THEN
        INSERT INTO product_sizes (product_id, name, stock) VALUES 
            (product_id_3, 'S', 20),
            (product_id_3, 'M', 25),
            (product_id_3, 'L', 18),
            (product_id_3, 'XL', 10),
            (product_id_3, 'XXL', 5)
        ON CONFLICT (product_id, name) DO UPDATE SET stock = EXCLUDED.stock;
    END IF;
END $$;

-- Ensure we have product categories
INSERT INTO categories (name, description) VALUES 
    ('T-Shirts', 'Premium quality t-shirts'),
    ('Hoodies', 'Comfortable hoodies and sweatshirts'),
    ('Shorts', 'Athletic and casual shorts')
ON CONFLICT (name) DO NOTHING;

-- Update products to have correct category IDs
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'T-Shirts' LIMIT 1) WHERE name = 'Conquer Tee';
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Hoodies' LIMIT 1) WHERE name = 'Victory Hoodie';
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Shorts' LIMIT 1) WHERE name = 'Champion Shorts';

-- Display current data
SELECT 'Sample data inserted successfully!' as message;

SELECT 
    p.id,
    p.name,
    p.price,
    p.sale_price,
    COUNT(ps.id) as size_count,
    SUM(ps.stock) as total_stock
FROM products p
LEFT JOIN product_sizes ps ON p.id = ps.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.price, p.sale_price
ORDER BY p.id;

SELECT 'Available Colors:' as info;
SELECT id, name, hex_code FROM product_colors ORDER BY id;
