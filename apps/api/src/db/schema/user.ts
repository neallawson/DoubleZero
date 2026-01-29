import { pgTable, serial, varchar, boolean, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team } from './team';

// App-level roles enum
export const appRoleEnum = pgEnum('app_role', ['ADMIN', 'USER']);

// User table (authentication)
export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User role assignments
export const userRole = pgTable('user_role', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: appRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Session table (Better-Auth managed, but we reference it)
// Note: Better-Auth creates this table; we define it here for FK references
export const session = pgTable('session', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User session state - stores per-session preferences like active team
// Separate from Better-Auth's session table to avoid touching their schema
export const userSessionState = pgTable('user_session_state', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique().references(() => session.id, { onDelete: 'cascade' }),
  activeTeamId: integer('active_team_id').references(() => team.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
  roles: many(userRole),
  sessions: many(session),
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
  state: one(userSessionState),
}));

export const userSessionStateRelations = relations(userSessionState, ({ one }) => ({
  session: one(session, {
    fields: [userSessionState.sessionId],
    references: [session.id],
  }),
  activeTeam: one(team, {
    fields: [userSessionState.activeTeamId],
    references: [team.id],
  }),
}));
