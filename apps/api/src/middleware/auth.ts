import { type Request, type Response, type NextFunction } from 'express';
import { db } from '../db/index.js';
import { user, userRole } from '../db/schema/user.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        isVerified: boolean;
        isActive: boolean;
        roles: string[];
      };
    }
  }
}

// Simple session store (shared with auth routes - in production use Redis)
const sessions = new Map<string, { userId: number; expiresAt: Date }>();

export function getSession(token: string): { userId: number } | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }
  return { userId: session.userId };
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  sessions.set(token, { userId, expiresAt });
  return token;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

// Authentication middleware - requires valid session
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    const session = getSession(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }

    // Get user
    const [foundUser] = await db.select().from(user).where(eq(user.id, session.userId)).limit(1);
    if (!foundUser || !foundUser.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
      });
    }

    // Get roles
    const roles = await db.select().from(userRole).where(eq(userRole.userId, foundUser.id));

    // Attach user to request
    req.user = {
      id: foundUser.id,
      email: foundUser.email,
      isVerified: foundUser.isVerified,
      isActive: foundUser.isActive,
      roles: roles.map(r => r.role),
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' },
    });
  }
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
}

// Optional auth - attaches user if token present, but doesn't require it
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next();
    }

    const session = getSession(token);
    if (!session) {
      return next();
    }

    const [foundUser] = await db.select().from(user).where(eq(user.id, session.userId)).limit(1);
    if (foundUser && foundUser.isActive) {
      const roles = await db.select().from(userRole).where(eq(userRole.userId, foundUser.id));
      req.user = {
        id: foundUser.id,
        email: foundUser.email,
        isVerified: foundUser.isVerified,
        isActive: foundUser.isActive,
        roles: roles.map(r => r.role),
      };
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
}
