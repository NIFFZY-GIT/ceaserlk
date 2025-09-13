// Test script to verify database connection
import { db } from './src/lib/db.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time from DB:', result.rows[0].current_time);
    
    // Test users table
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    console.log('✅ Users table accessible!');
    console.log('Total users:', userCount.rows[0].count);
    
    // Test orders table
    const orderCount = await db.query('SELECT COUNT(*) FROM orders');
    console.log('✅ Orders table accessible!');
    console.log('Total orders:', orderCount.rows[0].count);
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Make sure your .env.local file contains the correct DATABASE_URL');
  } finally {
    await db.end();
  }
}

testConnection();