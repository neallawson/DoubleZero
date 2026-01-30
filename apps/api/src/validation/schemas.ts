import { z } from 'zod';

// Common field validators
const safeString = (maxLength: number) => 
  z.string()
    .max(maxLength, `Must be ${maxLength} characters or less`)
    .regex(/^[^<>]*$/, 'Invalid characters'); // No HTML tags

const requiredString = (maxLength: number) =>
  safeString(maxLength).min(1, 'Required');

const optionalString = (maxLength: number) =>
  safeString(maxLength).optional().nullable();

const email = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase();

const optionalEmail = email.optional().nullable().or(z.literal(''));

const phone = z.string()
  .max(20, 'Phone number too long')
  .regex(/^[+\d\s\-().]*$/, 'Invalid phone number format')
  .optional()
  .nullable()
  .or(z.literal(''));

const positiveInt = z.number().int().positive();
const optionalPositiveInt = positiveInt.optional().nullable();

const version = z.number().int().min(0);

const dateString = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
  .optional()
  .nullable()
  .or(z.literal(''));

const dateTimeString = z.string()
  .datetime({ message: 'Invalid datetime format' })
  .optional()
  .nullable();

// Auth schemas
export const RegisterSchema = z.object({
  email: email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const LoginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password required').max(128),
});

export const CreateUserSchema = z.object({
  email: email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

// Person schemas
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
  version: version,
});

// League schemas
export const CreateLeagueSchema = z.object({
  name: requiredString(100),
  description: optionalString(500),
  governingBody: optionalString(100),
});

export const UpdateLeagueSchema = z.object({
  name: optionalString(100),
  description: optionalString(500),
  governingBody: optionalString(100),
  activeSeasonId: optionalPositiveInt,
  isActive: z.boolean().optional(),
  version: version,
});

// Season schemas
export const CreateSeasonSchema = z.object({
  name: requiredString(100),
  leagueId: positiveInt,
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

// Location schemas
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

// Team schemas
export const CreateTeamSchema = z.object({
  name: requiredString(100),
  shortName: optionalString(20),
  leagueId: optionalPositiveInt,
  activeSeasonId: optionalPositiveInt,
  homeLocationId: optionalPositiveInt,
  primaryColor: optionalString(20),
  secondaryColor: optionalString(20),
});

export const UpdateTeamSchema = z.object({
  name: optionalString(100),
  shortName: optionalString(20),
  leagueId: optionalPositiveInt,
  activeSeasonId: optionalPositiveInt,
  homeLocationId: optionalPositiveInt,
  primaryColor: optionalString(20),
  secondaryColor: optionalString(20),
  isActive: z.boolean().optional(),
  version: version,
});

// Team Member schemas
export const CreateTeamMemberSchema = z.object({
  personId: positiveInt,
  teamRoleId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  jerseyNumber: z.string().max(10).optional().nullable(),
  title: optionalString(50),
  permission: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const UpdateTeamMemberSchema = z.object({
  teamRoleId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  jerseyNumber: z.string().max(10).optional().nullable(),
  title: optionalString(50),
  permission: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  version: version,
});

// Game schemas
export const CreateGameSchema = z.object({
  seasonId: positiveInt,
  homeTeamId: positiveInt,
  awayTeamId: positiveInt,
  locationId: optionalPositiveInt,
  gameTypeId: optionalPositiveInt,
  statusId: optionalPositiveInt,
  date: dateString,
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

// User management schemas
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

// Lookup schemas (for team roles, positions, etc.)
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

// Type exports for use in routes
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type CreateLeagueInput = z.infer<typeof CreateLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof UpdateLeagueSchema>;
export type CreateSeasonInput = z.infer<typeof CreateSeasonSchema>;
export type UpdateSeasonInput = z.infer<typeof UpdateSeasonSchema>;
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export type CreateTeamMemberInput = z.infer<typeof CreateTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof UpdateTeamMemberSchema>;
export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type UpdateGameInput = z.infer<typeof UpdateGameSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type AddRoleInput = z.infer<typeof AddRoleSchema>;
export type LinkPersonInput = z.infer<typeof LinkPersonSchema>;
