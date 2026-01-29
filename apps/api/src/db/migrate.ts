import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './index.js';

async function runMigrations() {
  console.log('🔄 Running migrations...');
  
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  
  console.log('✅ Migrations complete!');
  await client.end();
}

runMigrations()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
