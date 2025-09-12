import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const migrationPath = path.join(process.cwd(), 'database_cart_reservation_simple.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Running cart reservation system migration...');
  
  // Execute the migration in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
    return { 
      success: true, 
      message: 'Cart reservation system migration completed successfully!' 
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function GET() {
  try {
    const result = await runMigration();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Migration failed: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await runMigration();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Migration failed: ' + (error as Error).message 
    }, { status: 500 });
  }
}
