import { z } from 'zod';
import { positiveInt, optionalPositiveInt, optionalString, version } from '../common.js';

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

export type CreateTeamMemberInput = z.infer<typeof CreateTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof UpdateTeamMemberSchema>;
