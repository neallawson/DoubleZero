# Authentication & Security

## Authentication Strategy

### Better-Auth Integration

We'll use **Better-Auth** as our authentication library. It provides:

- Email/password authentication
- OAuth providers (Google, Apple, Facebook)
- Session management with JWT
- Email verification & password reset
- Rate limiting
- CSRF protection

### Setup

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: false, // Optional but encouraged
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 24 hours
    refreshToken: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },
});
```

### Express Integration

```typescript
// routes/auth.ts
import { toExpressHandler } from 'better-auth/express';
import { auth } from '../lib/auth';

// Mount all auth routes
router.all('/api/auth/*', toExpressHandler(auth));
```

---

## Authorization (RBAC)

### Two-Level Role System

1. **App Roles**: Global application permissions
2. **Team Roles**: Locker room / team-specific permissions

### App Roles

| Role | Description |
|------|-------------|
| `ADMIN` | System administrator; full access |
| `USER` | Standard authenticated user |

Stored in `user_roles` table (Better-Auth may manage this).

### Team Roles (per Locker Room)

| Role | Permissions |
|------|-------------|
| `OWNER` | Full control of locker room |
| `HEAD_COACH` | Manage roster, games, share publicly |
| `COACH` | Edit games, view roster |
| `MANAGER` | Admin tasks, calendar, communications |
| `PLAYER` | View roster, own stats, chat |
| `PARENT` | View linked player's info |

Stored via `team_roster` or a dedicated `locker_room_members` table.

### Permission Checks

```typescript
// middleware/authorize.ts
export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!roles.some(role => req.user.roles.includes(role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

export function requireTeamRole(lockerRoomId: number, ...roles: TeamRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const membership = await getLockerRoomMembership(req.user.id, lockerRoomId);
    
    if (!membership || !roles.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient team permissions' });
    }
    
    next();
  };
}
```

### Usage in Routes

```typescript
// Only admin can create leagues
router.post('/leagues', 
  authenticate, 
  requireRole('ADMIN'),
  createLeague
);

// Only head coach or owner can modify roster
router.post('/teams/:id/roster',
  authenticate,
  requireTeamRole(req.params.id, 'OWNER', 'HEAD_COACH'),
  addToRoster
);
```

---

## Permissions Matrix

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| **Locker Room** | USER | MEMBER | OWNER | OWNER |
| **Team** | OWNER | MEMBER | OWNER, HEAD_COACH | OWNER |
| **Person** | OWNER, HEAD_COACH, MANAGER | MEMBER | OWNER, HEAD_COACH, MANAGER | OWNER, HEAD_COACH |
| **Roster** | OWNER, HEAD_COACH | MEMBER | OWNER, HEAD_COACH | OWNER, HEAD_COACH |
| **Game** | OWNER, HEAD_COACH, COACH | MEMBER | OWNER, HEAD_COACH, COACH | OWNER, HEAD_COACH |
| **Game Events** | OWNER, HEAD_COACH, COACH | MEMBER | OWNER, HEAD_COACH, COACH | OWNER, HEAD_COACH |
| **Calendar** | OWNER, HEAD_COACH, MANAGER | MEMBER | OWNER, HEAD_COACH, MANAGER | OWNER, HEAD_COACH, MANAGER |
| **Chat** | MEMBER | MEMBER | AUTHOR | AUTHOR, OWNER |
| **Public Sharing** | OWNER, HEAD_COACH | PUBLIC | OWNER, HEAD_COACH | OWNER, HEAD_COACH |
| **League** | ADMIN | ALL | ADMIN | ADMIN |
| **Season** | ADMIN | ALL | ADMIN | ADMIN |
| **Audit Logs** | — | ADMIN | — | — |

---

## Security Best Practices

### Password Security

- Passwords hashed with bcrypt (cost factor 12+)
- Never log or return passwords
- Rate limit login attempts (10/min per IP)
- Lock account after 5 failed attempts (30 min cooldown)

### JWT Security

- Short-lived access tokens (15-60 min)
- Long-lived refresh tokens (30 days) with rotation
- Store refresh token hash in DB, not the token itself
- Revoke all tokens on password change

### Input Validation

- All inputs validated via Zod schemas
- Sanitize HTML content (if allowing rich text)
- Validate file uploads (type, size)

### SQL Injection Prevention

- Use parameterized queries (Drizzle/Prisma handle this)
- Never interpolate user input into SQL

### XSS Prevention

- Escape output in templates
- Use `Content-Security-Policy` headers
- Set `HttpOnly` and `Secure` flags on cookies

### CORS Configuration

```typescript
app.use(cors({
  origin: [
    'https://doublezero.app',
    'capacitor://localhost', // Mobile app
    process.env.NODE_ENV === 'development' && 'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

app.use('/api/auth', authLimiter);
app.use('/api/v1', apiLimiter);
```

---

## Data Privacy

### Locker Room Isolation

- All queries for scoped data MUST include locker room filter
- Middleware validates user has access before any data operation
- No cross-locker room data leakage

### Personal Data

- Minimize collection (only what's needed)
- Allow users to export their data
- Allow users to delete their account (GDPR compliance)
- Encrypt sensitive fields at rest (optional enhancement)

### Youth Protection

For teams with minors:
- Require guardian consent for photos
- No public exposure of birth dates
- Limit location data visibility
- Consider age verification for account creation

---

## Session Management

### JWT Payload

```typescript
interface JWTPayload {
  sub: string;           // User ID
  email: string;
  roles: AppRole[];
  lockerRooms: number[]; // IDs user has access to
  iat: number;
  exp: number;
}
```

### Refresh Token Flow

```
1. Login → Access Token (15 min) + Refresh Token (30 days)
2. Access token expires
3. Client calls /api/auth/refresh with refresh token
4. Server validates refresh token, issues new pair
5. Old refresh token invalidated (rotation)
```

### Logout

```typescript
// Invalidate refresh token
await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

// If using token blocklist for access tokens:
await redis.set(`blocked:${accessToken}`, '1', 'EX', tokenExpiry);
```

---

## Audit Trail for Security Events

Always log (regardless of audit settings):

| Event | Data Captured |
|-------|---------------|
| Login success | User ID, IP, user agent, timestamp |
| Login failure | Email attempted, IP, timestamp |
| Password change | User ID, timestamp |
| Password reset request | Email, IP, timestamp |
| Account lockout | User ID, IP, timestamp |
| Permission denied | User ID, resource, action, timestamp |
| Token refresh | User ID, timestamp |
| Logout | User ID, timestamp |

```typescript
interface SecurityEvent {
  eventType: string;
  userId?: number;
  email?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}
```
