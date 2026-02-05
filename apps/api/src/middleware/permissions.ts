import { type Request, type Response, type NextFunction } from 'express';
import { db } from '../db/index.js';
import { teamMember, person, teamPermissionEnum } from '../db/schema/index.js';
import { sandbox } from '../db/schema/sandbox.js';
import { eq, and } from 'drizzle-orm';

// Permission levels for team access - derived from schema enum to prevent drift
// The enum values are: 'ADMIN', 'MEMBER', 'VIEWER'
export type TeamPermission = (typeof teamPermissionEnum.enumValues)[number];

/**
 * Grails-style security: DENY BY DEFAULT
 * 
 * Every route is locked to ADMIN only unless explicitly opened.
 * Use these middleware functions to grant access:
 * 
 * - requireAdmin()         → Only system ADMIN (default, most restrictive)
 * - requireTeamAdmin()     → ADMIN or TEAM_ADMIN for the resource's team
 * - requireTeamMember()    → ADMIN or any team member (TEAM_ADMIN or TEAM_MEMBER)
 * - requireAuthenticated() → Any logged-in user (least restrictive)
 */

/**
 * Check if user has ADMIN role
 */
export function isAdmin(req: Request): boolean {
  return req.user?.roles.includes('ADMIN') ?? false;
}

/**
 * Get user's person record (needed for team membership lookups)
 */
export async function getPersonForUser(userId: number): Promise<number | null> {
  const persons = await db
    .select({ id: person.id })
    .from(person)
    .where(eq(person.userId, userId))
    .limit(1);
  return persons.length > 0 && persons[0] ? persons[0].id : null;
}

/**
 * Get user's team membership for a specific team and season
 * If seasonId is 0, checks for any active membership on the team (returns highest permission)
 */
export async function getTeamMembership(
  personId: number,
  teamId: number,
  seasonId: number
): Promise<{ teamMemberId: number; permission: TeamPermission } | null> {
  // Build where clause - if seasonId is 0, don't filter by season
  const whereConditions = [
    eq(teamMember.personId, personId),
    eq(teamMember.teamId, teamId),
    eq(teamMember.isActive, true),
  ];
  
  if (seasonId !== 0) {
    whereConditions.push(eq(teamMember.seasonId, seasonId));
  }

  const memberships = await db
    .select({
      id: teamMember.id,
      permission: teamMember.permission,
    })
    .from(teamMember)
    .where(and(...whereConditions));

  if (memberships.length === 0) return null;

  // If multiple memberships (different seasons), return the one with highest permission
  const permissionLevels: Record<TeamPermission, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
  };

  const best = memberships.reduce((highest, current) => {
    const currentLevel = permissionLevels[current.permission as TeamPermission] ?? 0;
    const highestLevel = permissionLevels[highest.permission as TeamPermission] ?? 0;
    return currentLevel > highestLevel ? current : highest;
  });

  return {
    teamMemberId: best.id,
    permission: best.permission as TeamPermission,
  };
}

/**
 * Check if user has at least the required permission level
 */
export function hasPermission(
  userPermission: TeamPermission,
  requiredPermission: TeamPermission
): boolean {
  const levels: Record<TeamPermission, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
  };
  return levels[userPermission] >= levels[requiredPermission];
}

/**
 * Middleware: Require system ADMIN role (most restrictive - DEFAULT)
 * Use this for system-wide admin operations
 */
export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }

    next();
  };
}

/**
 * Middleware: Require authentication only (least restrictive)
 * Use sparingly - only for truly open endpoints like viewing own profile
 */
export function requireAuthenticated() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    next();
  };
}

/**
 * Middleware factory: Require team membership with minimum permission level
 * ADMIN users always pass. For non-admins, checks team_member permission.
 * 
 * @param getTeamAndSeason - Function to extract teamId and seasonId from request
 * @param minPermission - Minimum permission level required (TEAM_MEMBER or TEAM_ADMIN)
 */
export function requireTeamPermission(
  getTeamAndSeason: (req: Request) => Promise<{ teamId: number; seasonId: number } | null>,
  minPermission: TeamPermission
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // ADMIN bypasses team permission checks
      if (isAdmin(req)) {
        return next();
      }

      // Get team and season from request
      const context = await getTeamAndSeason(req);
      if (!context) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        });
      }

      // Get user's person record
      const personId = await getPersonForUser(req.user.id);
      if (!personId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No person profile linked to user' },
        });
      }

      // Check team membership
      const membership = await getTeamMembership(personId, context.teamId, context.seasonId);
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not a member of this team' },
        });
      }

      // Check permission level
      if (!hasPermission(membership.permission, minPermission)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: `Requires ${minPermission} permission` },
        });
      }

      // Attach membership info to request for use in route handlers
      (req as Request & { teamMembership: typeof membership }).teamMembership = membership;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Permission check failed' },
      });
    }
  };
}

/**
 * Convenience: Require ADMIN permission on team (or system ADMIN)
 */
export function requireTeamAdmin(
  getTeamAndSeason: (req: Request) => Promise<{ teamId: number; seasonId: number } | null>
) {
  return requireTeamPermission(getTeamAndSeason, 'ADMIN');
}

