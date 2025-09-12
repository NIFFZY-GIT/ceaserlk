import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

// Interface definitions
interface ProductSize {
  id: number;
  name: string;
  stock: number;
}

// =================================================================
// HANDLER FOR: GET /api/admin/products/[id]
// Fetches detailed data for a single product to populate the edit form.
// =================================================================
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);

    // Simple query to fetch product and related data
    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p."salePrice",
        p."audioUrl",
        -- Aggregate associated colors into a JSON array
        (SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name, 'hex_code', pc.hex_code)), '[]')
         FROM "ProductColor" pc WHERE pc."productId" = p.id) as colors,
        -- Aggregate associated sizes into a JSON array
        (SELECT COALESCE(json_agg(json_build_object('id', ps.id, 'name', ps.name, 'stock', ps.stock)), '[]')
         FROM "ProductSize" ps WHERE ps."productId" = p.id) as sizes,
        -- Aggregate associated images into a JSON array
        (SELECT COALESCE(json_agg(json_build_object('id', pi.id, 'url', pi.url, 'colorId', pi."colorId")), '[]')
         FROM "ProductImage" pi WHERE pi."productId" = p.id) as images
      FROM "Product" p
      WHERE p.id = $1;
    `;
    
    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const productRow = result.rows[0];

    // The frontend expects a simple { sizeName: stock } object for the inventory form.
    const stock = productRow.sizes.reduce((acc: Record<string, number>, size: ProductSize) => {
      acc[size.name] = size.stock;
      return acc;
    }, {});

    const productData = {
      name: productRow.name,
      description: productRow.description,
      price: parseFloat(productRow.price),
      salePrice: productRow.salePrice ? parseFloat(productRow.salePrice) : null,
      audioUrl: productRow.audioUrl || null,
      colors: productRow.colors,
      sizes: productRow.sizes, // Keep the full size object for name and id
      images: productRow.images,
      stock: stock,
    };

    return NextResponse.json(productData);

  } catch (error) {
    const { id } = await context.params;
    console.error(`[API_GET_PRODUCT_${id}_ERROR]`, error);
    return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 });
  }
}

// =================================================================
// HANDLER FOR: PATCH /api/admin/products/[id]
// Updates a product's details.
// =================================================================
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);

    // 1. PARSE THE MULTIPART FORMDATA
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const salePrice = formData.get('salePrice') ? parseFloat(formData.get('salePrice') as string) : null;
    const colors = JSON.parse(formData.get('colors') as string) as { id?: number; name: string; hex_code: string }[];
    const sizes = JSON.parse(formData.get('sizes') as string) as { id?: number; name: string }[];
    const stock = JSON.parse(formData.get('stock') as string) as { [key: string]: string };
    const imagesToDelete = JSON.parse(formData.get('imagesToDelete') as string) as number[];
    const existingImages = JSON.parse(formData.get('existingImages') as string) as { id: number; colorId: string }[];
    const newImageMetadata = JSON.parse(formData.get('newImageMetadata') as string) as { originalName: string; colorId: number | null }[];
    const newImages = formData.getAll('newImages') as File[];

    // NEW: Get the audio file
    const audioFile = formData.get('audioFile') as File | null;
    let audioUrl: string | null = null;

    // 2. HANDLE AUDIO FILE UPLOAD
    if (audioFile) {
      const audioUploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      await fs.mkdir(audioUploadDir, { recursive: true });
      
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileExtension = path.extname(audioFile.name);
      const uniqueFilename = `${path.basename(audioFile.name, fileExtension)}-${uniqueSuffix}${fileExtension}`;
      const filePath = path.join(audioUploadDir, uniqueFilename);
      
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      
      audioUrl = `/uploads/audio/${uniqueFilename}`;
    }

    // 3. HANDLE NEW IMAGE UPLOADS
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });
    const uploadedImageUrls: string[] = [];

    for (const image of newImages) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileExtension = path.extname(image.name);
      const uniqueFilename = `${path.basename(image.name, fileExtension)}-${uniqueSuffix}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      uploadedImageUrls.push(`/uploads/products/${uniqueFilename}`);
    }

    // 4. DATABASE UPDATES WITHIN A TRANSACTION
    await client.query('BEGIN');

    // Step A: Update the main product
    const productUpdateQuery = `
      UPDATE "Product" 
      SET name = $1, description = $2, price = $3, "salePrice" = $4${audioUrl ? ', "audioUrl" = $5' : ''}
      WHERE id = ${audioUrl ? '$6' : '$5'}
    `;
    const productParams = audioUrl 
      ? [name, description, price, salePrice, audioUrl, productId]
      : [name, description, price, salePrice, productId];
    
    await client.query(productUpdateQuery, productParams);

    // Step B: Update colors - Delete existing and insert new ones
    await client.query('DELETE FROM "ProductColor" WHERE "productId" = $1', [productId]);
    
    const colorNameToIdMap = new Map<string, number>();
    for (const color of colors) {
      const colorQuery = `
        INSERT INTO "ProductColor" (name, hex_code, "productId") 
        VALUES ($1, $2, $3) 
        RETURNING id;
      `;
      const colorResult = await client.query(colorQuery, [color.name, color.hex_code, productId]);
      colorNameToIdMap.set(color.name, colorResult.rows[0].id);
    }

    // Step C: Update sizes - Delete existing and insert new ones
    await client.query('DELETE FROM "ProductSize" WHERE "productId" = $1', [productId]);
    
    for (const size of sizes) {
      const stockValue = parseInt(stock[size.name] || '0', 10);
      const sizeQuery = `
        INSERT INTO "ProductSize" (name, stock, "productId") 
        VALUES ($1, $2, $3);
      `;
      await client.query(sizeQuery, [size.name, stockValue, productId]);
    }

    // Step D: Handle image deletions
    if (imagesToDelete.length > 0) {
      // Get file paths for cleanup
      const imagesToDeleteQuery = `
        SELECT url FROM "ProductImage" 
        WHERE id = ANY($1) AND "productId" = $2
      `;
      const imagesToDeleteResult = await client.query(imagesToDeleteQuery, [imagesToDelete, productId]);
      
      // Delete from database
      await client.query('DELETE FROM "ProductImage" WHERE id = ANY($1) AND "productId" = $2', [imagesToDelete, productId]);
      
      // Delete physical files
      for (const row of imagesToDeleteResult.rows) {
        try {
          const filePath = path.join(process.cwd(), 'public', row.url);
          await fs.unlink(filePath);
        } catch (fileError) {
          console.error('Failed to delete file:', fileError);
          // Continue even if file deletion fails
        }
      }
    }

    // Step E: Update existing images (color links)
    for (const existingImage of existingImages) {
      let colorId: number | null = null;
      
      if (existingImage.colorId) {
        // Find the color name for this colorId from the original colors
        const originalColorId = parseInt(existingImage.colorId);
        const matchingColor = colors.find(c => c.id === originalColorId);
        
        if (matchingColor) {
          // Use the new colorId from our map
          colorId = colorNameToIdMap.get(matchingColor.name) || null;
        }
      }
      
      await client.query(
        'UPDATE "ProductImage" SET "colorId" = $1 WHERE id = $2 AND "productId" = $3',
        [colorId, existingImage.id, productId]
      );
    }

    // Step F: Insert new images
    for (let i = 0; i < uploadedImageUrls.length; i++) {
      const metadata = newImageMetadata[i];
      const imageUrl = uploadedImageUrls[i];
      
      let colorId: number | null = metadata.colorId;
      
      // If colorId is provided but doesn't exist in our new color map, try to map it
      if (metadata.colorId && !Array.from(colorNameToIdMap.values()).includes(metadata.colorId)) {
        // Find the color by original ID and get the new ID
        const matchingColor = colors.find(c => c.id === metadata.colorId);
        if (matchingColor) {
          colorId = colorNameToIdMap.get(matchingColor.name) || null;
        } else {
          colorId = null; // Reset to null if we can't find a match
        }
      }
      
      const imageQuery = `
        INSERT INTO "ProductImage" (url, "colorId", "productId") 
        VALUES ($1, $2, $3);
      `;
      await client.query(imageQuery, [imageUrl, colorId, productId]);
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: 'Product updated successfully',
      productId: productId 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  } finally {
    client.release();
  }
}

