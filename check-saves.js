/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');

async function checkImageSave() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/ceaser_db',
    });

    try {
        // Check recent variant images only (removed product_images)
        const recentVariantImages = await pool.query(`
            SELECT vi.*, pv.color_name 
            FROM variant_images vi 
            JOIN product_variants pv ON vi.variant_id = pv.id 
            ORDER BY vi.id DESC 
            LIMIT 5
        `);
        console.log('Recent variant images:', recentVariantImages.rows);

        // Check uploads folder
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'public/uploads/products');
        
        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            console.log('Files in uploads/products:', files.slice(-10)); // Show last 10 files
        } else {
            console.log('Upload directory does not exist');
        }

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await pool.end();
    }
}

checkImageSave();