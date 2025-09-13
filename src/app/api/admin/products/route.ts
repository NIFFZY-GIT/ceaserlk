import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// --- (Your verifyAuth function would go here if you add security) ---

type VariantPayload = {
  id: number; colorName: string; colorHex: string; price: string;
  compareAtPrice: string; sku: string; images: string[];
  sizes: { size: string; stock: number }[]; thumbnailImageName: string | null;
};

// GET function for the product list page (remains the same)
export async function GET() {
    try {
        const query = `
            SELECT p.id, p.name, p.shipping_cost, p.is_published, p.created_at,
                   COUNT(DISTINCT pv.id) AS variant_count,
                   COALESCE(SUM(sku.stock_quantity), 0) AS total_stock
            FROM products p
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN stock_keeping_units sku ON pv.id = sku.variant_id
            GROUP BY p.id
            ORDER BY p.created_at DESC;
        `;
        const result = await db.query(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('API GET PRODUCTS ERROR:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

// POST function to create a new product
export async function POST(request: Request) {
    const client = await db.connect();
    try {
        const formData = await request.formData();
        const productName = formData.get('productName') as string;
        const description = formData.get('description') as string;
        const shippingCost = formData.get('shippingCost') as string;
        const variantsString = formData.get('variants') as string;
        
        // --- NEW: Get the audio file ---
        const audioFile = formData.get('audioFile') as File | null;
        let audioUrl: string | null = null;

        if (!productName || !variantsString || shippingCost === null) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }
        
        // --- NEW: Handle audio file upload ---
        if (audioFile) {
            const buffer = Buffer.from(await audioFile.arrayBuffer());
            const filename = `${Date.now()}-${audioFile.name.replace(/\s+/g, '-')}`;
            const uploadDir = path.join(process.cwd(), 'public/uploads/audio');
            
            await fs.mkdir(uploadDir, { recursive: true }); // Ensure directory exists
            await fs.writeFile(path.join(uploadDir, filename), buffer); // Write file
            
            audioUrl = `/uploads/audio/${filename}`; // Public URL to save in DB
        }

        const variants: VariantPayload[] = JSON.parse(variantsString);

        await client.query('BEGIN');

        // --- UPDATE INSERT QUERY to include audio_url ---
        const productResult = await client.query(
            'INSERT INTO products (name, description, shipping_cost, audio_url, is_published) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [productName, description, parseFloat(shippingCost) || 0, audioUrl, true]
        );
        const productId = productResult.rows[0].id;

        for (const variant of variants) {
            const compareAtPriceValue = variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null;
            const variantResult = await client.query(
                `INSERT INTO product_variants (product_id, color_name, color_hex_code, price, compare_at_price, sku) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [productId, variant.colorName, variant.colorHex, parseFloat(variant.price), compareAtPriceValue, variant.sku || null]
            );
            const variantId = variantResult.rows[0].id;
            let thumbnailUrl: string | null = null;

            const imageFiles = formData.getAll(`images_variant_${variant.id}`) as File[];
            for (const imageFile of imageFiles) {
                const buffer = Buffer.from(await imageFile.arrayBuffer());
                const filename = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
                const uploadDir = path.join(process.cwd(), 'public/uploads/products');
                await fs.mkdir(uploadDir, { recursive: true });
                await fs.writeFile(path.join(uploadDir, filename), buffer);
                const imageUrl = `/uploads/products/${filename}`;

                if (imageFile.name === variant.thumbnailImageName) {
                    thumbnailUrl = imageUrl;
                }
                await client.query(
                    'INSERT INTO variant_images (variant_id, image_url, alt_text) VALUES ($1, $2, $3)',
                    [variantId, imageUrl, `${productName} - ${variant.colorName}`]
                );
            }

            if (thumbnailUrl) {
                await client.query('UPDATE product_variants SET thumbnail_url = $1 WHERE id = $2', [thumbnailUrl, variantId]);
            }

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