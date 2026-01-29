import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://doublezero:password@localhost:5432/doublezero';

// Create postgres connection
const client = postgres(connectionString);

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export for direct SQL queries if needed
export { client };

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
