import { pgTable, serial, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Team table (persists across seasons)
export const team = pgTable('team', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id'), // FK added in league.ts
  activeSeasonId: integer('active_season_id'), // FK added in league.ts - team's working season
  name: varchar('name', { length: 100 }).notNull(),
  shortName: varchar('short_name', { length: 20 }),
  primaryColor: varchar('primary_color', { length: 20 }),
  secondaryColor: varchar('secondary_color', { length: 20 }),
  icon: text('icon'), // Base64 or URL
  iconMime: varchar('icon_mime', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Locker Room table (season-specific team workspace)
// Each team gets a new locker room each season
export const lockerRoom = pgTable('locker_room', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => team.id, { onDelete: 'cascade' }),
  seasonId: integer('season_id').notNull(), // FK added in league.ts
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations - league and season relations added in league.ts to avoid circular imports
export const teamRelations = relations(team, ({ many }) => ({
  lockerRooms: many(lockerRoom),
}));

export const lockerRoomRelations = relations(lockerRoom, ({ one }) => ({
  team: one(team, {
    fields: [lockerRoom.teamId],
    references: [team.id],
  }),
  // season relation added in league.ts
}));
