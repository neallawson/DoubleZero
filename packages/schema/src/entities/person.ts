import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema, EmailSchema, PhoneSchema } from '../common';

// Person entity (domain identity - players, coaches, parents, etc.)
export const PersonSchema = z.object({
  id: IdSchema,
  lockerRoomId: IdSchema,
  userId: IdSchema.nullable(), // Link to User if they have an account
  displayName: z.string().min(1).max(100),
  firstName: z.string().max(50).nullable(),
  lastName: z.string().max(50).nullable(),
  email: EmailSchema.nullable(),
  phone: PhoneSchema,
  photo: z.string().max(500).nullable(), // URL or base64
  dateOfBirth: z.date().nullable(),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const PersonCreateSchema = z.object({
  lockerRoomId: IdSchema,
  displayName: z.string().min(1).max(100),
  firstName: z.string().max(50).nullable().optional(),
  lastName: z.string().max(50).nullable().optional(),
  email: EmailSchema.nullable().optional(),
  phone: PhoneSchema.optional(),
  photo: z.string().max(500).nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const PersonPatchSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().max(50).nullable().optional(),
  lastName: z.string().max(50).nullable().optional(),
  email: EmailSchema.nullable().optional(),
  phone: PhoneSchema.optional(),
  photo: z.string().max(500).nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// Types
export type Person = z.infer<typeof PersonSchema>;
export type PersonCreate = z.infer<typeof PersonCreateSchema>;
export type PersonPatch = z.infer<typeof PersonPatchSchema>;
