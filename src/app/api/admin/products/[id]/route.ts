import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// --- NEW: GET A SINGLE PRODUCT ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.shipping_cost,
        p.is_published,
        (
          SELECT json_agg(variants_agg)
          FROM (
            SELECT
              pv.id,
              pv.color_name AS "colorName",
              pv.color_hex_code AS "colorHex",
              pv.price,
              pv.compare_at_price AS "compareAtPrice",
              pv.sku,
              pv.thumbnail_url AS "thumbnailUrl",
              (
                SELECT json_agg(images_agg)
                FROM (
                  SELECT
                    vi.id,
                    vi.image_url AS "imageUrl",
                    vi.alt_text AS "altText"
                  FROM variant_images vi
                  WHERE vi.variant_id = pv.id
                ) AS images_agg
              ) AS images,
              (
                SELECT json_agg(sizes_agg)
                FROM (
                  SELECT
                    sku.id,
                    sku.size,
                    sku.stock_quantity AS "stock"
                  FROM stock_keeping_units sku
                  WHERE sku.variant_id = pv.id
                ) AS sizes_agg
              ) AS sizes
            FROM product_variants pv
            WHERE pv.product_id = p.id
          ) AS variants_agg
        ) AS variants
      FROM products p
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // The query returns null for variants if there are none, so we default to an empty array
    const product = result.rows[0];
    product.variants = product.variants || [];

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error('API GET PRODUCT BY ID ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// --- NEW: UPDATE (PUT) A SINGLE PRODUCT ---
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const formData = await request.formData();
    
    // --- Parse all data from the form ---
    const productName = formData.get('productName') as string;
    const description = formData.get('description') as string;
    const shippingCost = formData.get('shippingCost') as string;
    
    // Debug logging to see what we received
    console.log('DEBUG - Form Data Received:', {
      productName,
      description,
      shippingCost,
      allKeys: Array.from(formData.keys()),
    });
    
    // Validate required fields
    if (!productName || productName.trim() === '') {
      console.log('DEBUG - Product name validation failed:', productName);
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    
    const variantsToDelete = JSON.parse(formData.get('variantsToDelete') as string || '[]');
    const imagesToDelete = JSON.parse(formData.get('imagesToDelete') as string || '[]');
    const sizesToDelete = JSON.parse(formData.get('sizesToDelete') as string || '[]');
    const variants = JSON.parse(formData.get('variants') as string);

    // --- 1. Perform Deletions First ---
    if (imagesToDelete.length > 0) {
      // Also delete the actual files from storage
      const { rows } = await client.query('SELECT image_url FROM variant_images WHERE id = ANY($1::uuid[])', [imagesToDelete]);
      for (const row of rows) {
          const filePath = path.join(process.cwd(), 'public', row.image_url);
          try { await fs.unlink(filePath); } catch (e) { console.error(`Failed to delete file: ${filePath}`, e); }
      }
      await client.query('DELETE FROM variant_images WHERE id = ANY($1::uuid[])', [imagesToDelete]);
    }
    if (sizesToDelete.length > 0) {
      await client.query('DELETE FROM stock_keeping_units WHERE id = ANY($1::uuid[])', [sizesToDelete]);
    }
    if (variantsToDelete.length > 0) {
      await client.query('DELETE FROM product_variants WHERE id = ANY($1::uuid[])', [variantsToDelete]);
    }

    // --- 2. Update the Base Product ---
    await client.query(
      'UPDATE products SET name = $1, description = $2, shipping_cost = $3 WHERE id = $4',
      [productName, description, parseFloat(shippingCost) || 0, productId]
    );

    // --- 3. Reconcile Variants, Images, and Sizes ---
    for (const variant of variants) {
      let variantId = variant.id;
      let thumbnailUrl: string | null = variant.thumbnailImageUrl; // Start with the existing one

      // A) Handle Variant (INSERT or UPDATE)
      if (variant.id.startsWith('temp_')) {
        const res = await client.query(`INSERT INTO product_variants (product_id, color_name, color_hex_code, price, compare_at_price, sku) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [productId, variant.colorName, variant.colorHex, variant.price, variant.compareAtPrice || null, variant.sku || null]);
        variantId = res.rows[0].id;
      } else {
        await client.query(`UPDATE product_variants SET color_name = $1, color_hex_code = $2, price = $3, compare_at_price = $4, sku = $5 WHERE id = $6`, [variant.colorName, variant.colorHex, variant.price, variant.compareAtPrice || null, variant.sku || null, variantId]);
      }
      
      // B) Handle Images for this variant
      for (const image of variant.images) {
        if (!image.id) { // This is a new file to upload
          const imageFile = formData.get(`image_${variant.id}_${image.name}`) as File;
          if (imageFile) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const filename = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
            const uploadPath = path.join(process.cwd(), 'public/uploads/products', filename);
            await fs.writeFile(uploadPath, buffer);
            const imageUrl = `/uploads/products/${filename}`;
            
            await client.query('INSERT INTO variant_images (variant_id, image_url, alt_text) VALUES ($1, $2, $3)', [variantId, imageUrl, productName]);
            if (image.name === variant.thumbnailImageName) thumbnailUrl = imageUrl;
          }
        }
      }
      
      // C) Update the thumbnail URL for the variant after all images are processed
      await client.query('UPDATE product_variants SET thumbnail_url = $1 WHERE id = $2', [thumbnailUrl, variantId]);

      // D) Handle Sizes for this variant (INSERT or UPDATE)
      for (const size of variant.sizes) {
        if (size.id.startsWith('temp_')) {
          await client.query('INSERT INTO stock_keeping_units (variant_id, size, stock_quantity) VALUES ($1, $2, $3)', [variantId, size.size, size.stock]);
        } else {
          await client.query('UPDATE stock_keeping_units SET size = $1, stock_quantity = $2 WHERE id = $3', [size.size, size.stock, size.id]);
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Product updated successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`API UPDATE PRODUCT (ID: ${productId}) ERROR:`, error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Add your admin authentication check here
  
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    // Because of 'ON DELETE CASCADE' in our SQL schema, deleting a product
    // will automatically delete all its associated product_variants,
    // variant_images, and stock_keeping_units. This is incredibly powerful.
    const result = await db.query(
        'DELETE FROM products WHERE id = $1 RETURNING *', 
        [id]
    );

    if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('API DELETE PRODUCT ERROR:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}