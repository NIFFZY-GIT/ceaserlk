import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const migrationPath = path.join(process.cwd(), 'verify_migration.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running verification migration...');
    
    const client = await pool.connect();
    try {
      await client.query(migration);
      console.log('Verification migration completed successfully!');
      
      // Check if tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('CartSession', 'CartItem', 'StockReservation')
        AND table_schema = 'public'
      `;
      const tables = await client.query(tablesQuery);
      
      // Check if function exists
      const functionQuery = `
        SELECT proname 
        FROM pg_proc 
        WHERE proname = 'cleanup_expired_reservations'
      `;
      const functions = await client.query(functionQuery);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Verification completed successfully!',
        tables: tables.rows.map(r => r.table_name),
        functions: functions.rows.map(r => r.proname)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Verification failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Verification failed: ' + (error as Error).message 
    }, { status: 500 });
  }
}
