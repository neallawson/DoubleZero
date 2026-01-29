import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { location } from '../db/schema/index.js';
import { eq, and, ilike } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated } from '../middleware/permissions.js';

const router: RouterType = Router();

router.use(requireAuth);

/**
 * GET /locations - List all locations
 * Access: Any authenticated user
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    let whereClause = eq(location.isActive, true);
    if (search && typeof search === 'string') {
      whereClause = and(eq(location.isActive, true), ilike(location.name, `%${search}%`))!;
    }

    const locations = await db.select().from(location).where(whereClause).orderBy(location.name);
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch locations' } });
  }
});

/**
 * GET /locations/:id - Get a single location
 * Access: Any authenticated user
 */
router.get('/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid location ID' } });
    }

    const [found] = await db.select().from(location).where(eq(location.id, id)).limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch location' } });
  }
});

/**
 * POST /locations - Create a location
 * Access: ADMIN only
 */
router.post('/', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { name, address, city, state, zip, country, homeTeamId } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
    }

    const [created] = await db.insert(location).values({ 
      name, address, city, state, zip, country, homeTeamId 
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create location' } });
  }
});

/**
 * PATCH /locations/:id - Update a location
 * Access: ADMIN only
 */
router.patch('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid location ID' } });
    }

    const { name, address, city, state, zip, country, homeTeamId, isActive, version } = req.body;

    if (typeof version !== 'number') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Version is required' } });
    }

    const [updated] = await db
      .update(location)
      .set({
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(country !== undefined && { country }),
        ...(homeTeamId !== undefined && { homeTeamId }),
        ...(isActive !== undefined && { isActive }),
        version: version + 1,
      })
      .where(and(eq(location.id, id), eq(location.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Location was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update location' } });
  }
});

/**
 * DELETE /locations/:id - Soft delete a location
 * Access: ADMIN only
 */
router.delete('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid location ID' } });
    }

    const [deleted] = await db.update(location).set({ isActive: false }).where(eq(location.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
    }

    res.json({ success: true, data: { message: 'Location deleted' } });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete location' } });
  }
});

export default router;
