import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { user, userRole, person } from '../db/schema/index.js';
import { eq, and, ilike, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import { validate, handleRouteError, CreateUserSchema, UpdateUserSchema, AddRoleSchema, LinkPersonSchema } from '../validation/index.js';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const router: RouterType = Router();

router.use(requireAuth);

/**
 * POST /users - Create a new user (admin only)
 * Access: ADMIN only
 */
router.post('/', requireAdmin(), validate(CreateUserSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'Email already registered' } });
    }

    // Create user in a transaction
    const newUser = await db.transaction(async (tx) => {
      const [created] = await tx.insert(user).values({
        email,
        passwordHash: hashPassword(password),
        isVerified: true,
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

    // Get roles for response
    const roles = await db.select().from(userRole).where(eq(userRole.userId, newUser.id));

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        isVerified: newUser.isVerified,
        isActive: newUser.isActive,
        version: newUser.version,
        createdAt: newUser.createdAt,
        roles: roles.map(r => r.role),
        person: null,
      },
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create user');
  }
});

/**
 * GET /users - List all users (with optional search)
 * Access: ADMIN only
 */
router.get('/', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    let whereClause;
    if (search && typeof search === 'string') {
      whereClause = ilike(user.email, `%${search}%`);
    }

    const users = await db
      .select({
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        isActive: user.isActive,
        version: user.version,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(user.email);

    // Get roles for each user
    const userIds = users.map(u => u.id);
    const roles = userIds.length > 0 
      ? await db.select().from(userRole).where(or(...userIds.map(id => eq(userRole.userId, id))))
      : [];

    // Get linked persons
    const persons = userIds.length > 0
      ? await db.select().from(person).where(or(...userIds.map(id => eq(person.userId, id))))
      : [];

    const usersWithRoles = users.map(u => ({
      ...u,
      roles: roles.filter(r => r.userId === u.id).map(r => r.role),
      person: persons.find(p => p.userId === u.id) || null,
    }));

    res.json({ success: true, data: usersWithRoles });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch users');
  }
});

/**
 * GET /users/:id - Get a single user
 * Access: ADMIN only
 */
router.get('/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } });
    }

    const [found] = await db
      .select({
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        isActive: user.isActive,
        version: user.version,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!found) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const roles = await db.select().from(userRole).where(eq(userRole.userId, id));
    const [linkedPerson] = await db.select().from(person).where(eq(person.userId, id)).limit(1);

    res.json({ 
      success: true, 
      data: {
        ...found,
        roles: roles.map(r => r.role),
        person: linkedPerson || null,
      }
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to fetch user');
  }
});

/**
 * PATCH /users/:id - Update a user (activate/deactivate, verify)
 * Access: ADMIN only
 */
router.patch('/:id', requireAdmin(), validate(UpdateUserSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } });
    }

    const { isActive, isVerified, version } = req.body;

    const [updated] = await db
      .update(user)
      .set({
        ...(isActive !== undefined && { isActive }),
        ...(isVerified !== undefined && { isVerified }),
        version: version + 1,
      })
      .where(and(eq(user.id, id), eq(user.version, version)))
      .returning();

    if (!updated) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'User was modified' } });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update user');
  }
});

/**
 * POST /users/:id/roles - Add a role to a user
 * Access: ADMIN only
 */
router.post('/:id/roles', requireAdmin(), validate(AddRoleSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } });
    }

    const { role } = req.body;

    // Check if role already exists
    const [existing] = await db.select().from(userRole).where(and(eq(userRole.userId, id), eq(userRole.role, role))).limit(1);
    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User already has this role' } });
    }

    const [created] = await db.insert(userRole).values({ userId: id, role }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    handleRouteError(res, error, 'Failed to add role');
  }
});

/**
 * DELETE /users/:id/roles/:role - Remove a role from a user
 * Access: ADMIN only
 */
router.delete('/:id/roles/:role', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const role = req.params.role as 'ADMIN' | 'USER';
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } });
    }
    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid role is required' } });
    }

    const [deleted] = await db.delete(userRole).where(and(eq(userRole.userId, id), eq(userRole.role, role))).returning();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    res.json({ success: true, data: { message: 'Role removed' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to remove role');
  }
});

/**
 * POST /users/:id/link-person - Link a user to a person
 * Access: ADMIN only
 */
router.post('/:id/link-person', requireAdmin(), validate(LinkPersonSchema), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id ?? '', 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } });
    }

    const { personId } = req.body;

    // Check if person exists and isn't already linked
    const [existingPerson] = await db.select().from(person).where(eq(person.id, personId)).limit(1);
    if (!existingPerson) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Person not found' } });
    }
    if (existingPerson.userId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Person is already linked to a user' } });
    }

    // Link the person to the user
    const [updated] = await db
      .update(person)
      .set({ userId })
      .where(eq(person.id, personId))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to link person');
  }
});

/**
 * DELETE /users/:id/link-person - Unlink a user from their person
 * Access: ADMIN only
 */
router.delete('/:id/link-person', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id ?? '', 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } });
    }

    const [updated] = await db
      .update(person)
      .set({ userId: null })
      .where(eq(person.userId, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No linked person found' } });
    }

    res.json({ success: true, data: { message: 'Person unlinked' } });
  } catch (error) {
    handleRouteError(res, error, 'Failed to unlink person');
  }
});

export default router;
