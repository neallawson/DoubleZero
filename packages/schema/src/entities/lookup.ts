import { z } from 'zod';
import { requiredString, optionalString, version } from '../common.js';

export const CreateLookupSchema = z.object({
  name: requiredString(50),
  shortName: optionalString(10),
  description: optionalString(255),
  sortOrder: z.number().int().min(0).optional(),
});

export const UpdateLookupSchema = z.object({
  name: optionalString(50),
  shortName: optionalString(10),
  description: optionalString(255),
  sortOrder: z.number().int().min(0).optional(),
  version: version,
});

export type CreateLookupInput = z.infer<typeof CreateLookupSchema>;
export type UpdateLookupInput = z.infer<typeof UpdateLookupSchema>;
