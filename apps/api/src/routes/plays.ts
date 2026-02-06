import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { play, playPlayer, playAnnotation, fieldTemplate } from '../db/schema/index.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAuthenticated } from '../middleware/permissions.js';
import { validate, CreatePlaySchema, UpdatePlaySchema, BulkPlayPlayersSchema, BulkPlayAnnotationsSchema } from '../validation/index.js';
import { sandboxFilter, getActiveSandboxId, getOrCreateTeamSandbox } from '../middleware/sandbox.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to check if user is owner of a play
async function isPlayOwner(playId: number, userId: number): Promise<boolean> {
  const [p] = await db
    .select({ ownerId: play.ownerId })
    .from(play)
    .where(eq(play.id, playId))
    .limit(1);

  return p?.ownerId === userId;
}

/**
 * GET /plays - List plays (optionally filtered by tags, teamId)
 * Access: Any authenticated user (sees own plays + team plays if active team)
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const { teamId, tags } = req.query;
    const userId = req.user!.id;
    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);

    // Build where clause: user's own plays OR plays in their sandbox
    let whereClause = or(
      eq(play.ownerId, userId),
      sandboxFilter(play.sandboxId, activeSandboxId)
    );

    if (teamId) {
      const tid = parseInt(teamId as string, 10);
      whereClause = and(whereClause, eq(play.teamId, tid))!;
    }

    const plays = await db
      .select()
      .from(play)
      .where(whereClause)
      .orderBy(desc(play.updatedAt));

    // Filter by tags if provided (client-side for now, could optimize with SQL array ops)
    let result = plays;
    if (tags) {
      const tagList = (tags as string).split(',').map(t => t.trim().toLowerCase());
      result = plays.filter(p =>
        p.tags?.some(t => tagList.includes(t.toLowerCase()))
      );
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching plays:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch plays' } });
  }
});

/**
 * GET /plays/field-templates - List available field templates
 * Access: Any authenticated user
 */
router.get('/field-templates', requireAuthenticated(), async (_req: Request, res: Response) => {
  try {
    const templates = await db
      .select()
      .from(fieldTemplate)
      .where(eq(fieldTemplate.isActive, true));

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching field templates:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch field templates' } });
  }
});

/**
 * GET /plays/:id - Get a single play with players and annotations
 * Access: Owner or team member with access
 */
router.get('/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const userId = req.user!.id;
    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);

    // Check access: owner OR sandbox access
    const [found] = await db
      .select()
      .from(play)
      .where(and(
        eq(play.id, id),
        or(
          eq(play.ownerId, userId),
          sandboxFilter(play.sandboxId, activeSandboxId)
        )
      ))
      .limit(1);

    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Play not found' } });
    }

    // Fetch players and annotations
    const players = await db.select().from(playPlayer).where(eq(playPlayer.playId, id));
    const annotations = await db.select().from(playAnnotation).where(eq(playAnnotation.playId, id));

    res.json({
      success: true,
      data: {
        ...found,
        players,
        annotations,
      }
    });
  } catch (error) {
    console.error('Error fetching play:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch play' } });
  }
});

/**
 * POST /plays - Create a play
 * Access: Any authenticated user (creates as owner)
 */
router.post('/', requireAuthenticated(), validate(CreatePlaySchema), async (req: Request, res: Response) => {
  try {
    const { name, description, tags, teamId, fieldTemplateId, clientId } = req.body;
    const userId = req.user!.id;
    const activeTeamId = req.user!.activeTeamId;

    // Determine sandboxId based on context
    let sandboxId: number | null = null;
    if (activeTeamId) {
      sandboxId = await getOrCreateTeamSandbox(activeTeamId);
    }

    // Use default field template if not specified
    let templateId = fieldTemplateId;
    if (!templateId) {
      const [defaultTemplate] = await db
        .select({ id: fieldTemplate.id })
        .from(fieldTemplate)
        .where(eq(fieldTemplate.isDefault, true))
        .limit(1);
      templateId = defaultTemplate?.id;
    }

    const [created] = await db.insert(play).values({
      ownerId: userId,
      teamId: teamId ?? activeTeamId,
      sandboxId,
      name,
      description,
      tags,
      fieldTemplateId: templateId,
      clientId,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating play:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create play' } });
  }
});

/**
 * PATCH /plays/:id - Update a play
 * Access: Owner only
 */
router.patch('/:id', requireAuthenticated(), validate(UpdatePlaySchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const userId = req.user!.id;

    // Check ownership
    if (!await isPlayOwner(id, userId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to update this play' } });
    }

    const { name, description, tags, viewportZoom, viewportPanX, viewportPanY, version } = req.body;

    const [updated] = await db
      .update(play)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(tags !== undefined && { tags }),
        ...(viewportZoom !== undefined && { viewportZoom }),
        ...(viewportPanX !== undefined && { viewportPanX }),
        ...(viewportPanY !== undefined && { viewportPanY }),
        updatedAt: new Date(),
        version: version + 1,
      })
      .where(and(eq(play.id, id), eq(play.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Play was modified by another user' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating play:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update play' } });
  }
});

