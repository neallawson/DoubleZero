import { pgTable, serial, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

// App configuration table - key/value store for system-wide settings
export const appConfig = pgTable('app_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
