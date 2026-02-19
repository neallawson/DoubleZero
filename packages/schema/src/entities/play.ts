import { z } from 'zod';
import { safeString, requiredString, optionalString, optionalPositiveInt, dateTimeString, worldCoordinate } from '../common.js';

export const CreatePlaySchema = z.object({
  name: requiredString(200),
  description: optionalString(2000),
  tags: z.array(safeString(50)).max(20).optional().nullable(),
  teamId: optionalPositiveInt,
  fieldTemplateId: optionalPositiveInt,
  clientId: z.string().uuid().optional().nullable(),
});

export const UpdatePlaySchema = z.object({
  name: optionalString(200),
  description: optionalString(2000),
  tags: z.array(safeString(50)).max(20).optional().nullable(),
  viewportZoom: z.number().min(0.1).max(10).optional().nullable(),
  viewportPanX: z.number().optional().nullable(),
  viewportPanY: z.number().optional().nullable(),
  version: z.number().int().min(0),
});

// Play Player schemas
export const PlayPlayerSchema = z.object({
  teamMemberId: optionalPositiveInt,
  xMeters: worldCoordinate,
  yMeters: worldCoordinate,
  displayNumber: z.number().int().min(0).max(99).optional().nullable(),
  displayName: optionalString(50),
  teamColorOverride: optionalString(20),
  teamSide: z.number().int().min(0).max(1).default(0),
  zIndex: z.number().int().optional().nullable(),
});

export const BulkPlayPlayersSchema = z.object({
  players: z.array(PlayPlayerSchema).max(50),
});

// Play Annotation schemas
export const PlayAnnotationSchema = z.object({
  annotationType: z.enum(['LINE', 'ARROW', 'DASHED_LINE', 'DASHED_ARROW']),
  startX: worldCoordinate,
  startY: worldCoordinate,
  endX: worldCoordinate,
  endY: worldCoordinate,
  color: optionalString(20),
  strokeWidth: z.number().min(0.1).max(20).optional().nullable(),
  zIndex: z.number().int().optional().nullable(),
});

export const BulkPlayAnnotationsSchema = z.object({
  annotations: z.array(PlayAnnotationSchema).max(100),
});

// Sync schema for offline-first
export const SyncPlaysSchema = z.object({
  plays: z.array(z.object({
    clientId: z.string().uuid(),
    serverId: optionalPositiveInt,
    play: CreatePlaySchema,
    players: z.array(PlayPlayerSchema),
    annotations: z.array(PlayAnnotationSchema),
    localVersion: z.number().int(),
    deletedAt: dateTimeString,
  })),
  lastSyncTimestamp: dateTimeString,
});

export type CreatePlayInput = z.infer<typeof CreatePlaySchema>;
export type UpdatePlayInput = z.infer<typeof UpdatePlaySchema>;
export type PlayPlayerInput = z.infer<typeof PlayPlayerSchema>;
export type BulkPlayPlayersInput = z.infer<typeof BulkPlayPlayersSchema>;
export type PlayAnnotationInput = z.infer<typeof PlayAnnotationSchema>;
export type BulkPlayAnnotationsInput = z.infer<typeof BulkPlayAnnotationsSchema>;
export type SyncPlaysInput = z.infer<typeof SyncPlaysSchema>;
