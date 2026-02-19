import { z } from 'zod';
import { requiredString, optionalString, dateString, version } from '../common.js';

export const CreateSeasonSchema = z.object({
  name: requiredString(100),
  startDate: dateString,
  endDate: dateString,
});

export const UpdateSeasonSchema = z.object({
  name: optionalString(100),
  startDate: dateString,
  endDate: dateString,
  isActive: z.boolean().optional(),
  version: version,
});

export type CreateSeasonInput = z.infer<typeof CreateSeasonSchema>;
export type UpdateSeasonInput = z.infer<typeof UpdateSeasonSchema>;
