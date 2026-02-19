import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { person, teamMember, team } from '../db/schema/index.js';
import { eq, and, ilike, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireAuthenticated, getPersonForUser, isAdmin, getTeamMembership, requireSandboxOwnerPermission, type SandboxEntityContext } from '../middleware/permissions.js';
import { validate, CreatePersonSchema, UpdatePersonSchema, handleRouteError } from '../validation/index.js';
import { sandboxFilter, getActiveSandboxId, getOrCreateTeamSandbox } from '../middleware/sandbox.js';

const router: RouterType = Router();

router.use(requireAuth);

// Helper to get sandbox entity context for a person
async function getPersonEntityContext(req: Request): Promise<SandboxEntityContext | null> {
  const personId = parseInt(req.params.id ?? '', 10);
  if (isNaN(personId)) return null;
  
  const [p] = await db
    .select({ id: person.id, sandboxId: person.sandboxId })
    .from(person)
    .where(eq(person.id, personId))
    .limit(1);
  
  if (!p) return null;
  
  // Persons don't have a direct team association - only sandbox ownership matters
  // Public persons require ADMIN to edit (unless it's their own profile via /me)
  return {
    sandboxId: p.sandboxId,
    entityTeamId: null,
  };
}

/**
 * GET /persons - List persons (with optional search)
 * Access: ADMIN or any Team ADMIN (persons are globally viewable by team admins)
 */
router.get('/', requireAuthenticated(), async (req: Request, res: Response) => {
  try {
    // Check if user is admin or has any team admin membership
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const userIsAdmin = isAdmin(req);
    
    // If not system admin, check if they're a team admin on any team
    if (!userIsAdmin) {
      const personId = await getPersonForUser(req.user.id);
      if (!personId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No person profile linked' } });
      }
      
      // Check if user has ADMIN permission on any team
      const adminMemberships = await db
        .select({ id: teamMember.id })
        .from(teamMember)
        .where(and(
          eq(teamMember.personId, personId),
          eq(teamMember.permission, 'ADMIN'),
          eq(teamMember.isActive, true)
        ))
        .limit(1);
      
      if (adminMemberships.length === 0) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Team admin access required' } });
      }
    }

    const { search } = req.query;
    
    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    let whereClause = and(eq(person.isActive, true), sandboxFilter(person.sandboxId, activeSandboxId))!;
    
    if (search && typeof search === 'string') {
      whereClause = and(
        whereClause,
        or(
          ilike(person.displayName, `%${search}%`),
          ilike(person.firstName, `%${search}%`),
          ilike(person.lastName, `%${search}%`),
          ilike(person.email, `%${search}%`)
        )
      )!;
    }

    const persons = await db.select().from(person).where(whereClause).orderBy(person.displayName);
    res.json({ success: true, data: persons });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch persons');
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
    handleRouteError(res, error, 'Failed to fetch person');
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

    const activeSandboxId = await getActiveSandboxId(req.user!.activeTeamId);
    const [found] = await db
      .select()
      .from(person)
      .where(and(
        eq(person.id, id),
        sandboxFilter(person.sandboxId, activeSandboxId)
      ))
      .limit(1);
    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Person not found' } });
    }

    res.json({ success: true, data: found });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch person');
  }
});

/**
 * POST /persons - Create a person
 * Access: ADMIN (can create free-floating) or Team ADMIN (must provide teamId, auto-creates membership)
 */
router.post('/', requireAuthenticated(), validate(CreatePersonSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const { 
      displayName, firstName, lastName, email, phone, dateOfBirth, userId,
      teamId, teamRoleId, positionId, jerseyNumber, title, permission 
    } = req.body;

    const userIsAdmin = isAdmin(req);

    // If not system admin, must provide teamId and be admin of that team
    if (!userIsAdmin) {
      if (!teamId) {
        return res.status(403).json({ 
          success: false, 
          error: { code: 'FORBIDDEN', message: 'Team admins must specify a team when creating persons' } 
        });
      }

      // Verify user is admin of the specified team
      const personId = await getPersonForUser(req.user.id);
      if (!personId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No person profile linked' } });
      }

      // Get team's active season
      const [teamData] = await db.select({ activeSeasonId: team.activeSeasonId }).from(team).where(eq(team.id, teamId)).limit(1);
      if (!teamData || !teamData.activeSeasonId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team has no active season' } });
      }

      const membership = await getTeamMembership(personId, teamId, teamData.activeSeasonId);
      if (!membership || membership.permission !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Must be admin of the specified team' } });
      }
    }

    // Check for duplicate email/phone if provided
    if (email) {
      const [existingEmail] = await db.select({ id: person.id }).from(person)
        .where(and(eq(person.email, email), eq(person.isActive, true))).limit(1);
      if (existingEmail) {
        return res.status(409).json({ 
          success: false, 
          error: { code: 'DUPLICATE', message: 'A person with this email already exists' } 
        });
      }
    }
    if (phone) {
      const [existingPhone] = await db.select({ id: person.id }).from(person)
        .where(and(eq(person.phone, phone), eq(person.isActive, true))).limit(1);
      if (existingPhone) {
        return res.status(409).json({ 
          success: false, 
          error: { code: 'DUPLICATE', message: 'A person with this phone number already exists' } 
        });
      }
    }

    // Create person and optionally team membership in a transaction
    const result = await db.transaction(async (tx) => {
      // If teamId provided, person goes into that team's sandbox
      // Otherwise (ADMIN creating), person is public
      let sandboxId: number | null = null;
      if (teamId) {
        sandboxId = await getOrCreateTeamSandbox(teamId);
      }

      const [created] = await tx.insert(person).values({ 
        displayName, firstName, lastName, email, phone, dateOfBirth, userId, sandboxId 
      }).returning();

      if (!created) throw new Error('Failed to create person');

      let membershipData = null;

      // If teamId provided, create team membership
      if (teamId) {
        const [teamData] = await tx.select({ activeSeasonId: team.activeSeasonId }).from(team).where(eq(team.id, teamId)).limit(1);
        if (!teamData || !teamData.activeSeasonId) {
          throw new Error('Team has no active season');
        }

        const [membership] = await tx.insert(teamMember).values({
          teamId,
          personId: created.id,
          seasonId: teamData.activeSeasonId,
          permission: permission || 'MEMBER',
          teamRoleId: teamRoleId || null,
          positionId: positionId || null,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
          title: title || null,
        }).returning();

        membershipData = membership;
      }

      return { person: created, membership: membershipData };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create person');
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
    handleRouteError(res, error, 'Failed to update person');
  }
});

/**
 * PATCH /persons/:id - Update a person
 * Access: ADMIN, or TEAM_ADMIN of sandbox owner (for sandboxed persons)
 */
router.patch('/:id', requireSandboxOwnerPermission(getPersonEntityContext), validate(UpdatePersonSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid person ID' } });
    }

    const { displayName, firstName, lastName, email, phone, dateOfBirth, version } = req.body;

    const [updated] = await db
      .update(person)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        version: version + 1,
      })
      .where(and(eq(person.id, id), eq(person.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Person was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update person');
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
    handleRouteError(res, error, 'Failed to delete person');
  }
});

export default router;
