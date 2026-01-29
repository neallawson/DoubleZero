import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { user } from './user';

// Audit log table
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: integer('record_id').notNull(),
  operation: varchar('operation', { length: 10 }).notNull(), // INSERT, UPDATE, DELETE
  userId: integer('user_id').references(() => user.id, { onDelete: 'set null' }),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestPath: varchar('request_path', { length: 500 }),
});

// Audit settings table
export const auditSettings = pgTable('audit_settings', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull().unique(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  trackOldValues: boolean('track_old_values').default(true).notNull(),
  trackNewValues: boolean('track_new_values').default(true).notNull(),
  retentionDays: integer('retention_days').default(90),
});
