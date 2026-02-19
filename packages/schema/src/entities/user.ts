import { z } from 'zod';
import { positiveInt, version } from '../common.js';

export const UpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  version: version,
});

export const AddRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),
});

export const LinkPersonSchema = z.object({
  personId: positiveInt,
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type AddRoleInput = z.infer<typeof AddRoleSchema>;
export type LinkPersonInput = z.infer<typeof LinkPersonSchema>;
