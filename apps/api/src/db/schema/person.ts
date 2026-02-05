import { pgTable, serial, varchar, text, boolean, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user';

// Person table (domain identity - players, coaches, parents, etc.)
// A person can belong to multiple teams via team_member table
export const person = pgTable('person', {
  id: serial('id').primaryKey(),
  sandboxId: integer('sandbox_id'), // FK added in sandbox.ts - if set, person is private to owning sandbox
  userId: integer('user_id').unique().references(() => user.id, { onDelete: 'set null' }),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  photo: text('photo'),
  dateOfBirth: date('date_of_birth'),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const personRelations = relations(person, ({ one }) => ({
  user: one(user, {
    fields: [person.userId],
    references: [user.id],
  }),
}));
