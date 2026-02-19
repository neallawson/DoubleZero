import { z } from 'zod';

// Common field validators

export const safeString = (maxLength: number) =>
  z.string()
    .max(maxLength, `Must be ${maxLength} characters or less`)
    .regex(/^[^<>]*$/, 'Invalid characters'); // No HTML tags

export const requiredString = (maxLength: number) =>
  safeString(maxLength).min(1, 'Required');

export const optionalString = (maxLength: number) =>
  safeString(maxLength).optional().nullable();

export const email = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase();

export const optionalEmail = email.optional().nullable().or(z.literal(''));

export const phone = z.string()
  .max(20, 'Phone number too long')
  .regex(/^[+\d\s\-().]*$/, 'Invalid phone number format')
  .optional()
  .nullable()
  .or(z.literal(''));

export const positiveInt = z.number().int().positive();
export const optionalPositiveInt = positiveInt.optional().nullable();

export const version = z.number().int().min(0);

export const requiredDateString = z.string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');

export const dateString = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
  .optional()
  .nullable()
  .or(z.literal(''));

export const dateTimeString = z.string()
  .datetime({ message: 'Invalid datetime format' })
  .optional()
  .nullable();

export const worldCoordinate = z.number().min(-100).max(100); // Field is ~100m max
