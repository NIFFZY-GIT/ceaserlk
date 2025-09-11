import { NextResponse, NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const uploadDir = path.join(process.cwd(), "/public/uploads/products");

    // Ensure the destination folder exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Parse the FormData from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    // Create a unique filename to prevent overwriting existing files
    const uniqueFilename = `${Date.now()}-${file.name}`;
    const newPath = path.join(uploadDir, uniqueFilename);
    
    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(newPath, buffer);
    
    // Return the public URL that can be used in an <Image> component
    const publicUrl = `/uploads/products/${uniqueFilename}`;
    return NextResponse.json({ url: publicUrl }, { status: 200 });

  } catch (error: unknown) {
    console.error("File upload API error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}