import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { game, gameParticipant, gameOfficial, gameEvent } from '../db/schema/index.js';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, requireAdminOrTeamAdmin, requireSandboxOwnerPermission, type SandboxEntityContext } from '../middleware/permissions.js';
import { validate, CreateGameSchema, UpdateGameSchema, handleRouteError } from '../validation/index.js';
import { sandboxFilter, getActiveSandboxId, getOrCreateTeamSandbox } from '../middleware/sandbox.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to get sandbox entity context for a game (handles both :id and :gameId params)
async function getGameEntityContext(req: Request): Promise<SandboxEntityContext | null> {
  const gameId = parseInt(req.params.gameId ?? req.params.id ?? '', 10);
  if (isNaN(gameId)) return null;
  
  const [g] = await db
    .select({ id: game.id, sandboxId: game.sandboxId, homeTeamId: game.homeTeamId })
    .from(game)
    .where(eq(game.id, gameId))
    .limit(1);
  
  if (!g) return null;
  
  // For games: sandboxId determines ownership, entityTeamId is homeTeamId (for public games)
  return {
    sandboxId: g.sandboxId,
    entityTeamId: g.sandboxId === null ? g.homeTeamId : null,
  };
}

/**
 * GET /games - List games (optionally filtered by team or season)
 * Access: Any authenticated user
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const { teamId, seasonId } = req.query;
    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    
    let whereClause = sandboxFilter(game.sandboxId, activeSandboxId);
    if (teamId) {
      const tid = parseInt(teamId as string, 10);
      whereClause = and(whereClause, or(eq(game.homeTeamId, tid), eq(game.awayTeamId, tid)))!;
    }
    if (seasonId) {
      const sid = parseInt(seasonId as string, 10);
      whereClause = and(whereClause, eq(game.seasonId, sid))!;
    }

    const games = await db.select().from(game).where(whereClause).orderBy(game.date);
    res.json({ success: true, data: games });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch games');
  }
});

/**
 * GET /games/:id - Get a single game with details
 * Access: Any authenticated user
 */
router.get('/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    const [found] = await db
      .select()
      .from(game)
      .where(and(
        eq(game.id, id),
        sandboxFilter(game.sandboxId, activeSandboxId)
      ))
      .limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Game not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch game');
  }
});

/**
 * POST /games - Create a game
 * Access: ADMIN (creates public game) or TEAM_ADMIN with active team (creates sandboxed game)
 */
router.post('/', requireAdminOrTeamAdmin(), validate(CreateGameSchema), async (req: Request, res: Response) => {
  try {
    const { seasonId, locationId, gameTypeId, statusId, date, startTime, endTime, homeTeamId, awayTeamId, notes } = req.body;
    const activeTeamId = req.user!.activeTeamId;

    // Determine sandboxId based on context
    let sandboxId: number | null = null;
    if (activeTeamId) {
      sandboxId = await getOrCreateTeamSandbox(activeTeamId);
    }

    const [created] = await db.insert(game).values({
      seasonId, locationId, gameTypeId, statusId, date, startTime, endTime, homeTeamId, awayTeamId, notes, sandboxId
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create game');
  }
});

/**
 * PATCH /games/:id - Update a game
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed games), or TEAM_ADMIN of home team (for public games)
 */
router.patch('/:id', requireSandboxOwnerPermission(getGameEntityContext), validate(UpdateGameSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const { locationId, gameTypeId, statusId, date, startTime, endTime, homeScore, awayScore, attendance, weather, notes, version } = req.body;

    const [updated] = await db
      .update(game)
      .set({
        ...(locationId !== undefined && { locationId }),
        ...(gameTypeId !== undefined && { gameTypeId }),
        ...(statusId !== undefined && { statusId }),
        ...(date !== undefined && { date }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(homeScore !== undefined && { homeScore }),
        ...(awayScore !== undefined && { awayScore }),
        ...(attendance !== undefined && { attendance }),
        ...(weather !== undefined && { weather }),
        ...(notes !== undefined && { notes }),
        version: version + 1,
      })
      .where(and(eq(game.id, id), eq(game.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Game was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update game');
  }
});

/**
 * DELETE /games/:id - Delete a game
 * Access: ADMIN only
 */
router.delete('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const [deleted] = await db.delete(game).where(eq(game.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Game not found' } });
    }

    res.json({ success: true, data: { message: 'Game deleted' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete game');
  }
});

// ============ GAME PARTICIPANTS ============

/**
 * GET /games/:gameId/participants - List participants for a game
 * Access: Any authenticated user
 */
router.get('/:gameId/participants', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId ?? '', 10);
    if (isNaN(gameId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const participants = await db.select().from(gameParticipant).where(eq(gameParticipant.gameId, gameId));
    res.json({ success: true, data: participants });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch participants');
  }
});

/**
 * POST /games/:gameId/participants - Add a participant
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed games), or TEAM_ADMIN of home team (for public games)
 */
router.post('/:gameId/participants', requireSandboxOwnerPermission(getGameEntityContext), async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId ?? '', 10);
    if (isNaN(gameId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const { teamMemberId, positionId, jerseyNumber, isStarter, isCaptain } = req.body;

    if (!teamMemberId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team member ID is required' } });
    }

    const [created] = await db.insert(gameParticipant).values({
      gameId, teamMemberId, positionId, jerseyNumber, isStarter, isCaptain
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create participant');
  }
});

// ============ GAME OFFICIALS ============

/**
 * GET /games/:gameId/officials - List officials for a game
 * Access: Any authenticated user
 */
router.get('/:gameId/officials', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId ?? '', 10);
    if (isNaN(gameId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const officials = await db.select().from(gameOfficial).where(eq(gameOfficial.gameId, gameId));
    res.json({ success: true, data: officials });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch officials');
  }
});

/**
 * POST /games/:gameId/officials - Add an official
 * Access: ADMIN only
 */
router.post('/:gameId/officials', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId ?? '', 10);
    if (isNaN(gameId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    const { personId, role } = req.body;

    if (!personId || !role) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Person ID and role are required' } });
    }

    const [created] = await db.insert(gameOfficial).values({ gameId, personId, role }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create official');
  }
});

// ============ GAME EVENTS ============

/**
 * GET /games/:gameId/events - List events for a game
 * Access: Any authenticated user
 */
router.get('/:gameId/events', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId ?? '', 10);
    if (isNaN(gameId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid game ID' } });
    }

    // Events are linked via game_participant, so we need to join
    const events = await db
      .select()
      .from(gameEvent)
      .innerJoin(gameParticipant, eq(gameEvent.gameParticipantId, gameParticipant.id))
      .where(eq(gameParticipant.gameId, gameId))
      .orderBy(gameEvent.matchMinute);

    res.json({ success: true, data: events });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch events');
  }
});

/**
 * POST /games/:gameId/events - Add an event
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed games), or TEAM_ADMIN of home team (for public games)
 */
router.post('/:gameId/events', requireSandboxOwnerPermission(getGameEntityContext), async (req: Request, res: Response) => {
  try {
    const { gameParticipantId, eventTypeId, matchMinute, matchSecond, fieldX, fieldY, notes, relatedParticipantId } = req.body;

    if (!gameParticipantId || !eventTypeId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Participant ID and event type are required' } });
    }

    const [created] = await db.insert(gameEvent).values({
      gameParticipantId, eventTypeId, matchMinute, matchSecond, fieldX, fieldY, notes, relatedParticipantId
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create event');
  }
});

export default router;
