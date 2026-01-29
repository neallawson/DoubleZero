import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema } from '../common';

// Season entity
export const SeasonSchema = z.object({
  id: IdSchema,
  leagueId: IdSchema,
  name: z.string().min(1).max(100),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const SeasonCreateSchema = z.object({
  leagueId: IdSchema,
  name: z.string().min(1).max(100),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const SeasonPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Types
export type Season = z.infer<typeof SeasonSchema>;
export type SeasonCreate = z.infer<typeof SeasonCreateSchema>;
export type SeasonPatch = z.infer<typeof SeasonPatchSchema>;
