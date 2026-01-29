import { pgTable, serial, varchar, text, boolean, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team, lockerRoom } from './team';

// League table
export const league = pgTable('league', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  governingBody: varchar('governing_body', { length: 100 }),
  activeSeasonId: integer('active_season_id'), // FK to season - set when league advances to new season
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Season table
export const season = pgTable('season', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').notNull().references(() => league.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const leagueRelations = relations(league, ({ one, many }) => ({
  seasons: many(season),
  activeSeason: one(season, {
    fields: [league.activeSeasonId],
    references: [season.id],
  }),
  teams: many(team),
}));

export const seasonRelations = relations(season, ({ one, many }) => ({
  league: one(league, {
    fields: [season.leagueId],
    references: [league.id],
  }),
  lockerRooms: many(lockerRoom),
}));
