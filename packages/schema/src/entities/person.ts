import { z } from 'zod';
import { requiredString, optionalString, optionalEmail, phone, dateString, optionalPositiveInt } from '../common.js';

export const CreatePersonSchema = z.object({
  displayName: requiredString(100),
  firstName: optionalString(50),
  lastName: optionalString(50),
  email: optionalEmail,
  phone: phone,
  dateOfBirth: dateString,
  userId: optionalPositiveInt,
  // Optional: if provided by a team admin, auto-creates team membership
  teamId: optionalPositiveInt,
  // Optional team member fields when creating via team
  teamRoleId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  jerseyNumber: z.string().max(10).optional().nullable(),
  title: optionalString(50),
  permission: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

export const UpdatePersonSchema = z.object({
  displayName: optionalString(100),
  firstName: optionalString(50),
  lastName: optionalString(50),
  email: optionalEmail,
  phone: phone,
  dateOfBirth: dateString,
  version: z.number().int().min(0),
});

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
