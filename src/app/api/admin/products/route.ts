import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB cap per submission
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB cap for a single file

class UploadLimitError extends Error {
    status: number;
    payload: { error: string; message: string };

    constructor(status: number, payload: { error: string; message: string }) {
        super(payload.message);
        this.status = status;
        this.payload = payload;
        this.name = 'UploadLimitError';
    }
}

// --- (Your verifyAuth function would go here if you add security) ---

type VariantPayload = {
    id: number; colorName: string; colorHex: string; price: string;
    compareAtPrice: string; sku: string;
    sizes: { size: string; stock: number }[];
    thumbnailImageName: string | null;
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
    console.log('=== Product creation API called ===');
    const client = await db.connect();
    try {
        const formData = await request.formData();
        const productName = formData.get('productName') as string;
        const description = formData.get('description') as string;
        const shippingCost = formData.get('shippingCost') as string;
        const variantsString = formData.get('variants') as string;
        
        let runningSize = 0;

        const registerFile = (file: File | null, label: string) => {
            if (!file) return;
            if (file.size > MAX_FILE_BYTES) {
                throw new UploadLimitError(413, {
                    error: 'UPLOAD_TOO_LARGE',
                    message: `${label} exceeds the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit. Please upload a smaller file.`,
                });
            }
            runningSize += file.size;
            if (runningSize > MAX_UPLOAD_BYTES) {
                throw new UploadLimitError(413, {
                    error: 'TOTAL_UPLOAD_TOO_LARGE',
                    message: `Combined upload exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB. Please remove or compress some media.`,
                });
            }
        };

        // --- NEW: Get the audio file ---
        const audioFile = formData.get('audioFile') as File | null;
        registerFile(audioFile, 'Audio file');
        let audioUrl: string | null = null;

        // --- NEW: Get the trading image file ---
        const tradingImage = formData.get('tradingImage') as File | null;
        registerFile(tradingImage, 'Trading card image');
        let tradingImageUrl: string | null = null;

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

        // --- NEW: Handle trading image upload ---
        if (tradingImage) {
            const buffer = Buffer.from(await tradingImage.arrayBuffer());
            const filename = `${Date.now()}-${tradingImage.name.replace(/\s+/g, '-')}`;
            const uploadDir = path.join(process.cwd(), 'public/uploads/trading-cards');
            
            await fs.mkdir(uploadDir, { recursive: true }); // Ensure directory exists
            await fs.writeFile(path.join(uploadDir, filename), buffer); // Write file
            
            tradingImageUrl = `/uploads/trading-cards/${filename}`; // Public URL to save in DB
        }

    // --- Handle variant-specific product media ---
    // Variant media (images/videos) are posted with keys like: variantMedia_${variant.id}
    // We'll collect them later when processing each variant

        const variantMediaKeys = Array.from(new Set(Array.from(formData.keys()).filter(key => key.startsWith('variantMedia_'))));
        for (const key of variantMediaKeys) {
            const files = formData.getAll(key) as File[];
            files.forEach(file => registerFile(file, `Variant media (${key})`));
        }

        const variants: VariantPayload[] = JSON.parse(variantsString);
        
        // Debug: Log the received variants to check color data
        console.log('Received variants:', variants.map(v => ({ 
            id: v.id, 
            colorName: v.colorName, 
            colorHex: v.colorHex 
        })));

        await client.query('BEGIN');

        const productResult = await client.query(
            'INSERT INTO products (name, description, shipping_cost, audio_url, trading_card_image, is_published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [productName, description, parseFloat(shippingCost) || 0, audioUrl, tradingImageUrl, true]
        );
        const productId = productResult.rows[0].id;

        for (const variant of variants) {
            const compareAtPriceValue = variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null;
            
            // Debug: Log the data being inserted
            console.log('Inserting variant:', {
                productId,
                colorName: variant.colorName,
                colorHex: variant.colorHex,
                price: parseFloat(variant.price)
            });
            
            const variantResult = await client.query(
                `INSERT INTO product_variants (product_id, color_name, color_hex_code, price, compare_at_price, sku) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [productId, variant.colorName, variant.colorHex, parseFloat(variant.price), compareAtPriceValue, variant.sku || null]
            );
            const variantId = variantResult.rows[0].id;

            console.log(`\n🖼️ Processing variant media for variant ${variant.id} (${variant.colorName})`);
            const variantMediaFiles = formData.getAll(`variantMedia_${variant.id}`) as File[];
            console.log(`📁 Found ${variantMediaFiles.length} variant media files`);
            let thumbnailUrl: string | null = null;
            
            for (let index = 0; index < variantMediaFiles.length; index++) {
                const mediaFile = variantMediaFiles[index];
                console.log(`🔄 Processing file ${index + 1}: ${mediaFile.name} (${mediaFile.size} bytes)`);
                
                if (mediaFile) {
                    const mimeType = mediaFile.type;
                    if (mimeType && !mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
                        console.warn(`⚠️ Skipping unsupported media type: ${mimeType}`);
                        continue;
                    }
                    try {
                        const buffer = Buffer.from(await mediaFile.arrayBuffer());
                        const sanitizedName = mediaFile.name.replace(/\s+/g, '-');
                        const filename = `${Date.now()}-variant-${index}-${sanitizedName}`;
                        const uploadDir = path.join(process.cwd(), 'public/uploads/products');
                        const fullPath = path.join(uploadDir, filename);
                        
                        console.log(`💾 Saving to: ${fullPath}`);
                        await fs.mkdir(uploadDir, { recursive: true });
                        await fs.writeFile(fullPath, buffer);
                        console.log(`✅ File saved successfully`);
                        
                        const mediaUrl = `/uploads/products/${filename}`;
                        console.log(`📝 Inserting into database: ${mediaUrl}`);
                        
                        await client.query(
                            'INSERT INTO variant_images (variant_id, image_url, alt_text, display_order) VALUES ($1, $2, $3, $4)',
                            [variantId, mediaUrl, `${productName} - ${variant.colorName} - Variant Media ${index + 1}`, index]
                        );

                        if (variant.thumbnailImageName === mediaFile.name || (!variant.thumbnailImageName && index === 0)) {
                            thumbnailUrl = mediaUrl;
                        }
                        
                        console.log(`✅ Database record created`);
                    } catch (error) {
                        console.error(`❌ Error processing media file ${index + 1}:`, error);
                        throw error;
                    }
                }
            }

            if (thumbnailUrl) {
                await client.query(
                    'UPDATE product_variants SET thumbnail_url = $1 WHERE id = $2',
                    [thumbnailUrl, variantId]
                );
            }

            // Handle stock keeping units (sizes)
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
        if (error instanceof UploadLimitError) {
            console.warn('Upload limit exceeded:', error.message);
            return NextResponse.json(error.payload, { status: error.status });
        }
        console.error('Failed to create product:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        client.release();
    }
}

export const runtime = 'nodejs';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '200mb',
        },
    },
    maxDuration: 300,
};