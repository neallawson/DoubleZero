# DoubleZero Architecture

## Monorepo Structure

```
doublezero/
├── packages/
│   ├── schema/              # Shared Zod schemas & TypeScript types
│   │   ├── src/
│   │   │   ├── entities/    # Per-entity schemas (user, team, game, etc.)
│   │   │   ├── api/         # Request/response schemas
│   │   │   └── index.ts     # Barrel exports
│   │   └── package.json
│   │
│   └── ui/                  # Shared UI components (if using React for web+mobile)
│       ├── src/
│       └── package.json
│
├── apps/
│   ├── api/                 # Backend Express server
│   │   ├── src/
│   │   │   ├── routes/      # Express routers (thin)
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, validation, error handling
│   │   │   ├── db/          # Database connection, queries
│   │   │   └── index.ts     # Server entry
│   │   └── package.json
│   │
│   ├── web/                 # Frontend web app (Next.js)
│   │   ├── src/
│   │   └── package.json
│   │
│   └── mobile/              # Mobile app (React Native + Expo)
│       ├── src/
│       └── package.json
│
├── docs/                    # Design documents, ADRs
├── scripts/                 # Dev utilities, migrations
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## Backend Architecture

### Layers

```
┌─────────────────────────────────────────────┐
│                   Routes                     │  ← HTTP handlers, minimal logic
├─────────────────────────────────────────────┤
│                 Middleware                   │  ← Auth, validation, error handling
├─────────────────────────────────────────────┤
│                  Services                    │  ← Business logic, orchestration
├─────────────────────────────────────────────┤
│                    Data                      │  ← DB queries, external APIs
└─────────────────────────────────────────────┘
```

### Routes (Thin)

```typescript
// routes/teams.ts
router.post('/', 
  authenticate,
  validate(TeamCreateSchema),
  async (req, res, next) => {
    try {
      const team = await teamsService.create(req.body, req.user);
      res.status(201).json(team);
    } catch (err) {
      next(err);
    }
  }
);
```

### Services (Business Logic)

```typescript
// services/teams.ts
export const teamsService = {
  async create(data: TeamCreate, user: AuthUser): Promise<Team> {
    // Validate business rules
    // Call data layer
    // Trigger audit if enabled
    // Return result
  },
  
  async list(filters: TeamFilters, user: AuthUser): Promise<PaginatedResult<Team>> {
    // Apply locker room scoping
    // Apply soft-delete filter
    // Return paginated results
  }
};
```

### Data Layer

```typescript
// db/teams.ts
export const teamsData = {
  async insert(team: TeamInsert): Promise<Team> {
    // Raw DB operation via Drizzle/Prisma/SQL
  },
  
  async findById(id: number): Promise<Team | null> {
    // ...
  }
};
```

---

## Shared Schema Architecture

### Package: `@doublezero/schema`

```typescript
// packages/schema/src/entities/team.ts
import { z } from 'zod';

// Base schema (DB shape)
export const TeamSchema = z.object({
  id: z.number(),
  lockerRoomId: z.number(),
  leagueId: z.number().nullable(),
  name: z.string().min(1).max(255),
  shortName: z.string().max(50).nullable(),
  primaryColor: z.string().max(20).nullable(),
  secondaryColor: z.string().max(20).nullable(),
  isActive: z.boolean().default(true),
  version: z.number().default(0),
  createdAt: z.date(),
});

// Create schema (omit auto-generated fields)
export const TeamCreateSchema = TeamSchema.omit({
  id: true,
  version: true,
  createdAt: true,
});

// Patch schema (all fields optional, version required for optimistic locking)
export const TeamPatchSchema = TeamCreateSchema.partial().extend({
  version: z.number(), // Required for optimistic locking
});

// Inferred types
export type Team = z.infer<typeof TeamSchema>;
export type TeamCreate = z.infer<typeof TeamCreateSchema>;
export type TeamPatch = z.infer<typeof TeamPatchSchema>;
```

### Usage in Backend

```typescript
// apps/api/src/routes/teams.ts
import { TeamCreateSchema, TeamPatchSchema } from '@doublezero/schema';

router.post('/', validate(TeamCreateSchema), ...);
router.patch('/:id', validate(TeamPatchSchema), ...);
```

### Usage in Frontend

```typescript
// apps/web/src/lib/forms/team-form.ts
import { TeamCreateSchema, type TeamCreate } from '@doublezero/schema';

// Form validation
const result = TeamCreateSchema.safeParse(formData);
if (!result.success) {
  // Display errors
}
```

---

## Authentication Flow

### Better-Auth Integration

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │────▶│Better-Auth│
└──────────┘     └──────────┘     └──────────┘
                      │                 │
                      ▼                 ▼
                 ┌──────────┐     ┌──────────┐
                 │ Services │     │    DB    │
                 └──────────┘     └──────────┘
```

