import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { teamRole, playerPosition, gameType, gameStatus, gameEventType } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import { validate, handleRouteError, CreateLookupSchema } from '../validation/index.js';

const router: RouterType = Router();

// All lookup routes require authentication
router.use(requireAuth);

/**
 * GET /team-roles - List all team roles
 * Access: Any authenticated user (read-only lookup data)
 */
router.get('/team-roles', async (_req: Request, res: Response) => {
  try {
    const roles = await db
      .select()
      .from(teamRole)
      .where(eq(teamRole.isActive, true))
      .orderBy(teamRole.name);

    res.json({ success: true, data: roles });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch team roles');
  }
});

/**
 * POST /team-roles - Create a team role
 * Access: ADMIN only
 */
router.post('/team-roles', requireAdmin(), validate(CreateLookupSchema), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const [created] = await db
      .insert(teamRole)
      .values({ name, description })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Team role with this name already exists' },
      });
    }
    handleRouteError(res, error, 'Failed to create team role');
  }
});

/**
 * GET /player-positions - List all player positions
 * Access: Any authenticated user
 */
router.get('/player-positions', async (_req: Request, res: Response) => {
  try {
    const positions = await db
      .select()
      .from(playerPosition)
      .where(eq(playerPosition.isActive, true))
      .orderBy(playerPosition.name);

    res.json({ success: true, data: positions });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch player positions');
  }
});

/**
 * POST /player-positions - Create a player position
 * Access: ADMIN only
 */
router.post('/player-positions', requireAdmin(), validate(CreateLookupSchema), async (req: Request, res: Response) => {
  try {
    const { name, shortName, description } = req.body;

    const [created] = await db
      .insert(playerPosition)
      .values({ name, shortName, description })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Player position with this name already exists' },
      });
    }
    handleRouteError(res, error, 'Failed to create player position');
  }
});

/**
 * GET /game-types - List all game types
 * Access: Any authenticated user
 */
router.get('/game-types', async (_req: Request, res: Response) => {
  try {
    const types = await db
      .select()
      .from(gameType)
      .where(eq(gameType.isActive, true))
      .orderBy(gameType.name);

    res.json({ success: true, data: types });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch game types');
  }
});

/**
 * POST /game-types - Create a game type
 * Access: ADMIN only
 */
router.post('/game-types', requireAdmin(), validate(CreateLookupSchema), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const [created] = await db
      .insert(gameType)
      .values({ name, description })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Game type with this name already exists' },
      });
    }
    handleRouteError(res, error, 'Failed to create game type');
  }
});

/**
 * GET /game-statuses - List all game statuses
 * Access: Any authenticated user
 */
router.get('/game-statuses', async (_req: Request, res: Response) => {
  try {
    const statuses = await db
      .select()
      .from(gameStatus)
      .where(eq(gameStatus.isActive, true))
      .orderBy(gameStatus.name);

    res.json({ success: true, data: statuses });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch game statuses');
  }
});

/**
 * POST /game-statuses - Create a game status
 * Access: ADMIN only
 */
router.post('/game-statuses', requireAdmin(), validate(CreateLookupSchema), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const [created] = await db
      .insert(gameStatus)
      .values({ name })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Game status with this name already exists' },
      });
    }
    handleRouteError(res, error, 'Failed to create game status');
  }
});

/**
 * GET /game-event-types - List all game event types
 * Access: Any authenticated user
 */
router.get('/game-event-types', async (_req: Request, res: Response) => {
  try {
    const types = await db
      .select()
      .from(gameEventType)
      .where(eq(gameEventType.isActive, true))
      .orderBy(gameEventType.name);

    res.json({ success: true, data: types });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch game event types');
  }
});

/**
 * POST /game-event-types - Create a game event type
 * Access: ADMIN only
 */
router.post('/game-event-types', requireAdmin(), validate(CreateLookupSchema), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const [created] = await db
      .insert(gameEventType)
      .values({ name, description })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Game event type with this name already exists' },
      });
    }
    handleRouteError(res, error, 'Failed to create game event type');
  }
});

export default router;
