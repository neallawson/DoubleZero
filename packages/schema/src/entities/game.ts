import { z } from 'zod';
import { IdSchema, VersionSchema, TimestampSchema } from '../common';

// Game Type lookup
export const GameTypeSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  description: z.string().max(200).nullable(),
  isActive: z.boolean().default(true),
});

// Game Status lookup
export const GameStatusSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  isActive: z.boolean().default(true),
});

// Game Role (domain role for game participation)
export const GameRoleNameSchema = z.enum([
  'STARTER',
  'SUBSTITUTE',
  'COACH',
  'REFEREE',
  'LINE_JUDGE',
]);
export type GameRoleName = z.infer<typeof GameRoleNameSchema>;

export const GameRoleSchema = z.object({
  id: IdSchema,
  name: GameRoleNameSchema,
  description: z.string().max(200).nullable(),
  isActive: z.boolean().default(true),
});

// Game Event Type lookup
export const GameEventTypeSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  description: z.string().max(200).nullable(),
  isActive: z.boolean().default(true),
});

// Game entity
export const GameSchema = z.object({
  id: IdSchema,
  seasonId: IdSchema,
  locationId: IdSchema.nullable(),
  gameTypeId: IdSchema,
  statusId: IdSchema,
  date: z.date(),
  startTime: z.string().max(10).nullable(), // HH:MM format
  endTime: z.string().max(10).nullable(),
  homeTeamId: IdSchema,
  awayTeamId: IdSchema,
  homeScore: z.number().int().min(0).nullable(),
  awayScore: z.number().int().min(0).nullable(),
  refereePersonId: IdSchema.nullable(),
  attendance: z.number().int().min(0).nullable(),
  weather: z.string().max(100).nullable(),
  notes: z.string().max(1000).nullable(),
  version: VersionSchema,
  createdAt: TimestampSchema,
});

export const GameCreateSchema = z.object({
  seasonId: IdSchema,
  locationId: IdSchema.nullable().optional(),
  gameTypeId: IdSchema,
  statusId: IdSchema,
  date: z.date(),
  startTime: z.string().max(10).nullable().optional(),
  endTime: z.string().max(10).nullable().optional(),
  homeTeamId: IdSchema,
  awayTeamId: IdSchema,
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  refereePersonId: IdSchema.nullable().optional(),
  attendance: z.number().int().min(0).nullable().optional(),
  weather: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const GamePatchSchema = z.object({
  locationId: IdSchema.nullable().optional(),
  gameTypeId: IdSchema.optional(),
  statusId: IdSchema.optional(),
  date: z.date().optional(),
  startTime: z.string().max(10).nullable().optional(),
  endTime: z.string().max(10).nullable().optional(),
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  refereePersonId: IdSchema.nullable().optional(),
  attendance: z.number().int().min(0).nullable().optional(),
  weather: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  version: z.number().int().nonnegative(),
});

// Game Participant
export const GameParticipantSchema = z.object({
  id: IdSchema,
  gameId: IdSchema,
  teamId: IdSchema,
  personId: IdSchema,
  gameRoleId: IdSchema,
  positionId: IdSchema.nullable(),
  isStarter: z.boolean().default(false),
  minutesPlayed: z.number().int().min(0).nullable(),
  version: VersionSchema,
});

export const GameParticipantCreateSchema = z.object({
  gameId: IdSchema,
  teamId: IdSchema,
  personId: IdSchema,
  gameRoleId: IdSchema,
  positionId: IdSchema.nullable().optional(),
  isStarter: z.boolean().optional(),
  minutesPlayed: z.number().int().min(0).nullable().optional(),
});

// Game Event
export const GameEventSchema = z.object({
  id: IdSchema,
  gameId: IdSchema,
  teamId: IdSchema.nullable(),
  personId: IdSchema.nullable(),
  eventTypeId: IdSchema,
  matchMinute: z.number().int().min(0).nullable(),
  matchSecond: z.number().int().min(0).max(59).nullable(),
  fieldX: z.number().min(0).max(100).nullable(), // Percentage position
  fieldY: z.number().min(0).max(100).nullable(),
  notes: z.string().max(500).nullable(),
  relatedPersonId: IdSchema.nullable(), // e.g., assist provider
});

export const GameEventCreateSchema = z.object({
  gameId: IdSchema,
  teamId: IdSchema.nullable().optional(),
  personId: IdSchema.nullable().optional(),
  eventTypeId: IdSchema,
  matchMinute: z.number().int().min(0).nullable().optional(),
  matchSecond: z.number().int().min(0).max(59).nullable().optional(),
  fieldX: z.number().min(0).max(100).nullable().optional(),
  fieldY: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  relatedPersonId: IdSchema.nullable().optional(),
});

// Types
export type GameType = z.infer<typeof GameTypeSchema>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export type GameRole = z.infer<typeof GameRoleSchema>;
export type GameEventType = z.infer<typeof GameEventTypeSchema>;
export type Game = z.infer<typeof GameSchema>;
export type GameCreate = z.infer<typeof GameCreateSchema>;
export type GamePatch = z.infer<typeof GamePatchSchema>;
export type GameParticipant = z.infer<typeof GameParticipantSchema>;
export type GameParticipantCreate = z.infer<typeof GameParticipantCreateSchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export type GameEventCreate = z.infer<typeof GameEventCreateSchema>;