/**
 * DELETE /plays/:id - Delete a play
 * Access: Owner only
 */
router.delete('/:id', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const userId = req.user!.id;

    // Check ownership
    if (!await isPlayOwner(id, userId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete this play' } });
    }

    // Cascade delete handles players and annotations
    const [deleted] = await db.delete(play).where(eq(play.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Play not found' } });
    }

    res.json({ success: true, data: { message: 'Play deleted' } });
  } catch (error) {
    console.error('Error deleting play:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete play' } });
  }
});

// ============ PLAY PLAYERS ============

/**
 * PUT /plays/:playId/players - Bulk replace all players on a play
 * Access: Owner only
 */
router.put('/:playId/players', requireAuthenticated(), validate(BulkPlayPlayersSchema), async (req: Request, res: Response) => {
  try {
    const playId = parseInt(req.params.playId ?? '', 10);
    if (isNaN(playId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const userId = req.user!.id;

    // Check ownership
    if (!await isPlayOwner(playId, userId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to modify this play' } });
    }

    const { players } = req.body;

    // Delete existing players
    await db.delete(playPlayer).where(eq(playPlayer.playId, playId));

    // Insert new players
    if (players.length > 0) {
      const playersWithPlayId = players.map((p: any) => ({
        playId,
        teamMemberId: p.teamMemberId,
        xMeters: p.xMeters,
        yMeters: p.yMeters,
        displayNumber: p.displayNumber,
        displayName: p.displayName,
        teamColorOverride: p.teamColorOverride,
        teamSide: p.teamSide ?? 0,
        zIndex: p.zIndex ?? 0,
      }));

      await db.insert(playPlayer).values(playersWithPlayId);
    }

    // Update play's updatedAt
    await db.update(play).set({ updatedAt: new Date() }).where(eq(play.id, playId));

    // Fetch and return the updated players
    const updatedPlayers = await db.select().from(playPlayer).where(eq(playPlayer.playId, playId));

    res.json({ success: true, data: updatedPlayers });
  } catch (error) {
    console.error('Error updating play players:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update play players' } });
  }
});

/**
 * GET /plays/:playId/players - List players on a play
 * Access: Owner or team member with access
 */
router.get('/:playId/players', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const playId = parseInt(req.params.playId ?? '', 10);
    if (isNaN(playId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const players = await db.select().from(playPlayer).where(eq(playPlayer.playId, playId));
    res.json({ success: true, data: players });
  } catch (error) {
    console.error('Error fetching play players:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch play players' } });
  }
});

// ============ PLAY ANNOTATIONS ============

/**
 * PUT /plays/:playId/annotations - Bulk replace all annotations on a play
 * Access: Owner only
 */
router.put('/:playId/annotations', requireAuthenticated(), validate(BulkPlayAnnotationsSchema), async (req: Request, res: Response) => {
  try {
    const playId = parseInt(req.params.playId ?? '', 10);
    if (isNaN(playId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const userId = req.user!.id;

    // Check ownership
    if (!await isPlayOwner(playId, userId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to modify this play' } });
    }

    const { annotations } = req.body;

    // Delete existing annotations
    await db.delete(playAnnotation).where(eq(playAnnotation.playId, playId));

    // Insert new annotations
    if (annotations.length > 0) {
      const annotationsWithPlayId = annotations.map((a: any) => ({
        playId,
        annotationType: a.annotationType,
        startX: a.startX,
        startY: a.startY,
        endX: a.endX,
        endY: a.endY,
        color: a.color ?? '#ffffff',
        strokeWidth: a.strokeWidth ?? 2,
        zIndex: a.zIndex ?? 0,
      }));

      await db.insert(playAnnotation).values(annotationsWithPlayId);
    }

    // Update play's updatedAt
    await db.update(play).set({ updatedAt: new Date() }).where(eq(play.id, playId));

    // Fetch and return the updated annotations
    const updatedAnnotations = await db.select().from(playAnnotation).where(eq(playAnnotation.playId, playId));

    res.json({ success: true, data: updatedAnnotations });
  } catch (error) {
    console.error('Error updating play annotations:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update play annotations' } });
  }
});

/**
 * GET /plays/:playId/annotations - List annotations on a play
 * Access: Owner or team member with access
 */
router.get('/:playId/annotations', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const playId = parseInt(req.params.playId ?? '', 10);
    if (isNaN(playId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid play ID' } });
    }

    const annotations = await db.select().from(playAnnotation).where(eq(playAnnotation.playId, playId));
    res.json({ success: true, data: annotations });
  } catch (error) {
    console.error('Error fetching play annotations:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch play annotations' } });
  }
});

