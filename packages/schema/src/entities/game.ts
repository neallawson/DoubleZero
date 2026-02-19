import { z } from 'zod';
import { positiveInt, optionalPositiveInt, optionalString, dateString, requiredDateString, version } from '../common.js';

export const CreateGameSchema = z.object({
  seasonId: positiveInt,
  homeTeamId: positiveInt,
  awayTeamId: positiveInt,
  locationId: optionalPositiveInt,
  gameTypeId: positiveInt,
  statusId: positiveInt,
  date: requiredDateString,
  startTime: optionalString(10),
  endTime: optionalString(10),
  notes: optionalString(1000),
});

export const UpdateGameSchema = z.object({
  locationId: optionalPositiveInt,
  gameTypeId: optionalPositiveInt,
  statusId: optionalPositiveInt,
  date: dateString,
  startTime: optionalString(10),
  endTime: optionalString(10),
  homeScore: z.number().int().min(0).optional().nullable(),
  awayScore: z.number().int().min(0).optional().nullable(),
  attendance: z.number().int().min(0).optional().nullable(),
  weather: optionalString(100),
  notes: optionalString(1000),
  version: version,
});

export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type UpdateGameInput = z.infer<typeof UpdateGameSchema>;
