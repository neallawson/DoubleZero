import { pgTable, serial, varchar, text, boolean, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team } from './team';
import { season } from './league';
import { person } from './person';

// Team permission enum (access control)
export const teamPermissionEnum = pgEnum('team_permission', [
  'ADMIN',   // Full team CRUD
  'MEMBER',  // View everything, limited editing (own profile, participate in forums)
  'VIEWER',  // View public team content only
]);

// Team role lookup table (descriptive labels, not permissions)
export const teamRole = pgTable('team_role', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
});

// Player position lookup table (field positions for players)
export const playerPosition = pgTable('player_position', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  shortName: varchar('short_name', { length: 10 }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
});

// Team member - links person to team for a specific season with permission and optional role
export const teamMember = pgTable('team_member', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => team.id, { onDelete: 'cascade' }),
  personId: integer('person_id').notNull().references(() => person.id, { onDelete: 'cascade' }),
  seasonId: integer('season_id').notNull().references(() => season.id, { onDelete: 'cascade' }),
  permission: teamPermissionEnum('permission').notNull().default('MEMBER'),
  teamRoleId: integer('team_role_id').references(() => teamRole.id),
  positionId: integer('position_id').references(() => playerPosition.id),
  jerseyNumber: integer('jersey_number'),
  title: varchar('title', { length: 100 }), // Freeform: "Assistant Coach", "Team Mom"
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  person: one(person, {
    fields: [teamMember.personId],
    references: [person.id],
  }),
  season: one(season, {
    fields: [teamMember.seasonId],
    references: [season.id],
  }),
  teamRole: one(teamRole, {
    fields: [teamMember.teamRoleId],
    references: [teamRole.id],
  }),
  position: one(playerPosition, {
    fields: [teamMember.positionId],
    references: [playerPosition.id],
  }),
}));
