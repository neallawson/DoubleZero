import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { team, lockerRoom } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, requireTeamAdmin, requireTeamMember } from '../middleware/permissions.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to get team context from request
async function getTeamContext(req: Request): Promise<{ teamId: number; seasonId: number } | null> {
  const teamId = parseInt(req.params.id ?? req.params.teamId ?? '', 10);
  if (isNaN(teamId)) return null;
  
  const [t] = await db.select({ activeSeasonId: team.activeSeasonId }).from(team).where(eq(team.id, teamId)).limit(1);
  if (!t || !t.activeSeasonId) return null;
  
  return { teamId, seasonId: t.activeSeasonId };
}

/**
 * GET /teams - List all teams
 * Access: Any authenticated user
 */
router.get('/', requireAuthenticated(), async (_req: Request, res: Response) => {
  try {
    const teams = await db.select().from(team).where(eq(team.isActive, true)).orderBy(team.name);
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch teams' } });
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

    const [found] = await db.select().from(team).where(eq(team.id, id)).limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch team' } });
  }
});

/**
 * POST /teams - Create a team
 * Access: ADMIN only
 */
router.post('/', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { name, shortName, leagueId, primaryColor, secondaryColor } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
    }

    const [created] = await db.insert(team).values({ name, shortName, leagueId, primaryColor, secondaryColor }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create team' } });
  }
});

/**
 * PATCH /teams/:id - Update a team
 * Access: ADMIN or TEAM_ADMIN
 */
router.patch('/:id', requireTeamAdmin(getTeamContext), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const { name, shortName, primaryColor, secondaryColor, activeSeasonId, isActive, version } = req.body;

    if (typeof version !== 'number') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Version is required' } });
    }

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
    console.error('Error updating team:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update team' } });
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
    console.error('Error deleting team:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete team' } });
  }
});

// ============ LOCKER ROOMS (nested under teams) ============

/**
 * GET /teams/:teamId/locker-rooms - List locker rooms for a team
 * Access: TEAM_MEMBER or higher
 */
router.get('/:teamId/locker-rooms', requireTeamMember(getTeamContext), async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId ?? '', 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid team ID' } });
    }

    const rooms = await db.select().from(lockerRoom).where(eq(lockerRoom.teamId, teamId)).orderBy(lockerRoom.name);
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching locker rooms:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch locker rooms' } });
  }
});

/**
 * POST /teams/:teamId/locker-rooms - Create a locker room
 * Access: TEAM_ADMIN or higher
 */
router.post('/:teamId/locker-rooms', requireTeamAdmin(getTeamContext), async (req: Request, res: Response) => {
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
    console.error('Error creating locker room:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create locker room' } });
  }
});

export default router;
