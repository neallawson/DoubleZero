import { z } from 'zod';
import { requiredString, optionalString, optionalPositiveInt, version } from '../common.js';

export const CreateLeagueSchema = z.object({
  name: requiredString(100),
  description: optionalString(500),
  governingBody: optionalString(100),
});

export const UpdateLeagueSchema = z.object({
  name: optionalString(100),
  description: optionalString(500),
  governingBody: optionalString(100),
  activeSeasonId: optionalPositiveInt,
  isActive: z.boolean().optional(),
  version: version,
});

export type CreateLeagueInput = z.infer<typeof CreateLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof UpdateLeagueSchema>;
