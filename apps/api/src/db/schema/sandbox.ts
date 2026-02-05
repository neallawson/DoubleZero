import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team } from './team';
import { game } from './game';
import { league } from './league';
import { location } from './location';
import { person } from './person';

// Sandbox table - represents a private workspace owned by a team
// Entities with sandboxId are only visible to members of the owning team
export const sandbox = pgTable('sandbox', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => team.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const sandboxRelations = relations(sandbox, ({ one, many }) => ({
  // The real team that owns this sandbox
  owningTeam: one(team, {
    fields: [sandbox.teamId],
    references: [team.id],
    relationName: 'ownedSandboxes',
  }),
  // Entities that exist within this sandbox
  sandboxedTeams: many(team, { relationName: 'teamSandbox' }),
  sandboxedGames: many(game, { relationName: 'gameSandbox' }),
  sandboxedLeagues: many(league, { relationName: 'leagueSandbox' }),
  sandboxedLocations: many(location, { relationName: 'locationSandbox' }),
  sandboxedPersons: many(person, { relationName: 'personSandbox' }),
}));

// Extended relations for sandbox (added here to avoid circular imports)
// These connect the sandboxId FK on each entity back to the sandbox table

export const teamSandboxRelations = relations(team, ({ one }) => ({
  sandbox: one(sandbox, {
    fields: [team.sandboxId],
    references: [sandbox.id],
    relationName: 'teamSandbox',
  }),
}));

export const gameSandboxRelations = relations(game, ({ one }) => ({
  sandbox: one(sandbox, {
    fields: [game.sandboxId],
    references: [sandbox.id],
    relationName: 'gameSandbox',
  }),
}));

export const leagueSandboxRelations = relations(league, ({ one }) => ({
  sandbox: one(sandbox, {
    fields: [league.sandboxId],
    references: [sandbox.id],
    relationName: 'leagueSandbox',
  }),
}));

export const locationSandboxRelations = relations(location, ({ one }) => ({
  sandbox: one(sandbox, {
    fields: [location.sandboxId],
    references: [sandbox.id],
    relationName: 'locationSandbox',
  }),
}));

export const personSandboxRelations = relations(person, ({ one }) => ({
  sandbox: one(sandbox, {
    fields: [person.sandboxId],
    references: [sandbox.id],
    relationName: 'personSandbox',
  }),
}));
