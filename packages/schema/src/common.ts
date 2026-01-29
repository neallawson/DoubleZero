import { z } from 'zod';

// Common field schemas used across entities

export const IdSchema = z.number().int().positive();

export const VersionSchema = z.number().int().nonnegative().default(0);

export const TimestampSchema = z.date();

export const EmailSchema = z.string().email().max(255);

export const PhoneSchema = z.string().max(20).nullable();

export const UrlSchema = z.string().url().max(500).nullable();

// Base fields for all editable entities
export const BaseEntitySchema = z.object({
  id: IdSchema,
  version: VersionSchema,
  createdAt: TimestampSchema,
});

// For create operations - omit auto-generated fields
export const BaseCreateSchema = z.object({});

// For patch operations - version required for optimistic locking
export const BasePatchSchema = z.object({
  version: z.number().int().nonnegative(),
});

// Common types
export type Id = z.infer<typeof IdSchema>;
