import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyAuth } from '@/lib/auth';

// SECURITY: Allowed file extensions and MIME types
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max

// SECURITY: Sanitize filename to prevent path traversal and injection
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const baseName = path.basename(filename);
  // Only allow alphanumeric characters, dashes, underscores, and dots
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '');
}

// SECURITY: Validate file extension
function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// SECURITY: Check magic bytes to verify file type matches claimed MIME type
function validateMagicBytes(buffer: Buffer): boolean {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  // AVIF: Check for ftyp box with avif brand
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.slice(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }

    // SECURITY: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed' }, { status: 400 });
    }

    // SECURITY: Validate file extension
    if (!isAllowedExtension(file.name)) {
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // SECURITY: Validate magic bytes match expected image format
    if (!validateMagicBytes(buffer)) {
      return NextResponse.json({ error: 'File content does not match expected image format' }, { status: 400 });
    }

    // SECURITY: Generate safe filename with sanitization
    const sanitizedOriginalName = sanitizeFilename(file.name);
    const filename = `${Date.now()}-${sanitizedOriginalName}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads/selfies');
    
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/selfies/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });

  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}