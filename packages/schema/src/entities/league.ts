import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema } from '../common';

// League entity
export const LeagueSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  governingBody: z.string().max(100).nullable(),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const LeagueCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  governingBody: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const LeaguePatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  governingBody: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Types
export type League = z.infer<typeof LeagueSchema>;
export type LeagueCreate = z.infer<typeof LeagueCreateSchema>;
export type LeaguePatch = z.infer<typeof LeaguePatchSchema>;
