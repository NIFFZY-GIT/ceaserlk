import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL || 'NOT SET',
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    DB_USER: process.env.DB_USER || 'NOT SET',
    DB_NAME: process.env.DB_NAME || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    envKeys: Object.keys(process.env).filter(key => key.includes('DB') || key.includes('DATABASE')),
  });
}
