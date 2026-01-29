import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema } from '../common';

// Location entity
export const LocationSchema = z.object({
  id: IdSchema,
  lockerRoomId: IdSchema.nullable(), // Null = shared/public location
  name: z.string().min(1).max(100),
  address: z.string().max(200).nullable(),
  city: z.string().max(100).nullable(),
  state: z.string().max(50).nullable(),
  zip: z.string().max(20).nullable(),
  country: z.string().max(50).nullable(),
  homeTeamId: IdSchema.nullable(),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const LocationCreateSchema = z.object({
  lockerRoomId: IdSchema.nullable().optional(),
  name: z.string().min(1).max(100),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  country: z.string().max(50).nullable().optional(),
  homeTeamId: IdSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export const LocationPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  country: z.string().max(50).nullable().optional(),
  homeTeamId: IdSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Types
export type Location = z.infer<typeof LocationSchema>;
export type LocationCreate = z.infer<typeof LocationCreateSchema>;
export type LocationPatch = z.infer<typeof LocationPatchSchema>;
