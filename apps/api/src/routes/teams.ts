import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { team, lockerRoom } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, requireAdminOrTeamAdmin, requireSandboxOwnerPermission, type SandboxEntityContext } from '../middleware/permissions.js';
import { validate, CreateTeamSchema, UpdateTeamSchema, handleRouteError } from '../validation/index.js';
import { sandboxFilter, getActiveSandboxId, getOrCreateTeamSandbox } from '../middleware/sandbox.js';
import { sandbox } from '../db/schema/sandbox.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to get sandbox entity context for a team (handles both :id and :teamId params)
async function getTeamEntityContext(req: Request): Promise<SandboxEntityContext | null> {
  const teamId = parseInt(req.params.id ?? req.params.teamId ?? '', 10);
  if (isNaN(teamId)) return null;
  
  const [t] = await db
    .select({ id: team.id, sandboxId: team.sandboxId })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1);
  
  if (!t) return null;
  
  // For teams: sandboxId determines ownership, entityTeamId is the team itself (for public teams)
  return {
    sandboxId: t.sandboxId,
    entityTeamId: t.sandboxId === null ? t.id : null,
  };
}

/**
 * GET /teams - List all teams
 * Access: Any authenticated user
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    const teams = await db
      .select()
      .from(team)
      .where(and(
        eq(team.isActive, true),
        sandboxFilter(team.sandboxId, activeSandboxId)
      ))
      .orderBy(team.name);
    res.json({ success: true, data: teams });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch teams');
  }
});

/**
 * GET /teams/:id - Get a single team
 * Access: Any authenticated user
 */
router.get('/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    const [found] = await db
      .select()
      .from(team)
      .where(and(
        eq(team.id, id),
        sandboxFilter(team.sandboxId, activeSandboxId)
      ))
      .limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch team');
  }
});

/**
 * POST /teams - Create a team
 * Access: ADMIN (creates public team) or TEAM_ADMIN with active team (creates sandboxed team)
 */
router.post('/', requireAdminOrTeamAdmin(), validate(CreateTeamSchema), async (req: Request, res: Response) => {
  try {
    const { name, shortName, leagueId, activeSeasonId, primaryColor, secondaryColor } = req.body;
    const activeTeamId = req.user!.activeTeamId;

    // Determine sandboxId based on context
    let sandboxId: number | null = null;
    if (activeTeamId) {
      // Team admin creating sandboxed team
      sandboxId = await getOrCreateTeamSandbox(activeTeamId);
    }

    const [created] = await db.insert(team).values({ 
      name, shortName, leagueId, activeSeasonId, primaryColor, secondaryColor, sandboxId 
    }).returning();

    // If ADMIN created a public team (no activeTeamId), auto-create its sandbox
    if (!activeTeamId && created) {
      await db.insert(sandbox).values({
        teamId: created.id,
        name: `${name} Sandbox`,
      });
    }

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create team');
  }
});

/**
 * PATCH /teams/:id - Update a team
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.patch('/:id', requireSandboxOwnerPermission(getTeamEntityContext), validate(UpdateTeamSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const { name, shortName, primaryColor, secondaryColor, activeSeasonId, isActive, version } = req.body;

    const [updated] = await db
      .update(team)
      .set({
        ...(name !== undefined && { name }),
        ...(shortName !== undefined && { shortName }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(activeSeasonId !== undefined && { activeSeasonId }),
        ...(isActive !== undefined && { isActive }),
        version: version + 1,
      })
      .where(and(eq(team.id, id), eq(team.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Team was modified by another user' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update team');
  }
});

/**
 * DELETE /teams/:id - Soft delete a team
 * Access: ADMIN only
 */
router.delete('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const [deleted] = await db.update(team).set({ isActive: false }).where(eq(team.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } });
    }

    res.json({ success: true, data: { message: 'Team deleted' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete team');
  }
});

// ============ LOCKER ROOMS (nested under teams) ============

/**
 * GET /teams/:teamId/locker-rooms - List locker rooms for a team
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.get('/:teamId/locker-rooms', requireSandboxOwnerPermission(getTeamEntityContext), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const rooms = await db.select().from(lockerRoom).where(eq(lockerRoom.teamId, teamId)).orderBy(lockerRoom.name);
    res.json({ success: true, data: rooms });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch locker rooms');
  }
});

/**
 * POST /teams/:teamId/locker-rooms - Create a locker room
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed teams), or TEAM_ADMIN of the team (for public teams)
 */
router.post('/:teamId/locker-rooms', requireSandboxOwnerPermission(getTeamEntityContext), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const { name, description, seasonId, isPublic } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
    }
    if (!seasonId || typeof seasonId !== 'number') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Season ID is required' } });
    }

    const [created] = await db.insert(lockerRoom).values({ teamId, seasonId, name, description, isPublic }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create locker room');
  }
});

export default router;
