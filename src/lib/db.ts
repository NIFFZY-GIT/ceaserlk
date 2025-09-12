import { Pool } from 'pg';

// Declare pool at a higher scope
let pool: Pool;

// Using a global variable to prevent connection exhaustion during development hot-reloads.
declare const global: {
  pool: Pool;
};

if (process.env.NODE_ENV === 'production') {
  // Production setup
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Necessary for many cloud database providers
    },
  });
} else {
  // Development setup
  if (!global.pool) {
    global.pool = new Pool({
      connectionString: process.env.DATABASE_URL, // Use the variable here!
    });
  }
  pool = global.pool;
}

export const db = pool;