// ============ OFFLINE SYNC ============

/**
 * POST /plays/sync - Sync plays from offline client
 * Access: Any authenticated user
 *
 * This endpoint handles bulk sync of plays created/modified offline.
 * Uses clientId for conflict detection and last-write-wins resolution.
 */
router.post('/sync', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const activeTeamId = req.user!.activeTeamId;
    const { plays: syncPlays } = req.body;

    if (!Array.isArray(syncPlays)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'plays must be an array' } });
    }

    let sandboxId: number | null = null;
    if (activeTeamId) {
      sandboxId = await getOrCreateTeamSandbox(activeTeamId);
    }

    // Get default field template
    const [defaultTemplate] = await db
      .select({ id: fieldTemplate.id })
      .from(fieldTemplate)
      .where(eq(fieldTemplate.isDefault, true))
      .limit(1);

    const results: any[] = [];

    for (const syncPlay of syncPlays) {
      const { clientId, serverId, play: playData, players, annotations, deletedAt } = syncPlay;

      try {
        if (deletedAt && serverId) {
          // Handle deletion
          const isOwner = await isPlayOwner(serverId, userId);
          if (isOwner) {
            await db.delete(play).where(eq(play.id, serverId));
            results.push({ clientId, serverId, status: 'deleted' });
          } else {
            results.push({ clientId, serverId, status: 'error', message: 'Not authorized to delete' });
          }
          continue;
        }

        if (serverId) {
          // Update existing play
          const isOwner = await isPlayOwner(serverId, userId);
          if (!isOwner) {
            results.push({ clientId, serverId, status: 'error', message: 'Not authorized to update' });
            continue;
          }

          await db
            .update(play)
            .set({
              name: playData.name,
              description: playData.description,
              tags: playData.tags,
              updatedAt: new Date(),
              lastSyncedAt: new Date(),
            })
            .where(eq(play.id, serverId));

          // Replace players
          await db.delete(playPlayer).where(eq(playPlayer.playId, serverId));
          if (players?.length > 0) {
            await db.insert(playPlayer).values(
              players.map((p: any) => ({ ...p, playId: serverId }))
            );
          }

          // Replace annotations
          await db.delete(playAnnotation).where(eq(playAnnotation.playId, serverId));
          if (annotations?.length > 0) {
            await db.insert(playAnnotation).values(
              annotations.map((a: any) => ({ ...a, playId: serverId }))
            );
          }

          results.push({ clientId, serverId, status: 'updated' });
        } else {
          // Create new play
          const [created] = await db.insert(play).values({
            ownerId: userId,
            teamId: activeTeamId,
            sandboxId,
            name: playData.name,
            description: playData.description,
            tags: playData.tags,
            fieldTemplateId: playData.fieldTemplateId ?? defaultTemplate?.id,
            clientId,
            lastSyncedAt: new Date(),
          }).returning();

          if (!created) {
            results.push({ clientId, serverId: null, status: 'error', message: 'Failed to create play' });
            continue;
          }

          // Insert players
          if (players?.length > 0) {
            await db.insert(playPlayer).values(
              players.map((p: any) => ({ ...p, playId: created.id }))
            );
          }

          // Insert annotations
          if (annotations?.length > 0) {
            await db.insert(playAnnotation).values(
              annotations.map((a: any) => ({ ...a, playId: created.id }))
            );
          }

          results.push({ clientId, serverId: created.id, status: 'created' });
        }
      } catch (err) {
        console.error(`Error syncing play ${clientId}:`, err);
        results.push({ clientId, serverId, status: 'error', message: 'Sync failed' });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        serverTimestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error syncing plays:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync plays' } });
  }
});

export default router;
