import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema } from '../common';

// Roster Role (domain role for team membership)
export const RosterRoleNameSchema = z.enum([
  'OWNER',
  'HEAD_COACH',
  'COACH',
  'MANAGER',
  'PLAYER',
  'PARENT',
]);
export type RosterRoleName = z.infer<typeof RosterRoleNameSchema>;

export const RosterRoleSchema = z.object({
  id: IdSchema,
  name: RosterRoleNameSchema,
  description: z.string().max(200).nullable(),
  isActive: z.boolean().default(true),
});

// Player Position lookup
export const PlayerPositionSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  shortName: z.string().max(10).nullable(),
  description: z.string().max(200).nullable(),
  isActive: z.boolean().default(true),
});

// Team Roster entry
export const TeamRosterSchema = z.object({
  id: IdSchema,
  teamId: IdSchema,
  seasonId: IdSchema,
  personId: IdSchema,
  rosterRoleId: IdSchema,
  positionId: IdSchema.nullable(),
  jerseyNumber: z.number().int().min(0).max(99).nullable(),
  isCaptain: z.boolean().default(false),
  joinedAt: z.date().nullable(),
  leftAt: z.date().nullable(),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const TeamRosterCreateSchema = z.object({
  teamId: IdSchema,
  seasonId: IdSchema,
  personId: IdSchema,
  rosterRoleId: IdSchema,
  positionId: IdSchema.nullable().optional(),
  jerseyNumber: z.number().int().min(0).max(99).nullable().optional(),
  isCaptain: z.boolean().optional(),
  joinedAt: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const TeamRosterPatchSchema = z.object({
  rosterRoleId: IdSchema.optional(),
  positionId: IdSchema.nullable().optional(),
  jerseyNumber: z.number().int().min(0).max(99).nullable().optional(),
  isCaptain: z.boolean().optional(),
  joinedAt: z.date().nullable().optional(),
  leftAt: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Types
export type RosterRole = z.infer<typeof RosterRoleSchema>;
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type TeamRoster = z.infer<typeof TeamRosterSchema>;
export type TeamRosterCreate = z.infer<typeof TeamRosterCreateSchema>;
export type TeamRosterPatch = z.infer<typeof TeamRosterPatchSchema>;