/**
 * Convenience: Require MEMBER permission on team (or system ADMIN)
 */
export function requireTeamMember(
  getTeamAndSeason: (req: Request) => Promise<{ teamId: number; seasonId: number } | null>
) {
  return requireTeamPermission(getTeamAndSeason, 'MEMBER');
}

/**
 * Middleware: Require ADMIN role OR TEAM_ADMIN with an active team selected
 * Used for entity creation where:
 * - ADMIN creates public entities (no activeTeamId needed)
 * - TEAM_ADMIN creates sandboxed entities (requires activeTeamId)
 */
export function requireAdminOrTeamAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // System ADMIN can always proceed
      if (isAdmin(req)) {
        return next();
      }

      // Non-admin must have an active team selected
      const activeTeamId = req.user.activeTeamId;
      if (!activeTeamId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Must have an active team selected' },
        });
      }

      // Get user's person record
      const personId = await getPersonForUser(req.user.id);
      if (!personId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No person profile linked to user' },
        });
      }

      // Check if user is ADMIN on their active team (any season)
      const adminMemberships = await db
        .select({ id: teamMember.id })
        .from(teamMember)
        .where(
          and(
            eq(teamMember.personId, personId),
            eq(teamMember.teamId, activeTeamId),
            eq(teamMember.permission, 'ADMIN'),
            eq(teamMember.isActive, true)
          )
        )
        .limit(1);

      if (adminMemberships.length === 0) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Team admin access required' },
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Permission check failed' },
      });
    }
  };
}

/**
 * Get the owning team ID for a sandbox.
 */
async function getSandboxOwnerTeamId(sandboxId: number): Promise<number | null> {
  const [found] = await db
    .select({ teamId: sandbox.teamId })
    .from(sandbox)
    .where(eq(sandbox.id, sandboxId))
    .limit(1);
  return found?.teamId ?? null;
}

/**
 * Check if user is TEAM_ADMIN of a specific team (any season)
 */
async function isTeamAdmin(personId: number, teamId: number): Promise<boolean> {
  const memberships = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(
      and(
        eq(teamMember.personId, personId),
        eq(teamMember.teamId, teamId),
        eq(teamMember.permission, 'ADMIN'),
        eq(teamMember.isActive, true)
      )
    )
    .limit(1);
  return memberships.length > 0;
}

/**
 * Context for sandbox-aware permission checks.
 * - sandboxId: The entity's sandboxId (null if public)
 * - entityTeamId: The entity's direct team association (e.g., team.id, game.homeTeamId)
 */
export interface SandboxEntityContext {
  sandboxId: number | null;
  entityTeamId: number | null;
}

/**
 * Middleware: Sandbox-aware permission check for entity management.
 * 
 * Permission logic:
 * 1. System ADMIN → always allowed
 * 2. If entity is sandboxed (sandboxId set):
 *    - User's activeTeamId must match the sandbox's owning team
 *    - User must be TEAM_ADMIN of that owning team
 * 3. If entity is public (sandboxId null) and has a direct team:
 *    - User's activeTeamId must match the entity's team
 *    - User must be TEAM_ADMIN of that team
 * 4. Otherwise → denied
 * 
 * @param getEntityContext - Function to extract sandboxId and entityTeamId from request
 */
export function requireSandboxOwnerPermission(
  getEntityContext: (req: Request) => Promise<SandboxEntityContext | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // 1. System ADMIN bypasses all checks
      if (isAdmin(req)) {
        return next();
      }

      // Get entity context
      const context = await getEntityContext(req);
      if (!context) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        });
      }

      // Get user's person record
      const personId = await getPersonForUser(req.user.id);
      if (!personId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No person profile linked to user' },
        });
      }

      const activeTeamId = req.user.activeTeamId;
      if (!activeTeamId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Must have an active team selected' },
        });
      }

      // 2. If entity is sandboxed, check sandbox ownership
      if (context.sandboxId !== null) {
        const sandboxOwnerTeamId = await getSandboxOwnerTeamId(context.sandboxId);
        
        if (sandboxOwnerTeamId === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Sandbox not found' },
          });
        }

        // activeTeamId must match sandbox owner
        if (activeTeamId !== sandboxOwnerTeamId) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Not authorized for this sandbox' },
          });
        }

        // User must be TEAM_ADMIN of the sandbox owner team
        if (!(await isTeamAdmin(personId, sandboxOwnerTeamId))) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Team admin access required' },
          });
        }

        return next();
      }

      // 3. If entity is public and has a direct team, check team admin
      if (context.entityTeamId !== null) {
        // activeTeamId must match entity's team
        if (activeTeamId !== context.entityTeamId) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Not authorized for this team' },
          });
        }

        // User must be TEAM_ADMIN of that team
        if (!(await isTeamAdmin(personId, context.entityTeamId))) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Team admin access required' },
          });
        }

        return next();
      }

      // 4. Public entity with no team context - only ADMIN can manage
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Permission check failed' },
      });
    }
  };
}
