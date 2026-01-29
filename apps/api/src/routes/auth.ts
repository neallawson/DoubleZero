import { Router, type Request, type Response, type IRouter } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { user, userRole } from '../db/schema/user.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { createSession, getSession, deleteSession } from '../middleware/auth.js';

const router: IRouter = Router();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Simple password hashing (in production, use bcrypt or argon2)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const { email, password } = parsed.data;

    // Check if user already exists
    const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'Email already registered' },
      });
    }

    // Create user in a transaction
    const newUser = await db.transaction(async (tx) => {
      // Create user
      const [created] = await tx.insert(user).values({
        email,
        passwordHash: hashPassword(password),
        isVerified: false,
        isActive: true,
      }).returning();

      if (!created) throw new Error('Failed to create user');

      // Assign default USER role
      await tx.insert(userRole).values({
        userId: created.id,
        role: 'USER',
      });

      return created;
    });

    // Create session
    const token = createSession(newUser.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          isVerified: newUser.isVerified,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' },
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const { email, password } = parsed.data;

    // Find user
    const [foundUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (!foundUser || !foundUser.passwordHash) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Verify password
    if (!verifyPassword(password, foundUser.passwordHash)) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Check if active
    if (!foundUser.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled' },
      });
    }

    // Create session
    const token = createSession(foundUser.id);

    res.json({
      success: true,
      data: {
        user: {
          id: foundUser.id,
          email: foundUser.email,
          isVerified: foundUser.isVerified,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    deleteSession(token);
  }
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
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

    // Get user with roles
    const [foundUser] = await db.select().from(user).where(eq(user.id, session.userId)).limit(1);
    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    // Get roles
    const roles = await db.select().from(userRole).where(eq(userRole.userId, foundUser.id));

    res.json({
      success: true,
      data: {
        id: foundUser.id,
        email: foundUser.email,
        isVerified: foundUser.isVerified,
        isActive: foundUser.isActive,
        roles: roles.map(r => r.role),
        createdAt: foundUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' },
    });
  }
});

export default router;
