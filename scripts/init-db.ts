import dotenv from 'dotenv';
dotenv.config();

import { runMigrations } from '../src/database/migrations';
import { closePool } from '../src/database/database';

async function main(): Promise<void> {
  console.log('Initializing database...');
  try {
    await runMigrations();
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
