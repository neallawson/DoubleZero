import { pgTable, serial, varchar, text, boolean, integer, timestamp, date, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team } from './team';
import { season } from './league';
import { location } from './location';
import { person } from './person';
import { teamMember, playerPosition } from './roster';

// Game type lookup
export const gameType = pgTable('game_type', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
});

// Game status lookup
export const gameStatus = pgTable('game_status', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
});

// Official role enum (for referees, line judges, etc.)
export const officialRoleEnum = pgEnum('official_role', [
  'REFEREE',
  'LINE_JUDGE',
  'FOURTH_OFFICIAL',
]);

// Game event type lookup
export const gameEventType = pgTable('game_event_type', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
});

// Game table
export const game = pgTable('game', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').notNull().references(() => season.id),
  locationId: integer('location_id').references(() => location.id),
  sandboxId: integer('sandbox_id'), // FK added in sandbox.ts - if set, game is private to owning sandbox
  gameTypeId: integer('game_type_id').notNull().references(() => gameType.id),
  statusId: integer('status_id').notNull().references(() => gameStatus.id),
  date: date('date').notNull(),
  startTime: varchar('start_time', { length: 10 }),
  endTime: varchar('end_time', { length: 10 }),
  homeTeamId: integer('home_team_id').notNull().references(() => team.id),
  awayTeamId: integer('away_team_id').notNull().references(() => team.id),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  attendance: integer('attendance'),
  weather: varchar('weather', { length: 100 }),
  notes: text('notes'),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Game official - links officials (referees, line judges) to a game
export const gameOfficial = pgTable('game_official', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => game.id, { onDelete: 'cascade' }),
  personId: integer('person_id').notNull().references(() => person.id),
  role: officialRoleEnum('role').notNull(),
  version: integer('version').default(0).notNull(),
});

// Game participant - team members who participated in a game
export const gameParticipant = pgTable('game_participant', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => game.id, { onDelete: 'cascade' }),
  teamMemberId: integer('team_member_id').notNull().references(() => teamMember.id),
  positionId: integer('position_id').references(() => playerPosition.id),
  jerseyNumber: integer('jersey_number'), // Copied from team_member but can be overridden
  isStarter: boolean('is_starter').default(false).notNull(),
  isCaptain: boolean('is_captain').default(false).notNull(),
  minutesPlayed: integer('minutes_played'),
  version: integer('version').default(0).notNull(),
});

// Game event - things that happen during a game
export const gameEvent = pgTable('game_event', {
  id: serial('id').primaryKey(),
  gameParticipantId: integer('game_participant_id').notNull().references(() => gameParticipant.id, { onDelete: 'cascade' }),
  eventTypeId: integer('event_type_id').notNull().references(() => gameEventType.id),
  matchMinute: integer('match_minute'),
  matchSecond: integer('match_second'),
  fieldX: real('field_x'),
  fieldY: real('field_y'),
  notes: text('notes'),
  relatedParticipantId: integer('related_participant_id').references(() => gameParticipant.id),
});

// Relations
export const gameRelations = relations(game, ({ one, many }) => ({
  season: one(season, { fields: [game.seasonId], references: [season.id] }),
  location: one(location, { fields: [game.locationId], references: [location.id] }),
  gameType: one(gameType, { fields: [game.gameTypeId], references: [gameType.id] }),
  status: one(gameStatus, { fields: [game.statusId], references: [gameStatus.id] }),
  homeTeam: one(team, { fields: [game.homeTeamId], references: [team.id] }),
  awayTeam: one(team, { fields: [game.awayTeamId], references: [team.id] }),
  participants: many(gameParticipant),
  officials: many(gameOfficial),
  events: many(gameEvent),
}));

export const gameOfficialRelations = relations(gameOfficial, ({ one }) => ({
  game: one(game, { fields: [gameOfficial.gameId], references: [game.id] }),
  person: one(person, { fields: [gameOfficial.personId], references: [person.id] }),
}));

export const gameParticipantRelations = relations(gameParticipant, ({ one, many }) => ({
  game: one(game, { fields: [gameParticipant.gameId], references: [game.id] }),
  teamMember: one(teamMember, { fields: [gameParticipant.teamMemberId], references: [teamMember.id] }),
  position: one(playerPosition, { fields: [gameParticipant.positionId], references: [playerPosition.id] }),
  events: many(gameEvent),
}));

export const gameEventRelations = relations(gameEvent, ({ one }) => ({
  gameParticipant: one(gameParticipant, { fields: [gameEvent.gameParticipantId], references: [gameParticipant.id] }),
  eventType: one(gameEventType, { fields: [gameEvent.eventTypeId], references: [gameEventType.id] }),
  relatedParticipant: one(gameParticipant, { fields: [gameEvent.relatedParticipantId], references: [gameParticipant.id] }),
}));
