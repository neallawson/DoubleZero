import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { person } from '../db/schema/index.js';
import { eq, and, ilike, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, getPersonForUser } from '../middleware/permissions.js';

const router: RouterType = Router();

router.use(requireAuth);

/**
 * GET /persons - List persons (with optional search)
 * Access: ADMIN only (persons are private data)
 */
router.get('/', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    let query = db.select().from(person).where(eq(person.isActive, true));
    
    if (search && typeof search === 'string') {
      query = db.select().from(person).where(
        and(
          eq(person.isActive, true),
          or(
            ilike(person.displayName, `%${search}%`),
            ilike(person.firstName, `%${search}%`),
            ilike(person.lastName, `%${search}%`),
            ilike(person.email, `%${search}%`)
          )
        )
      );
    }

    const persons = await query.orderBy(person.displayName);
    res.json({ success: true, data: persons });
  } catch (error) {
    console.error('Error fetching persons:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch persons' } });
  }
});

/**
 * GET /persons/me - Get current user's person profile
 * Access: Any authenticated user
 */
router.get('/me', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const personId = await getPersonForUser(req.user.id);
    if (!personId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Person profile not found' } });
    }

    const [found] = await db.select().from(person).where(eq(person.id, personId)).limit(1);
    res.json({ success: true, data: found });
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch person' } });
  }
});

/**
 * GET /persons/:id - Get a single person
 * Access: ADMIN only
 */
router.get('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid person ID' } });
    }

    const [found] = await db.select().from(person).where(eq(person.id, id)).limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Person not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch person' } });
  }
});

/**
 * POST /persons - Create a person
 * Access: ADMIN only
 */
router.post('/', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { displayName, firstName, lastName, email, phone, dateOfBirth, userId } = req.body;

    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Display name is required' } });
    }

    const [created] = await db.insert(person).values({ 
      displayName, firstName, lastName, email, phone, dateOfBirth, userId 
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create person' } });
  }
});

/**
 * PATCH /persons/me - Update current user's person profile
 * Access: Any authenticated user (own profile only)
 */
router.patch('/me', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const personId = await getPersonForUser(req.user.id);
    if (!personId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Person profile not found' } });
    }

    const { displayName, firstName, lastName, phone, dateOfBirth, version } = req.body;

    if (typeof version !== 'number') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Version is required' } });
    }

    const [updated] = await db
      .update(person)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        version: version + 1,
      })
      .where(and(eq(person.id, personId), eq(person.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Profile was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update person' } });
  }
});

/**
 * PATCH /persons/:id - Update a person
 * Access: ADMIN only
 */
router.patch('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid person ID' } });
    }

    const { displayName, firstName, lastName, email, phone, dateOfBirth, isActive, version } = req.body;

    if (typeof version !== 'number') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Version is required' } });
    }

    const [updated] = await db
      .update(person)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        ...(isActive !== undefined && { isActive }),
        version: version + 1,
      })
      .where(and(eq(person.id, id), eq(person.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Person was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update person' } });
  }
});

/**
 * DELETE /persons/:id - Soft delete a person
 * Access: ADMIN only
 */
router.delete('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid person ID' } });
    }

    const [deleted] = await db.update(person).set({ isActive: false }).where(eq(person.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Person not found' } });
    }

    res.json({ success: true, data: { message: 'Person deleted' } });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete person' } });
  }
});

export default router;
