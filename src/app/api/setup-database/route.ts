import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
    try {
        // Create the product_images table for variant-specific product images
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS product_images (
                id SERIAL PRIMARY KEY,
                variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
                image_url VARCHAR(500) NOT NULL,
                alt_text VARCHAR(200),
                display_order INTEGER DEFAULT 0,
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create index for faster lookups
            CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON product_images(variant_id);
            CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(variant_id, is_primary);
        `;

        await db.query(createTableQuery);

        return NextResponse.json({ 
            message: 'Database table product_images created successfully',
            success: true 
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to create product_images table:', error);
        return NextResponse.json({ 
            error: 'Failed to create database table',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}