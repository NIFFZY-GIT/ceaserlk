import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

function sanitizePath(segments: string[] = []): string[] {
  return segments
    .filter(Boolean)
    .map(segment => segment.replace(/\\/g, '/'))
    .map(segment => segment.replace(/\.{2,}/g, ''))
    .map(segment => segment.replace(/[^a-zA-Z0-9._-]/g, ''));
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: paramSegments } = await context.params;
  const safeSegments = sanitizePath(paramSegments);

  if (safeSegments.length === 0) {
    return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', ...safeSegments);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve upload:', filePath, error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export const runtime = 'nodejs';
