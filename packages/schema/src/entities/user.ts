import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema, EmailSchema } from '../common';

// App-level roles (RBAC)
export const AppRoleSchema = z.enum(['ADMIN', 'USER']);
export type AppRole = z.infer<typeof AppRoleSchema>;

// User entity (authentication)
export const UserSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const UserCreateSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(100),
});

export const UserPatchSchema = z.object({
  email: EmailSchema.optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

// User role assignment
export const UserRoleSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  role: AppRoleSchema,
  createdAt: TimestampSchema,
});

export const UserRoleCreateSchema = z.object({
  userId: IdSchema,
  role: AppRoleSchema,
});

// Types
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserPatch = z.infer<typeof UserPatchSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserRoleCreate = z.infer<typeof UserRoleCreateSchema>;
