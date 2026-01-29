import { pgTable, serial, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team } from './team';

// Location table - physical places (fields, stadiums)
export const location = pgTable('location', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  address: varchar('address', { length: 200 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zip: varchar('zip', { length: 20 }),
  country: varchar('country', { length: 50 }),
  homeTeamId: integer('home_team_id').references(() => team.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const locationRelations = relations(location, ({ one }) => ({
  homeTeam: one(team, {
    fields: [location.homeTeamId],
    references: [team.id],
  }),
}));
