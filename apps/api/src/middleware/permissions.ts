import { type Request, type Response, type NextFunction } from 'express';
import { db } from '../db/index.js';
import { teamMember, person } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

// Permission levels for team access (from schema enum)
export type TeamPermission = 'TEAM_ADMIN' | 'TEAM_MEMBER';

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
 */
export async function getTeamMembership(
  personId: number,
  teamId: number,
  seasonId: number
): Promise<{ teamMemberId: number; permission: TeamPermission } | null> {
  const memberships = await db
    .select({
      id: teamMember.id,
      permission: teamMember.permission,
    })
    .from(teamMember)
    .where(
      and(
        eq(teamMember.personId, personId),
        eq(teamMember.teamId, teamId),
        eq(teamMember.seasonId, seasonId),
        eq(teamMember.isActive, true)
      )
    );

  const first = memberships[0];
  if (!first) return null;

  return {
    teamMemberId: first.id,
    permission: first.permission as TeamPermission,
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
    TEAM_MEMBER: 1,
    TEAM_ADMIN: 2,
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
 * Convenience: Require TEAM_ADMIN permission (or system ADMIN)
 */
export function requireTeamAdmin(
  getTeamAndSeason: (req: Request) => Promise<{ teamId: number; seasonId: number } | null>
) {
  return requireTeamPermission(getTeamAndSeason, 'TEAM_ADMIN');
}

/**
 * Convenience: Require TEAM_MEMBER permission (or system ADMIN)
 */
export function requireTeamMember(
  getTeamAndSeason: (req: Request) => Promise<{ teamId: number; seasonId: number } | null>
) {
  return requireTeamPermission(getTeamAndSeason, 'TEAM_MEMBER');
}
