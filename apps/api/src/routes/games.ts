import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { game, gameParticipant, gameOfficial, gameEvent } from '../db/schema/index.js';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, requireTeamAdmin } from '../middleware/permissions.js';
import { validate, CreateGameSchema, UpdateGameSchema } from '../validation/index.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to get team context from a game
async function getGameTeamContext(req: Request): Promise<{ teamId: number; seasonId: number } | null> {
  const gameId = parseInt(req.params.gameId ?? req.params.id ?? '', 10);
  if (isNaN(gameId)) return null;
  
  const [g] = await db.select({ homeTeamId: game.homeTeamId, seasonId: game.seasonId }).from(game).where(eq(game.id, gameId)).limit(1);
  if (!g || !g.homeTeamId || !g.seasonId) return null;
  
  return { teamId: g.homeTeamId, seasonId: g.seasonId };
}

/**
 * GET /games - List games (optionally filtered by team or season)
 * Access: Any authenticated user
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const { teamId, seasonId } = req.query;
    
    let whereClause;
    if (teamId) {
      const tid = parseInt(teamId as string, 10);
      whereClause = or(eq(game.homeTeamId, tid), eq(game.awayTeamId, tid));
    }
    if (seasonId) {
      const sid = parseInt(seasonId as string, 10);
      whereClause = whereClause ? and(whereClause, eq(game.seasonId, sid)) : eq(game.seasonId, sid);
    }

    const games = await db.select().from(game).where(whereClause).orderBy(game.date);
    res.json({ success: true, data: games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch games' } });
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

    const [found] = await db.select().from(game).where(eq(game.id, id)).limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Game not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch game' } });
  }
});

/**
 * POST /games - Create a game
 * Access: ADMIN only (games involve multiple teams)
 */
router.post('/', requireAdmin(), validate(CreateGameSchema), async (req: Request, res: Response) => {
  try {
    const { seasonId, locationId, gameTypeId, statusId, date, startTime, endTime, homeTeamId, awayTeamId, notes } = req.body;

    const [created] = await db.insert(game).values({
      seasonId, locationId, gameTypeId, statusId, date, startTime, endTime, homeTeamId, awayTeamId, notes
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create game' } });
  }
});

/**
 * PATCH /games/:id - Update a game
 * Access: ADMIN or TEAM_ADMIN of home team
 */
router.patch('/:id', requireTeamAdmin(getGameTeamContext), validate(UpdateGameSchema), async (req: Request, res: Response) => {
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
    console.error('Error updating game:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update game' } });
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
    console.error('Error deleting game:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete game' } });
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
    console.error('Error fetching participants:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch participants' } });
  }
});

/**
 * POST /games/:gameId/participants - Add a participant
 * Access: TEAM_ADMIN of home team
 */
router.post('/:gameId/participants', requireTeamAdmin(getGameTeamContext), async (req: Request, res: Response) => {
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
    console.error('Error creating participant:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create participant' } });
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
    console.error('Error fetching officials:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch officials' } });
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
    console.error('Error creating official:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create official' } });
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
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch events' } });
  }
});

/**
 * POST /games/:gameId/events - Add an event
 * Access: TEAM_ADMIN of home team
 */
router.post('/:gameId/events', requireTeamAdmin(getGameTeamContext), async (req: Request, res: Response) => {
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
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create event' } });
  }
});

export default router;
