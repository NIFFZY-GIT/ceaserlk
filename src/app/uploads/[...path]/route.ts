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

  // Try multiple base paths for standalone compatibility
  const basePaths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'uploads'),
  ];

  let fileBuffer: Buffer | null = null;
  let foundPath = '';

  for (const basePath of basePaths) {
    const filePath = path.join(/*turbopackIgnore: true*/ basePath, ...safeSegments);
    try {
      fileBuffer = await fs.readFile(filePath);
      foundPath = filePath;
      break;
    } catch {
      // Try next path
      continue;
    }
  }

  if (!fileBuffer) {
    const searchedPaths = basePaths.map((basePath) => path.join(/*turbopackIgnore: true*/ basePath, ...safeSegments));
    console.error('File not found in any uploads path:', safeSegments.join('/'));
    console.error('Searched paths:', searchedPaths);
    return NextResponse.json({ 
      error: 'File not found',
      searched: searchedPaths,
    }, { status: 404 });
  }

  const extension = path.extname(foundPath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';

  return new Response(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export const runtime = 'nodejs';