1. **Register**: Email/password → Better-Auth creates user → We create linked Person
2. **Login**: Credentials → Better-Auth validates → Returns JWT
3. **OAuth**: Provider redirect → Better-Auth handles → Creates/links user
4. **Protected routes**: JWT in header → Middleware validates → Attaches user to request

### Session Context

```typescript
interface AuthUser {
  id: number;
  email: string;
  personId: number | null;
  lockerRoomIds: number[];  // Teams user has access to
  roles: AppRole[];         // ADMIN, USER
}

// Available in routes via req.user
```

---

## API Request Flow

```
Request
   │
   ▼
┌─────────────────┐
│  Rate Limiter   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Middleware │──── 401 Unauthorized
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validation (Zod)│──── 400 Bad Request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Service     │──── 403 Forbidden (authz)
│                 │──── 404 Not Found
│                 │──── 409 Conflict (version)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Audit Logger   │
└────────┬────────┘
         │
         ▼
    Response
```

---

## Error Handling

### Standardized Error Response

```typescript
interface ApiError {
  status: number;
  code: string;           // Machine-readable: 'VALIDATION_ERROR', 'NOT_FOUND'
  message: string;        // Human-readable
  details?: unknown;      // Zod errors, field-specific info
  requestId?: string;     // For debugging
}
```

### Error Classes

```typescript
class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

class ValidationError extends AppError { ... }
class NotFoundError extends AppError { ... }
class ForbiddenError extends AppError { ... }
class ConflictError extends AppError { ... }  // Optimistic locking
```

---

## Audit System Architecture

### Trigger Points

```
Service Layer
     │
     ▼
┌─────────────────┐
│  Audit Service  │──── Check if table is audited
└────────┬────────┘     │
         │              ▼
         │         ┌─────────────────┐
         │         │  Audit Settings │
         │         └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Audit Log     │
│   (async write) │
└─────────────────┘
```

### Implementation

```typescript
// services/audit.ts
export const auditService = {
  async log(entry: AuditEntry): Promise<void> {
    // Check if auditing enabled for this table
    const settings = await getAuditSettings(entry.tableName);
    if (!settings?.isEnabled) return;
    
    // Build log entry
    const log = {
      tableName: entry.tableName,
      recordId: entry.recordId,
      operation: entry.operation,
      userId: entry.userId,
      changedAt: new Date(),
      oldValues: settings.trackOldValues ? entry.oldValues : null,
      newValues: settings.trackNewValues ? entry.newValues : null,
      ipAddress: entry.ipAddress,
      requestPath: entry.requestPath,
    };
    
    // Write async (don't block the request)
    queueAuditWrite(log);
  }
};
```

---

## Frontend Architecture (React/Next.js Example)

```
apps/web/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/          # Auth routes (login, register)
│   │   ├── (dashboard)/     # Protected routes
│   │   │   ├── teams/
│   │   │   ├── games/
│   │   │   └── settings/
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/              # Base UI components (shadcn)
│   │   └── domain/          # Domain-specific (TeamCard, GameList)
│   │
│   ├── lib/
│   │   ├── api/             # API client, fetch wrappers
│   │   ├── hooks/           # React Query hooks
│   │   └── utils/
│   │
│   └── styles/
```

### Data Fetching Pattern

```typescript
// lib/hooks/useTeams.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { TeamCreateSchema, type Team } from '@doublezero/schema';
import { api } from '../api';

export function useTeams(lockerRoomId: number) {
  return useQuery({
    queryKey: ['teams', lockerRoomId],
    queryFn: () => api.teams.list(lockerRoomId),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: TeamCreate) => api.teams.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
```

---

## Mobile Architecture (React Native + Expo)

Shares `@doublezero/schema` and API client packages.

```
apps/mobile/
├── app/                     # Expo Router (file-based routing)
│   ├── (auth)/              # Auth screens
│   ├── (tabs)/              # Main tab navigation
│   │   ├── home/
│   │   ├── calendar/
│   │   ├── roster/
│   │   └── settings/
│   └── _layout.tsx
├── components/
├── lib/                     # Shared hooks, API client
├── app.json                 # Expo config
└── package.json
```

### Platform Strategy
- **All features on both platforms** (web + mobile)
- **Mobile-only initially**: Real-time in-game event tracking
- **Shared**: Zod schemas, API client, business logic hooks

### Key Libraries
- **Navigation**: Expo Router (file-based, like Next.js)
- **Styling**: NativeWind (Tailwind for React Native)
- **Storage**: Expo SecureStore, AsyncStorage
- **Notifications**: Expo Notifications (Phase 2)
- **Gestures**: react-native-gesture-handler (for drag-drop field UI)
