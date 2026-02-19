import { z } from 'zod';
import { requiredString, optionalString, optionalPositiveInt, version } from '../common.js';

export const CreateLocationSchema = z.object({
  name: requiredString(100),
  address: optionalString(255),
  city: optionalString(100),
  state: optionalString(50),
  zip: optionalString(20),
  country: optionalString(50),
  homeTeamId: optionalPositiveInt,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const UpdateLocationSchema = z.object({
  name: optionalString(100),
  address: optionalString(255),
  city: optionalString(100),
  state: optionalString(50),
  zip: optionalString(20),
  country: optionalString(50),
  homeTeamId: optionalPositiveInt,
  isActive: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  version: version,
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
