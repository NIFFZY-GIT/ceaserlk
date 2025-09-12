import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// ... (keep checkAdminAuth function) ...

// --- UPDATED Payload Type ---
type VariantPayload = {
  id: number;
  colorName: string;
  colorHex: string; // <-- NEW
  price: string;
  compareAtPrice: string; // <-- NEW
  sku: string;
  images: string[];
  sizes: { size: string; stock: number }[];
  thumbnailImageName: string | null; // <-- NEW
};

export async function GET(request: Request) {
    // You should have admin authentication here
    // For now, we'll assume the user is an admin

    try {
        const query = `
            SELECT
                p.id,
                p.name,
                p.is_published,
                p.created_at,
                COUNT(DISTINCT pv.id) AS variant_count,
                COALESCE(SUM(sku.stock_quantity), 0) AS total_stock
            FROM
                products p
            LEFT JOIN
                product_variants pv ON p.id = pv.product_id
            LEFT JOIN
                stock_keeping_units sku ON pv.id = sku.variant_id
            GROUP BY
                p.id, p.name, p.is_published, p.created_at
            ORDER BY
                p.created_at DESC;
        `;
        const result = await db.query(query);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('API GET PRODUCTS ERROR:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // ... (keep auth check) ...
    const client = await db.connect();

    try {
        const formData = await request.formData();
        const productName = formData.get('productName') as string;
        const description = formData.get('description') as string;
        const variantsString = formData.get('variants') as string;
        
        // ... (keep validation) ...
        const variants: VariantPayload[] = JSON.parse(variantsString);

        await client.query('BEGIN');

        const productResult = await client.query(
            'INSERT INTO products (name, description, is_published) VALUES ($1, $2, $3) RETURNING id',
            [productName, description, true]
        );
        const productId = productResult.rows[0].id;

        for (const variant of variants) {
            // --- UPDATED Variant Insertion ---
            // We insert null for thumbnail_url initially and update it later
            const compareAtPriceValue = variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null;

            const variantResult = await client.query(
                `INSERT INTO product_variants 
                    (product_id, color_name, color_hex_code, price, compare_at_price, sku) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [
                    productId, 
                    variant.colorName, 
                    variant.colorHex, 
                    parseFloat(variant.price), 
                    compareAtPriceValue, // <-- NEW
                    variant.sku || null
                ]
            );
            const variantId = variantResult.rows[0].id;
            let thumbnailUrl: string | null = null; // Variable to hold the thumbnail URL

            // Handle Image Uploads
            const imageFiles = formData.getAll(`images_variant_${variant.id}`) as File[];
            for (const imageFile of imageFiles) {
                // ... (file saving logic is the same) ...
                const buffer = Buffer.from(await imageFile.arrayBuffer());
                const filename = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
                const uploadDir = path.join(process.cwd(), 'public/uploads/products');
                await fs.mkdir(uploadDir, { recursive: true });
                await fs.writeFile(path.join(uploadDir, filename), buffer);
                const imageUrl = `/uploads/products/${filename}`;

                // --- NEW: Check if this image is the designated thumbnail ---
                if (imageFile.name === variant.thumbnailImageName) {
                    thumbnailUrl = imageUrl;
                }

                await client.query(
                    'INSERT INTO variant_images (variant_id, image_url, alt_text) VALUES ($1, $2, $3)',
                    [variantId, imageUrl, `${productName} - ${variant.colorName}`]
                );
            }

            // --- NEW: After uploading all images, update the variant with its thumbnail ---
            if (thumbnailUrl) {
                await client.query(
                    'UPDATE product_variants SET thumbnail_url = $1 WHERE id = $2',
                    [thumbnailUrl, variantId]
                );
            }

            // Handle Sizes (no change needed here as the DB column is now VARCHAR)
            for (const sizeStock of variant.sizes) {
                await client.query(
                    'INSERT INTO stock_keeping_units (variant_id, size, stock_quantity) VALUES ($1, $2, $3)',
                    [variantId, sizeStock.size, sizeStock.stock]
                );
            }
        }

        await client.query('COMMIT');
        return NextResponse.json({ message: 'Product created successfully', productId }, { status: 201 });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to create product:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        client.release();
    }
}