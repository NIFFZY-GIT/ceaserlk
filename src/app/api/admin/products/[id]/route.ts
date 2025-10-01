import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// Type definitions for the data sent from frontend
type ThumbnailSelectionPayload =
  | { kind: 'existing'; mediaId: string }
  | { kind: 'file'; fileName: string }
  | { kind: 'url'; url: string };

type VariantUpdateData = {
  id: string;
  colorName: string;
  colorHex: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  thumbnailSelection: ThumbnailSelectionPayload | null;
  existingMediaIds: string[];
  newMediaDescriptors: Array<{ formKey: string; originalName: string }>;
  sizes: { id: string; size: string; stock: number; }[];
};

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
        p.audio_url,
        p.shipping_cost,
        p.trading_card_image,
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
    const audioFile = formData.get('audioFile') as File | null;
    const removeAudio = formData.get('removeAudio') === 'true';
    const tradingCardFile = formData.get('tradingCardFile') as File | null;
    const removeTradingCard = formData.get('removeTradingCard') === 'true';
    
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
  const mediaToDelete = JSON.parse(formData.get('mediaToDelete') as string || '[]');
    const sizesToDelete = JSON.parse(formData.get('sizesToDelete') as string || '[]');
    const variants: VariantUpdateData[] = JSON.parse(formData.get('variants') as string);

    // Debug logging for variants structure
    console.log('DEBUG - Parsed variants:', JSON.stringify(variants, null, 2));

    // --- 1. Perform Deletions First ---
    if (mediaToDelete.length > 0) {
      // Also delete the actual files from storage
      const { rows } = await client.query('SELECT image_url FROM variant_images WHERE id = ANY($1::uuid[])', [mediaToDelete]);
      for (const row of rows) {
          const filePath = path.join(process.cwd(), 'public', row.image_url);
          try { await fs.unlink(filePath); } catch (e) { console.error(`Failed to delete file: ${filePath}`, e); }
      }
      await client.query('DELETE FROM variant_images WHERE id = ANY($1::uuid[])', [mediaToDelete]);
    }
    if (sizesToDelete.length > 0) {
      await client.query('DELETE FROM stock_keeping_units WHERE id = ANY($1::uuid[])', [sizesToDelete]);
    }
    if (variantsToDelete.length > 0) {
      await client.query('DELETE FROM product_variants WHERE id = ANY($1::uuid[])', [variantsToDelete]);
    }

    // --- 2. Handle Audio File Upload ---
    let audioUrl: string | null = null;
    let shouldUpdateAudio = false;

    // Get the current product to check if there's an existing audio file
    const currentProduct = await client.query('SELECT audio_url, trading_card_image FROM products WHERE id = $1', [productId]);
    const oldAudioUrl = currentProduct.rows[0]?.audio_url;
    const oldTradingCardImage = currentProduct.rows[0]?.trading_card_image;

    if (removeAudio && oldAudioUrl) {
      // Remove existing audio file
      const oldFilePath = path.join(process.cwd(), 'public', oldAudioUrl);
      try {
        await fs.unlink(oldFilePath);
      } catch (e) {
        console.error(`Failed to delete old audio file: ${oldFilePath}`, e);
      }
      audioUrl = null;
      shouldUpdateAudio = true;
    } else if (audioFile && audioFile.size > 0) {
      // Delete old audio file if it exists when replacing with new one
      if (oldAudioUrl) {
        const oldFilePath = path.join(process.cwd(), 'public', oldAudioUrl);
        try {
          await fs.unlink(oldFilePath);
        } catch (e) {
          console.error(`Failed to delete old audio file: ${oldFilePath}`, e);
        }
      }
      
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const filename = `${Date.now()}-${audioFile.name.replace(/\s+/g, '-')}`;
      const uploadPath = path.join(process.cwd(), 'public/uploads/audio', filename);
      
      // Ensure the audio directory exists
      const audioDir = path.join(process.cwd(), 'public/uploads/audio');
      await fs.mkdir(audioDir, { recursive: true });
      
      await fs.writeFile(uploadPath, buffer);
      audioUrl = `/uploads/audio/${filename}`;
      shouldUpdateAudio = true;
    }

    // --- 2.5. Handle Trading Card Image Upload ---
    let tradingCardImageUrl: string | null = null;
    let shouldUpdateTradingCard = false;

    if (removeTradingCard && oldTradingCardImage) {
      // Remove existing trading card image
      const oldFilePath = path.join(process.cwd(), 'public', oldTradingCardImage);
      try {
        await fs.unlink(oldFilePath);
      } catch (e) {
        console.error(`Failed to delete old trading card image: ${oldFilePath}`, e);
      }
      tradingCardImageUrl = null;
      shouldUpdateTradingCard = true;
    } else if (tradingCardFile && tradingCardFile.size > 0) {
      // Delete old trading card image if it exists when replacing with new one
      if (oldTradingCardImage) {
        const oldFilePath = path.join(process.cwd(), 'public', oldTradingCardImage);
        try {
          await fs.unlink(oldFilePath);
        } catch (e) {
          console.error(`Failed to delete old trading card image: ${oldFilePath}`, e);
        }
      }
      
      const buffer = Buffer.from(await tradingCardFile.arrayBuffer());
      const filename = `${Date.now()}-${tradingCardFile.name.replace(/\s+/g, '-')}`;
      const uploadPath = path.join(process.cwd(), 'public/uploads/trading-cards', filename);
      
      // Ensure the trading card directory exists
      const tradingCardDir = path.join(process.cwd(), 'public/uploads/trading-cards');
      await fs.mkdir(tradingCardDir, { recursive: true });
      
      await fs.writeFile(uploadPath, buffer);
      tradingCardImageUrl = `/uploads/trading-cards/${filename}`;
      shouldUpdateTradingCard = true;
    }

    // --- 3. Update the Base Product ---
    if (shouldUpdateAudio && shouldUpdateTradingCard) {
      await client.query(
        'UPDATE products SET name = $1, description = $2, shipping_cost = $3, audio_url = $4, trading_card_image = $5 WHERE id = $6',
        [productName, description, parseFloat(shippingCost) || 0, audioUrl, tradingCardImageUrl, productId]
      );
    } else if (shouldUpdateAudio) {
      await client.query(
        'UPDATE products SET name = $1, description = $2, shipping_cost = $3, audio_url = $4 WHERE id = $5',
        [productName, description, parseFloat(shippingCost) || 0, audioUrl, productId]
      );
    } else if (shouldUpdateTradingCard) {
      await client.query(
        'UPDATE products SET name = $1, description = $2, shipping_cost = $3, trading_card_image = $4 WHERE id = $5',
        [productName, description, parseFloat(shippingCost) || 0, tradingCardImageUrl, productId]
      );
    } else {
      await client.query(
        'UPDATE products SET name = $1, description = $2, shipping_cost = $3 WHERE id = $4',
        [productName, description, parseFloat(shippingCost) || 0, productId]
      );
    }

    // --- 4. Reconcile Variants, Images, and Sizes ---
    for (const variant of variants) {
      let variantId = variant.id;

      if (variant.id.startsWith('temp_')) {
        const res = await client.query(
          `INSERT INTO product_variants (product_id, color_name, color_hex_code, price, compare_at_price, sku)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [productId, variant.colorName, variant.colorHex, variant.price, variant.compareAtPrice || null, variant.sku || null],
        );
        variantId = res.rows[0].id;
      } else {
        await client.query(
          `UPDATE product_variants
             SET color_name = $1,
                 color_hex_code = $2,
                 price = $3,
                 compare_at_price = $4,
                 sku = $5
           WHERE id = $6`,
          [variant.colorName, variant.colorHex, variant.price, variant.compareAtPrice || null, variant.sku || null, variantId],
        );
      }

      const savedMedia: Array<{ id: string; url: string; originalName: string }> = [];

      for (const descriptor of variant.newMediaDescriptors || []) {
        const mediaFile = formData.get(descriptor.formKey) as File | null;
        if (!mediaFile || mediaFile.size === 0) continue;

        const buffer = Buffer.from(await mediaFile.arrayBuffer());
        const filename = `${Date.now()}-${mediaFile.name.replace(/\s+/g, '-')}`;
        const productsDir = path.join(process.cwd(), 'public/uploads/products');
        await fs.mkdir(productsDir, { recursive: true });
        const uploadPath = path.join(productsDir, filename);
        await fs.writeFile(uploadPath, buffer);

        const mediaUrl = `/uploads/products/${filename}`;
        const insertResult = await client.query(
          'INSERT INTO variant_images (variant_id, image_url, alt_text) VALUES ($1, $2, $3) RETURNING id, image_url',
          [variantId, mediaUrl, `${productName} - ${variant.colorName}`],
        );
        savedMedia.push({ id: insertResult.rows[0].id, url: insertResult.rows[0].image_url, originalName: descriptor.originalName });
      }

      let thumbnailUrlToPersist: string | null = null;

      if (variant.thumbnailSelection) {
        switch (variant.thumbnailSelection.kind) {
          case 'existing': {
            const existing = await client.query('SELECT image_url FROM variant_images WHERE id = $1 LIMIT 1', [variant.thumbnailSelection.mediaId]);
            thumbnailUrlToPersist = existing.rows[0]?.image_url ?? null;
            break;
          }
          case 'file': {
            const { fileName } = variant.thumbnailSelection;
            const match = savedMedia.find(media => media.originalName === fileName);
            if (match) {
              thumbnailUrlToPersist = match.url;
            } else if (savedMedia.length > 0) {
              thumbnailUrlToPersist = savedMedia[0].url;
            }
            break;
          }
          case 'url':
            thumbnailUrlToPersist = variant.thumbnailSelection.url || null;
            break;
          default:
            thumbnailUrlToPersist = null;
        }
      } else {
        thumbnailUrlToPersist = null;
      }

      await client.query('UPDATE product_variants SET thumbnail_url = $1 WHERE id = $2', [thumbnailUrlToPersist, variantId]);

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

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // First, get all image paths that need to be deleted from filesystem
    console.log(`🗑️ Fetching images for product ${id} to delete from filesystem...`);
    
    const imagePathsQuery = `
      SELECT 
        vi.image_url as variant_image_url,
        p.audio_url,
        p.trading_card_image
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN variant_images vi ON pv.id = vi.variant_id
      WHERE p.id = $1
    `;
    
    const imagePathsResult = await client.query(imagePathsQuery, [id]);
    const imagesToDelete: string[] = [];
    
    // Collect all image paths
    imagePathsResult.rows.forEach(row => {
      if (row.variant_image_url) {
        imagesToDelete.push(row.variant_image_url);
      }
      if (row.audio_url) {
        imagesToDelete.push(row.audio_url);
      }
      if (row.trading_card_image) {
        imagesToDelete.push(row.trading_card_image);
      }
    });
    
    console.log(`📁 Found ${imagesToDelete.length} files to delete:`, imagesToDelete);
    
    // Delete physical files from filesystem
    for (const imagePath of imagesToDelete) {
      try {
        // Convert URL path to filesystem path
        const filePath = path.join(process.cwd(), 'public', imagePath);
        console.log(`🗑️ Deleting file: ${filePath}`);
        await fs.unlink(filePath);
        console.log(`✅ Deleted: ${imagePath}`);
      } catch (fileError) {
        // Log but don't fail the entire operation if a file doesn't exist
        console.warn(`⚠️ Could not delete file ${imagePath}:`, fileError);
      }
    }
    
    // Now delete from database (CASCADE will handle related records)
    console.log(`🗑️ Deleting product ${id} from database...`);
    const result = await client.query(
        'DELETE FROM products WHERE id = $1 RETURNING *', 
        [id]
    );

    if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully deleted product ${id} and ${imagesToDelete.length} associated files`);
    
    return NextResponse.json({ 
      message: 'Product deleted successfully', 
      deletedFiles: imagesToDelete.length 
    }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('API DELETE PRODUCT ERROR:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  } finally {
    client.release();
  }
}