// =================================================================
// HANDLER FOR: DELETE /api/admin/products/[id]
// Deletes a product and all its associated data.
// =================================================================
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);

    // Start transaction
    await client.query('BEGIN');

    // First, get all file URLs that need to be deleted
    const fileQuery = `
      SELECT 
        pi.url as image_url,
        p."audioUrl" as audio_url
      FROM "Product" p
      LEFT JOIN "ProductImage" pi ON pi."productId" = p.id
      WHERE p.id = $1
    `;
    const fileResult = await client.query(fileQuery, [productId]);
    
    // Check if product exists
    if (fileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Collect all file paths to delete
    const filesToDelete: string[] = [];
    fileResult.rows.forEach(row => {
      if (row.image_url) {
        filesToDelete.push(row.image_url);
      }
      if (row.audio_url && !filesToDelete.includes(row.audio_url)) {
        filesToDelete.push(row.audio_url);
      }
    });

    // Delete related data (due to foreign key constraints, delete in correct order)
    
    // 1. Delete product images
    await client.query('DELETE FROM "ProductImage" WHERE "productId" = $1', [productId]);
    
    // 2. Delete product sizes
    await client.query('DELETE FROM "ProductSize" WHERE "productId" = $1', [productId]);
    
    // 3. Delete product colors
    await client.query('DELETE FROM "ProductColor" WHERE "productId" = $1', [productId]);
    
    // 4. Delete the product itself
    const deleteResult = await client.query('DELETE FROM "Product" WHERE id = $1', [productId]);
    
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Commit the transaction
    await client.query('COMMIT');

    // Delete physical files (do this after successful database deletion)
    for (const filePath of filesToDelete) {
      try {
        const fullPath = path.join(process.cwd(), 'public', filePath);
        await fs.unlink(fullPath);
        console.log(`Deleted file: ${fullPath}`);
      } catch (fileError) {
        console.error(`Failed to delete file ${filePath}:`, fileError);
        // Continue even if file deletion fails - the database cleanup was successful
      }
    }

    return NextResponse.json({ 
      message: 'Product deleted successfully',
      deletedProductId: productId 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  } finally {
    client.release();
  }
}