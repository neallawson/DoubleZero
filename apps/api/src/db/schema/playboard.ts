import { pgTable, serial, varchar, text, boolean, integer, timestamp, real, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user';
import { team } from './team';
import { teamMember } from './roster';

// Annotation type enum
export const annotationTypeEnum = pgEnum('annotation_type', [
  'LINE',
  'ARROW',
  'DASHED_LINE',
  'DASHED_ARROW',
]);

// Field template table (different pitch sizes, age groups)
export const fieldTemplate = pgTable('field_template', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  lengthMeters: real('length_meters').notNull().default(100),  // FIFA: 100-110m
  widthMeters: real('width_meters').notNull().default(64),     // FIFA: 64-75m
  originPosition: varchar('origin_position', { length: 20 }).notNull().default('center'),
  markings: jsonb('markings'),  // JSON for field markings configuration
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Play table (main entity for tactical diagrams)
export const play = pgTable('play', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').notNull().references(() => user.id),
  teamId: integer('team_id').references(() => team.id),
  sandboxId: integer('sandbox_id'),  // FK added in sandbox.ts - if set, play is private to owning sandbox
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  tags: text('tags').array(),  // PostgreSQL text array for tags
  fieldTemplateId: integer('field_template_id').references(() => fieldTemplate.id),
  // Viewport state (persisted for consistent viewing)
  viewportZoom: real('viewport_zoom').default(1),
  viewportPanX: real('viewport_pan_x').default(0),
  viewportPanY: real('viewport_pan_y').default(0),
  // Sync tracking for offline-first
  clientId: varchar('client_id', { length: 100 }),  // UUID from client for conflict resolution
  lastSyncedAt: timestamp('last_synced_at'),
  // Standard fields
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Play player table (player positions on a play)
export const playPlayer = pgTable('play_player', {
  id: serial('id').primaryKey(),
  playId: integer('play_id').notNull().references(() => play.id, { onDelete: 'cascade' }),
  teamMemberId: integer('team_member_id').references(() => teamMember.id),
  // Position in world coordinates (meters from origin)
  xMeters: real('x_meters').notNull(),
  yMeters: real('y_meters').notNull(),
  // Display overrides (optional - defaults come from teamMember)
  displayNumber: integer('display_number'),
  displayName: varchar('display_name', { length: 50 }),
  teamColorOverride: varchar('team_color_override', { length: 20 }),
  // Which team this player represents (0 = home/own team, 1 = opponent)
  teamSide: integer('team_side').default(0).notNull(),
  // Layer ordering
  zIndex: integer('z_index').default(0).notNull(),
  version: integer('version').default(0).notNull(),
});

// Play annotation table (lines, arrows, shapes)
export const playAnnotation = pgTable('play_annotation', {
  id: serial('id').primaryKey(),
  playId: integer('play_id').notNull().references(() => play.id, { onDelete: 'cascade' }),
  annotationType: annotationTypeEnum('annotation_type').notNull(),
  // Coordinates in world space (meters)
  startX: real('start_x').notNull(),
  startY: real('start_y').notNull(),
  endX: real('end_x').notNull(),
  endY: real('end_y').notNull(),
  // Style
  color: varchar('color', { length: 20 }).default('#ffffff'),
  strokeWidth: real('stroke_width').default(2),
  // Layer ordering
  zIndex: integer('z_index').default(0).notNull(),
  version: integer('version').default(0).notNull(),
});

// Relations
export const fieldTemplateRelations = relations(fieldTemplate, ({ many }) => ({
  plays: many(play),
}));

export const playRelations = relations(play, ({ one, many }) => ({
  owner: one(user, { fields: [play.ownerId], references: [user.id] }),
  team: one(team, { fields: [play.teamId], references: [team.id] }),
  fieldTemplate: one(fieldTemplate, { fields: [play.fieldTemplateId], references: [fieldTemplate.id] }),
  players: many(playPlayer),
  annotations: many(playAnnotation),
}));

export const playPlayerRelations = relations(playPlayer, ({ one }) => ({
  play: one(play, { fields: [playPlayer.playId], references: [play.id] }),
  teamMember: one(teamMember, { fields: [playPlayer.teamMemberId], references: [teamMember.id] }),
}));

export const playAnnotationRelations = relations(playAnnotation, ({ one }) => ({
  play: one(play, { fields: [playAnnotation.playId], references: [play.id] }),
}));
