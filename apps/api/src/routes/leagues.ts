import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { league, season } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, requireAdminOrTeamAdmin, requireSandboxOwnerPermission, type SandboxEntityContext } from '../middleware/permissions.js';
import { validate, CreateLeagueSchema, UpdateLeagueSchema, CreateSeasonSchema, UpdateSeasonSchema, handleRouteError } from '../validation/index.js';
import { sandboxFilter, getActiveSandboxId, getOrCreateTeamSandbox } from '../middleware/sandbox.js';

const router: RouterType = Router();

// All routes require authentication
router.use(requireAuth);

// Helper to get sandbox entity context for a league
async function getLeagueEntityContext(req: Request): Promise<SandboxEntityContext | null> {
  const leagueId = parseInt(req.params.id ?? '', 10);
  if (isNaN(leagueId)) return null;
  
  const [l] = await db
    .select({ id: league.id, sandboxId: league.sandboxId })
    .from(league)
    .where(eq(league.id, leagueId))
    .limit(1);
  
  if (!l) return null;
  
  // Leagues don't have a direct team association - only sandbox ownership matters
  return {
    sandboxId: l.sandboxId,
    entityTeamId: null, // Public leagues require ADMIN
  };
}

/**
 * GET /leagues - List all leagues
 * Access: Any authenticated user (read-only)
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    const leagues = await db
      .select()
      .from(league)
      .where(and(
        eq(league.isActive, true),
        sandboxFilter(league.sandboxId, activeSandboxId)
      ))
      .orderBy(league.name);

    res.json({ success: true, data: leagues });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch leagues');
  }
});

/**
 * GET /leagues/:id - Get a single league
 * Access: Any authenticated user
 */
router.get('/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid league ID' },
      });
    }

    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    const [found] = await db
      .select()
      .from(league)
      .where(and(
        eq(league.id, id),
        sandboxFilter(league.sandboxId, activeSandboxId)
      ))
      .limit(1);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'League not found' },
      });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch league');
  }
});

/**
 * POST /leagues - Create a league
 * Access: ADMIN (creates public league) or TEAM_ADMIN with active team (creates sandboxed league)
 */
router.post('/', requireAdminOrTeamAdmin(), validate(CreateLeagueSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, governingBody } = req.body;
    const activeTeamId = req.user!.activeTeamId;

    // Determine sandboxId based on context
    let sandboxId: number | null = null;
    if (activeTeamId) {
      sandboxId = await getOrCreateTeamSandbox(activeTeamId);
    }

    const [created] = await db
      .insert(league)
      .values({ name, description, governingBody, sandboxId })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'League with this name already exists' },
      });
    }
    handleRouteError(res, error, 'Failed to create league');
  }
});

/**
 * PATCH /leagues/:id - Update a league
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed leagues)
 */
router.patch('/:id', requireSandboxOwnerPermission(getLeagueEntityContext), validate(UpdateLeagueSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid league ID' },
      });
    }

    const { name, description, governingBody, activeSeasonId, isActive, version } = req.body;

    const [updated] = await db
      .update(league)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(governingBody !== undefined && { governingBody }),
        ...(activeSeasonId !== undefined && { activeSeasonId }),
        ...(isActive !== undefined && { isActive }),
        version: version + 1,
      })
      .where(and(eq(league.id, id), eq(league.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'League was modified by another user' },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update league');
  }
});

/**
 * DELETE /leagues/:id - Soft delete a league
 * Access: ADMIN only
 */
router.delete('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid league ID' },
      });
    }

    const [deleted] = await db
      .update(league)
      .set({ isActive: false })
      .where(eq(league.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'League not found' },
      });
    }

    res.json({ success: true, data: { message: 'League deleted' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete league');
  }
});

// ============ SEASONS (nested under leagues) ============

/**
 * GET /leagues/:leagueId/seasons - List seasons for a league
 * Access: Any authenticated user
 */
router.get('/:leagueId/seasons', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId ?? '', 10);
    if (isNaN(leagueId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid league ID' },
      });
    }

    const seasons = await db
      .select()
      .from(season)
      .where(and(eq(season.leagueId, leagueId), eq(season.isActive, true)))
      .orderBy(season.startDate);

    res.json({ success: true, data: seasons });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch seasons');
  }
});

/**
 * GET /leagues/:leagueId/seasons/:id - Get a single season
 * Access: Any authenticated user
 */
router.get('/:leagueId/seasons/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId ?? '', 10);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(leagueId) || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' },
      });
    }

    const [found] = await db
      .select()
      .from(season)
      .where(and(eq(season.id, id), eq(season.leagueId, leagueId)))
      .limit(1);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Season not found' },
      });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch season');
  }
});

/**
 * POST /leagues/:leagueId/seasons - Create a season
 * Access: ADMIN only
 */
router.post('/:leagueId/seasons', requireAdmin(), validate(CreateSeasonSchema), async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId ?? '', 10);
    if (isNaN(leagueId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid league ID' },
      });
    }

    const { name, startDate, endDate } = req.body;

    // Verify league exists
    const [leagueExists] = await db
      .select({ id: league.id })
      .from(league)
      .where(eq(league.id, leagueId))
      .limit(1);

    if (!leagueExists) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'League not found' },
      });
    }

    const [created] = await db
      .insert(season)
      .values({ leagueId, name, startDate, endDate })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create season');
  }
});

/**
 * PATCH /leagues/:leagueId/seasons/:id - Update a season
 * Access: ADMIN only
 */
router.patch('/:leagueId/seasons/:id', requireAdmin(), validate(UpdateSeasonSchema), async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId ?? '', 10);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(leagueId) || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' },
      });
    }

    const { name, startDate, endDate, isActive, version } = req.body;

    const [updated] = await db
      .update(season)
      .set({
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(isActive !== undefined && { isActive }),
        version: version + 1,
      })
      .where(and(eq(season.id, id), eq(season.leagueId, leagueId), eq(season.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Season was modified or not found' },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update season');
  }
});

/**
 * DELETE /leagues/:leagueId/seasons/:id - Soft delete a season
 * Access: ADMIN only
 */
router.delete('/:leagueId/seasons/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId ?? '', 10);
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(leagueId) || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' },
      });
    }

    const [deleted] = await db
      .update(season)
      .set({ isActive: false })
      .where(and(eq(season.id, id), eq(season.leagueId, leagueId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Season not found' },
      });
    }

    res.json({ success: true, data: { message: 'Season deleted' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete season');
  }
});

export default router;
