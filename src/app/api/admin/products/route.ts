import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // Import our connection pool
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  const client = await pool.connect(); // Get a client from the pool

  try {
    // 1. PARSE THE MULTIPART FORMDATA (Same as before)
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const salePrice = formData.get('salePrice') ? parseFloat(formData.get('salePrice') as string) : null;
    const colors = JSON.parse(formData.get('colors') as string) as { name: string; hex_code: string }[];
    const sizes = JSON.parse(formData.get('sizes') as string) as string[];
    const stock = JSON.parse(formData.get('stock') as string) as { [key: string]: string };
    const imageMetadata = JSON.parse(formData.get('imageMetadata') as string) as { originalName: string; linkedColorName: string | null }[];
    const images = formData.getAll('images') as File[];

    // NEW: Get the audio file
    const audioFile = formData.get('audioFile') as File | null;
    let audioUrl: string | null = null;

    // 2. SAVE UPLOADED IMAGES TO THE FILESYSTEM (Same as before)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });
    const uploadedFileUrls: { [originalName: string]: string } = {};

    for (const image of images) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileExtension = path.extname(image.name);
      const uniqueFilename = `${path.basename(image.name, fileExtension)}-${uniqueSuffix}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      uploadedFileUrls[image.name] = `/uploads/products/${uniqueFilename}`;
    }

    // NEW: Save the audio file if it exists
    if (audioFile) {
      const audioUploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      await fs.mkdir(audioUploadDir, { recursive: true });
      
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileExtension = path.extname(audioFile.name);
      const uniqueFilename = `${path.basename(audioFile.name, fileExtension)}-${uniqueSuffix}${fileExtension}`;
      const filePath = path.join(audioUploadDir, uniqueFilename);
      
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      
      audioUrl = `/uploads/audio/${uniqueFilename}`; // The public URL
    }

    // 3. DATABASE INSERTION WITHIN A TRANSACTION
    await client.query('BEGIN'); // Start transaction

    // Step A: Insert the main product and get its new ID
    const productQuery = `
      INSERT INTO "Product" (name, description, price, "salePrice", "audioUrl") 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id;
    `;
    const productResult = await client.query(productQuery, [name, description, price, salePrice, audioUrl]);
    const productId = productResult.rows[0].id;

    // Step B: Insert colors and map their names to their new IDs
    const colorNameToIdMap = new Map<string, number>();
    if (colors.length > 0) {
      // First, check if any colors already exist for this product
      const existingColorsQuery = `
        SELECT id, name FROM "ProductColor" 
        WHERE "productId" = $1 AND name = ANY($2)
      `;
      const colorNames = colors.map(c => c.name);
      const existingColors = await client.query(existingColorsQuery, [productId, colorNames]);
      
      if (existingColors.rows.length > 0) {
        const duplicateColorNames = existingColors.rows.map(row => row.name);
        return NextResponse.json({ 
          error: `Color(s) already exist for this product: ${duplicateColorNames.join(', ')}. Please use different color names.` 
        }, { status: 409 });
      }

      // Check for global color conflicts (optional - you might want to allow same color names across products)
      const globalColorCheck = `
        SELECT DISTINCT name FROM "ProductColor" 
        WHERE name = ANY($1)
      `;
      const globalExistingColors = await client.query(globalColorCheck, [colorNames]);
      
      if (globalExistingColors.rows.length > 0) {
        const globalDuplicateColorNames = globalExistingColors.rows.map(row => row.name);
        console.log(`Warning: Color names ${globalDuplicateColorNames.join(', ')} already exist in other products`);
        // You can choose to return an error here or just log a warning
        // For now, we'll allow it and just log the warning
      }

      // Insert new colors
      const colorValues: (string | number)[] = [];
      const colorPlaceholders = colors.map((color, index) => {
        const offset = index * 3;
        colorValues.push(color.name, color.hex_code, productId);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ');

      const colorQuery = `
        INSERT INTO "ProductColor" (name, hex_code, "productId") 
        VALUES ${colorPlaceholders} 
        RETURNING id, name;
      `;
      const colorResult = await client.query(colorQuery, colorValues);
      colorResult.rows.forEach(row => colorNameToIdMap.set(row.name, row.id));
    }

    // Step C: Insert sizes with their stock
    if (sizes.length > 0) {
      const sizeValues: (string | number)[] = [];
      const sizePlaceholders = sizes.map((size, index) => {
          const offset = index * 3;
          sizeValues.push(size, parseInt(stock[size] || '0', 10), productId);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ');
      
      const sizeQuery = `
        INSERT INTO "ProductSize" (name, stock, "productId") 
        VALUES ${sizePlaceholders};
      `;
      await client.query(sizeQuery, sizeValues);
    }
    
    // Step D: Insert images and link them to colors
    if (imageMetadata.length > 0) {
        const imageValues: (string | number | null)[] = [];
        const imagePlaceholders = imageMetadata.map((meta, index) => {
            const offset = index * 3;
            const url = uploadedFileUrls[meta.originalName];
            const colorId = meta.linkedColorName ? colorNameToIdMap.get(meta.linkedColorName) ?? null : null;
            imageValues.push(url, productId, colorId);
            return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        }).join(', ');

        const imageQuery = `
            INSERT INTO "ProductImage" (url, "productId", "colorId") 
            VALUES ${imagePlaceholders};
        `;
        await client.query(imageQuery, imageValues);
    }

    await client.query('COMMIT'); // Commit transaction if all queries succeed

    return NextResponse.json({ 
      message: 'Product created successfully', 
      productId: productId 
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK'); // Roll back transaction on error
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  } finally {
    client.release(); // Release the client back to the pool
  }
}

export async function GET() {
  const client = await pool.connect();
  try {
    const productsQuery = `
      SELECT
        p.id as product_id,
        p.name,
        p.price,
        p."salePrice" as sale_price,
        p."audioUrl" as audio_url,
        (SELECT url FROM "ProductImage" i WHERE i."productId" = p.id LIMIT 1) as image_url,
        (SELECT SUM(stock) FROM "ProductSize" s WHERE s."productId" = p.id) as total_stock
      FROM "Product" p
      ORDER BY p."createdAt" DESC;
    `;
    const result = await client.query(productsQuery);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  } finally {
    client.release();
  }
}

