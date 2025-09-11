import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // Import our connection pool
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const name = (formData.get('name') as string) ?? '';
    const description = (formData.get('description') as string) ?? '';
    const price = parseFloat((formData.get('price') as string) ?? '0');
    const salePrice = formData.get('salePrice') ? parseFloat(formData.get('salePrice') as string) : null;
  const colors = JSON.parse((formData.get('colors') as string) ?? '[]') as { id: number; name: string; hex_code: string }[];
  const sizes = JSON.parse((formData.get('sizes') as string) ?? '[]') as { id: number; name: string }[];
    const variants = JSON.parse((formData.get('variants') as string) ?? '[]') as { id: number; imageId: number; colorId: number; sizeId: number; stock: number }[];
    const images = formData.getAll('images') as File[];

    const audioFile = formData.get('audioFile') as File | null;
    let audioUrl: string | null = null;

    // Basic validation
    if (!name || Number.isNaN(price)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Save images to filesystem and remember mapping from index to url
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });

    // We also get temp ids sent alongside each image as imageId_{index}
    const tempImageIds: number[] = [];
    const uploadedImageByTempId: Record<number, string> = {};

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const tempIdStr = formData.get(`imageId_${i}`) as string | null;
      const tempId = tempIdStr ? Number(tempIdStr) : Date.now() + i;
      tempImageIds.push(tempId);

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(image.name);
      const uniqueFilename = `${path.basename(image.name, ext)}-${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      uploadedImageByTempId[tempId] = `/uploads/products/${uniqueFilename}`;
    }

    if (audioFile) {
      const audioUploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      await fs.mkdir(audioUploadDir, { recursive: true });
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(audioFile.name);
      const uniqueFilename = `${path.basename(audioFile.name, ext)}-${uniqueSuffix}${ext}`;
      const filePath = path.join(audioUploadDir, uniqueFilename);
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      audioUrl = `/uploads/audio/${uniqueFilename}`;
    }

    // Start transaction
    await client.query('BEGIN');

    // Insert product
    const productRes = await client.query(
      'INSERT INTO "Product" (name, description, price, "salePrice", "audioUrl") VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, description, price, salePrice, audioUrl]
    );
    const productId: number = productRes.rows[0].id;

    // Insert colors -> map name => id
    const colorNameToId = new Map<string, number>();
    if (colors.length) {
      const colorValues: (string | number)[] = [];
      const placeholders = colors
        .map((c, idx) => {
          const off = idx * 3;
          colorValues.push(c.name, c.hex_code, productId);
          return `($${off + 1}, $${off + 2}, $${off + 3})`;
        })
        .join(', ');
      const colorInsert = await client.query(
        `INSERT INTO "ProductColor" (name, hex_code, "productId") VALUES ${placeholders} RETURNING id, name`,
        colorValues
      );
      for (const row of colorInsert.rows) colorNameToId.set(row.name, row.id);
    }

    // Insert sizes -> map name => id
    const sizeNameToId = new Map<string, number>();
    if (sizes.length) {
      const sizeValues: (string | number)[] = [];
      const placeholders = sizes
        .map((s, idx) => {
          const off = idx * 2;
          sizeValues.push(s.name, productId);
          return `($${off + 1}, $${off + 2})`;
        })
        .join(', ');
      const sizeInsert = await client.query(
        `INSERT INTO "ProductSize" (name, "productId") VALUES ${placeholders} RETURNING id, name`,
        sizeValues
      );
      for (const row of sizeInsert.rows) sizeNameToId.set(row.name, row.id);
    }

    // Insert images (no color link here; variants will carry color)
    const tempIdToImageId = new Map<number, number>();
    if (tempImageIds.length) {
      const imgValues: (string | number)[] = [];
      const placeholders = tempImageIds
        .map((tempId, idx) => {
          const off = idx * 2;
          imgValues.push(uploadedImageByTempId[tempId], productId);
          return `($${off + 1}, $${off + 2})`;
        })
        .join(', ');
      const imgInsert = await client.query(
        `INSERT INTO "ProductImage" (url, "productId") VALUES ${placeholders} RETURNING id, url`,
        imgValues
      );
      // Map by url back to tempId
      const urlToTempId = new Map<string, number>();
      for (const tid of tempImageIds) {
        urlToTempId.set(uploadedImageByTempId[tid], tid);
      }
      for (const row of imgInsert.rows) {
        const tid = urlToTempId.get(row.url);
        if (tid !== undefined) tempIdToImageId.set(tid, row.id);
      }
    }

    // Build id maps from local ids to real ids
    const colorLocalIdToRealId = new Map<number, number>();
    for (const c of colors) {
      const real = colorNameToId.get(c.name);
      if (real) colorLocalIdToRealId.set(c.id, real);
    }
    const sizeLocalIdToRealId = new Map<number, number>();
    for (const s of sizes) {
      const real = sizeNameToId.get(s.name);
      if (real) sizeLocalIdToRealId.set(s.id, real);
    }

    // Insert variants
    if (variants.length) {
      const varValues: (number)[] = [];
      const placeholders = variants
        .map((v, idx) => {
          const imageId = tempIdToImageId.get(v.imageId);
          const colorId = colorLocalIdToRealId.get(v.colorId);
          const sizeId = sizeLocalIdToRealId.get(v.sizeId);
          if (!imageId || !colorId || !sizeId) {
            console.error('[ADMIN_CREATE_PRODUCT] Variant mapping failed:', {
              variant: v,
              resolved: { imageId, colorId, sizeId },
              tempImageIds: Array.from(tempIdToImageId.entries()),
              colorLocalMap: Array.from(colorLocalIdToRealId.entries()),
              sizeLocalMap: Array.from(sizeLocalIdToRealId.entries()),
            });
            throw new Error('Invalid variant mapping');
          }
          const off = idx * 5;
          varValues.push(productId, imageId, colorId, sizeId, Math.max(0, Number(v.stock) || 0));
          return `($${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}, $${off + 5})`;
        })
        .join(', ');
      await client.query(
        `INSERT INTO "ProductVariant" ("productId", "imageId", "colorId", "sizeId", stock) VALUES ${placeholders}`,
        varValues
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Product created successfully', productId }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  } finally {
    client.release();
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
  (SELECT COALESCE(SUM(v.stock), 0) FROM "ProductVariant" v WHERE v."productId" = p.id) as total_stock
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

