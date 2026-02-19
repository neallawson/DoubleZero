import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { teamMember, team, person, teamRole, playerPosition } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireSandboxOwnerPermission, type SandboxEntityContext } from '../middleware/permissions.js';
import { validate, CreateTeamMemberSchema, UpdateTeamMemberSchema, handleRouteError } from '../validation/index.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to get sandbox entity context for team member operations
// The team itself determines sandbox ownership
async function getTeamEntityContext(req: Request): Promise<SandboxEntityContext | null> {
  const teamId = parseInt(req.params.teamId ?? '', 10);
  if (isNaN(teamId)) return null;
  
  const [t] = await db
    .select({ id: team.id, sandboxId: team.sandboxId })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1);
  
  if (!t) return null;
  
  // For team members: the team's sandboxId determines ownership
  // entityTeamId is the team itself for public teams
  return {
    sandboxId: t.sandboxId,
    entityTeamId: t.sandboxId === null ? t.id : null,
  };
}

/**
 * GET /teams/:teamId/members - List team members for current season
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.get('/:teamId/members', requireSandboxOwnerPermission(getTeamEntityContext), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    // Get team's active season
    const [t] = await db.select({ activeSeasonId: team.activeSeasonId }).from(team).where(eq(team.id, teamId)).limit(1);
    if (!t || !t.activeSeasonId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team has no active season' } });
    }

    const members = await db
      .select({
        id: teamMember.id,
        teamId: teamMember.teamId,
        personId: teamMember.personId,
        seasonId: teamMember.seasonId,
        permission: teamMember.permission,
        teamRoleId: teamMember.teamRoleId,
        positionId: teamMember.positionId,
        jerseyNumber: teamMember.jerseyNumber,
        title: teamMember.title,
        isActive: teamMember.isActive,
        version: teamMember.version,
        person: {
          id: person.id,
          displayName: person.displayName,
          firstName: person.firstName,
          lastName: person.lastName,
        },
        role: {
          id: teamRole.id,
          name: teamRole.name,
        },
        position: {
          id: playerPosition.id,
          name: playerPosition.name,
          shortName: playerPosition.shortName,
        },
      })
      .from(teamMember)
      .leftJoin(person, eq(teamMember.personId, person.id))
      .leftJoin(teamRole, eq(teamMember.teamRoleId, teamRole.id))
      .leftJoin(playerPosition, eq(teamMember.positionId, playerPosition.id))
      .where(and(
        eq(teamMember.teamId, teamId),
        eq(teamMember.seasonId, t.activeSeasonId),
        eq(teamMember.isActive, true)
      ));

    res.json({ success: true, data: members });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch team members');
  }
});

/**
 * GET /teams/:teamId/members/:id - Get a single team member
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.get('/:teamId/members/:id', requireSandboxOwnerPermission(getTeamEntityContext), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(teamId) || isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const [found] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.id, id), eq(teamMember.teamId, teamId)))
      .limit(1);

    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team member not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch team member');
  }
});

/**
 * POST /teams/:teamId/members - Add a team member
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.post('/:teamId/members', requireSandboxOwnerPermission(getTeamEntityContext), validate(CreateTeamMemberSchema), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    // Get seasonId from team's active season
    const [t] = await db.select({ activeSeasonId: team.activeSeasonId }).from(team).where(eq(team.id, teamId)).limit(1);
    if (!t || !t.activeSeasonId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team has no active season' } });
    }
    const seasonId = t.activeSeasonId;

    const { personId, permission, teamRoleId, positionId, jerseyNumber, title } = req.body;

    // Map frontend permission names to DB enum values
    // Frontend uses TEAM_ADMIN/TEAM_MEMBER, DB uses ADMIN/MEMBER
    let memberPermission: 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER';
    if (permission === 'TEAM_ADMIN' || permission === 'ADMIN') {
      memberPermission = 'ADMIN';
    } else if (permission === 'TEAM_MEMBER' || permission === 'MEMBER') {
      memberPermission = 'MEMBER';
    }

    const [created] = await db.insert(teamMember).values({
      teamId,
      personId,
      seasonId,
      permission: memberPermission,
      teamRoleId,
      positionId,
      jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
      title,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create team member');
  }
});

/**
 * PATCH /teams/:teamId/members/:id - Update a team member
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.patch('/:teamId/members/:id', requireSandboxOwnerPermission(getTeamEntityContext), validate(UpdateTeamMemberSchema), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(teamId) || isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const { permission, teamRoleId, positionId, jerseyNumber, title, isActive, version } = req.body;

    // Map frontend permission names to DB enum values
    let mappedPermission: 'ADMIN' | 'MEMBER' | 'VIEWER' | undefined;
    if (permission === 'TEAM_ADMIN' || permission === 'ADMIN') {
      mappedPermission = 'ADMIN';
    } else if (permission === 'TEAM_MEMBER' || permission === 'MEMBER') {
      mappedPermission = 'MEMBER';
    } else if (permission !== undefined) {
      mappedPermission = permission;
    }

    const [updated] = await db
      .update(teamMember)
      .set({
        ...(mappedPermission !== undefined && { permission: mappedPermission }),
        ...(teamRoleId !== undefined && { teamRoleId }),
        ...(positionId !== undefined && { positionId }),
        ...(jerseyNumber !== undefined && { jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null }),
        ...(title !== undefined && { title }),
        ...(isActive !== undefined && { isActive }),
        version: version + 1,
      })
      .where(and(eq(teamMember.id, id), eq(teamMember.teamId, teamId), eq(teamMember.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Team member was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update team member');
  }
});

/**
 * DELETE /teams/:teamId/members/:id - Remove a team member (soft delete)
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.delete('/:teamId/members/:id', requireSandboxOwnerPermission(getTeamEntityContext), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(teamId) || isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const [deleted] = await db
      .update(teamMember)
      .set({ isActive: false })
      .where(and(eq(teamMember.id, id), eq(teamMember.teamId, teamId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team member not found' } });
    }

    res.json({ success: true, data: { message: 'Team member removed' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete team member');
  }
});

export default router;
