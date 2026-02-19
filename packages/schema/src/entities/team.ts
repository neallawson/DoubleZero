import { z } from 'zod';
import { requiredString, optionalString, optionalPositiveInt, version } from '../common.js';

export const CreateTeamSchema = z.object({
  name: requiredString(100),
  shortName: optionalString(20),
  leagueId: optionalPositiveInt,
  activeSeasonId: optionalPositiveInt,
  homeLocationId: optionalPositiveInt,
  primaryColor: optionalString(20),
  secondaryColor: optionalString(20),
});

export const UpdateTeamSchema = z.object({
  name: optionalString(100),
  shortName: optionalString(20),
  leagueId: optionalPositiveInt,
  activeSeasonId: optionalPositiveInt,
  homeLocationId: optionalPositiveInt,
  primaryColor: optionalString(20),
  secondaryColor: optionalString(20),
  isActive: z.boolean().optional(),
  version: version,
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
