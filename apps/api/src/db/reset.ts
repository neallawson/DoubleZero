import 'dotenv/config';
import { client } from './index.js';

async function resetDatabase() {
  console.log('🗑️  Resetting database...');
  
  // Drop all tables in reverse dependency order
  const dropStatements = [
    'DROP TABLE IF EXISTS audit_log CASCADE',
    'DROP TABLE IF EXISTS audit_settings CASCADE',
    'DROP TABLE IF EXISTS game_event CASCADE',
    'DROP TABLE IF EXISTS game_participant CASCADE',
    'DROP TABLE IF EXISTS game CASCADE',
    'DROP TABLE IF EXISTS game_event_type CASCADE',
    'DROP TABLE IF EXISTS game_role CASCADE',
    'DROP TABLE IF EXISTS game_status CASCADE',
    'DROP TABLE IF EXISTS game_type CASCADE',
    'DROP TABLE IF EXISTS team_roster CASCADE',
    'DROP TABLE IF EXISTS player_position CASCADE',
    'DROP TABLE IF EXISTS roster_role CASCADE',
    'DROP TABLE IF EXISTS location CASCADE',
    'DROP TABLE IF EXISTS person CASCADE',
    'DROP TABLE IF EXISTS team CASCADE',
    'DROP TABLE IF EXISTS locker_room CASCADE',
    'DROP TABLE IF EXISTS season CASCADE',
    'DROP TABLE IF EXISTS league CASCADE',
    'DROP TABLE IF EXISTS user_role CASCADE',
    'DROP TABLE IF EXISTS "user" CASCADE',
    'DROP TYPE IF EXISTS app_role CASCADE',
    'DROP TYPE IF EXISTS roster_role CASCADE',
    'DROP TYPE IF EXISTS game_role CASCADE',
  ];

  for (const sql of dropStatements) {
    await client.unsafe(sql);
  }

  console.log('✅ Database reset complete!');
  console.log('   Run `pnpm db:migrate` and `pnpm db:seed` to recreate.');
  await client.end();
}

resetDatabase()
  .catch((error) => {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  });
