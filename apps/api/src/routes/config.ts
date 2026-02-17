import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { appConfig } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /config - Get all active config values (authenticated users)
 */
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const configs = await db.select().from(appConfig).where(eq(appConfig.isActive, true));

    // Convert to key-value object for easy consumption
    const configMap: Record<string, string | null> = {};
    for (const config of configs) {
      configMap[config.key] = config.value;
    }

    res.json({ success: true, data: configMap });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch config' } });
  }
});

/**
 * GET /config/all - Get all config entries with full details (admin only)
 */
router.get('/all', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const configs = await db.select().from(appConfig);
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error fetching all config:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch config' } });
  }
});

/**
 * GET /config/:key - Get a specific config value
 */
router.get('/:key', requireAuth, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const [config] = await db.select().from(appConfig).where(eq(appConfig.key, key));

    if (!config) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Config key not found' } });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch config' } });
  }
});

/**
 * PUT /config/:key - Create or update a config value (admin only)
 */
router.put('/:key', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description, isActive } = req.body;

    // Check if key exists
    const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, key));

    if (existing) {
      // Update existing
      const [updated] = await db.update(appConfig)
        .set({
          value: value ?? existing.value,
          description: description ?? existing.description,
          isActive: isActive ?? existing.isActive,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(appConfig.key, key))
        .returning();

      res.json({ success: true, data: updated });
    } else {
      // Create new
      const [created] = await db.insert(appConfig)
        .values({
          key,
          value: value ?? null,
          description: description ?? null,
          isActive: isActive ?? true,
        })
        .returning();

      res.status(201).json({ success: true, data: created });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update config' } });
  }
});

/**
 * DELETE /config/:key - Delete a config entry (admin only)
 */
router.delete('/:key', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const [deleted] = await db.delete(appConfig)
      .where(eq(appConfig.key, key))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Config key not found' } });
    }

    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete config' } });
  }
});

export default router;
