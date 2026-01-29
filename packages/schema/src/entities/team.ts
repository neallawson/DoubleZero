import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema } from '../common';

// Locker Room entity (team workspace - 1:1 with Team)
export const LockerRoomSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  ownerUserId: IdSchema,
  isPublic: z.boolean().default(false),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const LockerRoomCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const LockerRoomPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Team entity
export const TeamSchema = z.object({
  id: IdSchema,
  lockerRoomId: IdSchema,
  leagueId: IdSchema.nullable(),
  name: z.string().min(1).max(100),
  shortName: z.string().max(20).nullable(),
  primaryColor: z.string().max(20).nullable(),
  secondaryColor: z.string().max(20).nullable(),
  icon: z.string().nullable(), // Base64 or URL
  iconMime: z.string().max(50).nullable(),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const TeamCreateSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z.string().max(20).nullable().optional(),
  leagueId: IdSchema.nullable().optional(),
  primaryColor: z.string().max(20).nullable().optional(),
  secondaryColor: z.string().max(20).nullable().optional(),
  icon: z.string().nullable().optional(),
  iconMime: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const TeamPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  shortName: z.string().max(20).nullable().optional(),
  leagueId: IdSchema.nullable().optional(),
  primaryColor: z.string().max(20).nullable().optional(),
  secondaryColor: z.string().max(20).nullable().optional(),
  icon: z.string().nullable().optional(),
  iconMime: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Types
export type LockerRoom = z.infer<typeof LockerRoomSchema>;
export type LockerRoomCreate = z.infer<typeof LockerRoomCreateSchema>;
export type LockerRoomPatch = z.infer<typeof LockerRoomPatchSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type TeamCreate = z.infer<typeof TeamCreateSchema>;
export type TeamPatch = z.infer<typeof TeamPatchSchema>;
