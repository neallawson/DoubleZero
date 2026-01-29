# DoubleZero Implementation Plan

## Overview

This document outlines the phased implementation approach for DoubleZero. Each step is designed to be:
- **Discrete** — can be completed independently
- **Testable** — can be verified on-device before moving on
- **Incremental** — builds on previous steps

**Testing approach**: Test in-device (mobile emulator/device + web browser) for all screens and features as they're created.

---

## Phase 1: Project Foundation & Database

### 1.1 Monorepo Scaffolding
**Goal**: Set up the project structure with pnpm workspaces

**Steps**:
1. Initialize pnpm workspace at project root
2. Create package structure:
   ```
   packages/
     schema/          # Zod schemas, shared types
     api-client/      # Typed API wrapper (shared by web + mobile)
   apps/
     api/             # Express backend
     web/             # Next.js frontend
     mobile/          # Expo React Native app
   ```
3. Configure TypeScript with shared base config
4. Set up ESLint + Prettier

**Test**: `pnpm install` succeeds, TypeScript compiles across all packages

---

### 1.2 Development & Production Environments
**Goal**: Native development on Ubuntu, Docker for production

#### Development (Native)
- Run Node.js directly on Ubuntu machine
- Use native PostgreSQL installation
- Environment variables via `.env` files
- Hot reload for rapid iteration

#### Production (Docker)
- Full Docker Compose stack
- PostgreSQL container with persistent volume
- API container
- Automated DB initialization + root user creation

**Steps**:
1. Create `.env.example` with required environment variables
2. Create `docker-compose.yml` for production with:
   - PostgreSQL 16 container
   - API container (Node.js)
   - Volume for persistent data
   - Health checks
3. Create `docker-compose.override.yml` for local Docker testing (optional)
4. Add npm scripts: `pnpm dev` (native), `pnpm docker:up` (production-like)

**Test**: 
- Dev: API connects to native PostgreSQL
- Prod: `docker compose up` starts full stack

---

### 1.3 Drizzle Schema Definition
**Goal**: Define database schema in TypeScript using Drizzle ORM

**Steps**:
1. Install Drizzle ORM + drizzle-kit in `apps/api`
2. Create schema files for core entities:
   - `schema/user.ts` — user, user_role
   - `schema/person.ts` — person
   - `schema/team.ts` — team, locker_room
   - `schema/roster.ts` — team_roster, roster_role
   - `schema/league.ts` — league, season
   - `schema/location.ts` — location
   - `schema/game.ts` — game, game_type, game_status, game_participant, game_role
   - `schema/audit.ts` — audit_log, audit_settings
   - `schema/lookups.ts` — player_position, game_event_type
3. Define relationships and indexes
4. Include `version`, `created_at` on all editable entities

**Test**: Schema compiles, `drizzle-kit generate` produces valid SQL

---

### 1.4 Database Migrations
**Goal**: Establish migration workflow for schema changes

**Approach**: Use Drizzle Kit for migrations during development. For production releases, snapshot the schema.

**Steps**:
1. Configure `drizzle.config.ts` for PostgreSQL
2. Generate initial migration: `drizzle-kit generate`
3. Create migration runner script
4. Add seed data script for:
   - Lookup tables (player_position, game_type, game_status, roster_role, game_role, game_event_type)
   - Default admin user (for first-run setup)
5. Add npm scripts: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`

**Test**: 
- Fresh database can be created from migrations
- Seed data populates lookup tables
- Schema matches `03_data_model.md`

---

### 1.5 Database Connection & Health Check
**Goal**: API can connect to PostgreSQL and verify health

**Steps**:
1. Create database connection module using Drizzle + `postgres` driver
2. Add health check endpoint: `GET /health`
3. Add database connection test on startup
4. Configure environment variables (DATABASE_URL, etc.)

**Test**: 
- API starts and connects to PostgreSQL
- `GET /health` returns `{ status: 'ok', database: 'connected' }`

---

## Phase 2: Authentication & User Management

### 2.1 Better-Auth Integration
**Goal**: Set up Better-Auth with PostgreSQL backend

**Steps**:
1. Install Better-Auth in `apps/api`
2. Configure Better-Auth with PostgreSQL adapter
3. Enable email/password authentication
4. Create auth tables (Better-Auth will handle: user, session, account, verification)
5. Mount auth routes: `POST /api/auth/*`

**Test**: 
- Auth tables created in database
- Can register a new user via API
- Can login and receive session token

---

### 2.2 User Registration Flow
**Goal**: Complete registration with Person creation

**Steps**:
1. Extend registration to create linked Person record
2. Implement registration endpoint with:
   - Email validation
   - Password strength requirements
   - Automatic Person creation (display_name from email initially)
3. Add email verification flow (can be stubbed for dev)

**Test**:
- Register new user → user + person records created
- Person linked via `person.user_id`
- Cannot register duplicate email

---

### 2.3 Login & Session Management
**Goal**: Secure login with JWT tokens

**Steps**:
1. Configure Better-Auth session strategy (JWT with refresh tokens)
2. Implement login endpoint
3. Implement logout endpoint
4. Implement token refresh endpoint
5. Create auth middleware for protected routes

**Test**:
- Login returns access token + refresh token
- Protected routes reject unauthenticated requests (401)
- Token refresh works before expiry
- Logout invalidates session

---

### 2.4 Role System (RBAC)
**Goal**: Implement app-level roles (ADMIN, USER)

**Steps**:
1. Create `user_role` table with role assignments
2. Seed ADMIN and USER roles
3. Extend auth context to include roles
4. Create role-checking middleware: `requireRole('ADMIN')`
5. First registered user gets ADMIN role (bootstrap)

**Test**:
- New users get USER role by default
- First user gets ADMIN role
- Admin-only endpoints reject non-admins (403)
- Auth context includes user roles

---

### 2.5 User Profile API
**Goal**: CRUD for user profile

**Steps**:
1. `GET /api/v1/users/me` — get current user + linked person
2. `PATCH /api/v1/users/me` — update profile (name, phone, etc.)
3. `GET /api/v1/users/:id` — admin only
4. `GET /api/v1/users` — admin only, paginated list

**Test**:
- Authenticated user can view/update own profile
- Admin can list all users
- Non-admin cannot access other users

---

### 2.6 Mobile Auth Screens
**Goal**: Login/Register screens in Expo app

**Steps**:
1. Set up Expo project with Expo Router
2. Create auth layout with:
   - Login screen
   - Register screen
   - Forgot password screen (stub)
3. Integrate with API using shared api-client
4. Store tokens securely (Expo SecureStore)
5. Implement auth state management

**Test on device**:
- Can register new account
- Can login with credentials
- Session persists across app restart
- Can logout

---

### 2.7 Web Auth Screens
**Goal**: Login/Register pages in Next.js app

**Steps**:
1. Set up Next.js project with App Router
2. Create auth pages:
   - `/login`
   - `/register`
   - `/forgot-password` (stub)
3. Integrate with API using shared api-client
4. Implement auth state (cookies or localStorage)
5. Create protected route wrapper

**Test in browser**:
- Can register new account
- Can login with credentials
- Session persists across page refresh
- Can logout
- Protected routes redirect to login

---

## Phase 3: Core Domain CRUD

**Pattern**: Each domain entity follows the same structure:
- API: List, Get, Create, Update, Delete endpoints
- Zod schemas in shared package
- Service layer with business logic
- Consistent error handling
- Optimistic locking on updates
- Web + Mobile screens with same UX patterns

### 3.1 Shared CRUD Patterns
**Goal**: Establish reusable patterns before building screens

**Steps**:
1. Create base API response types in `@doublezero/schema`
2. Create pagination helper (limit, offset, total)
3. Create error response format
4. Create base service pattern with audit logging hooks
5. Create shared form components (web + mobile)
6. Create shared list/table components

**Test**: Patterns documented, base components render

---

### 3.2 Person CRUD
**Goal**: Full CRUD for Person entity

**API Endpoints**:
- `GET /api/v1/persons` — list (filtered by locker_room_id)
- `GET /api/v1/persons/:id`
- `POST /api/v1/persons`
- `PATCH /api/v1/persons/:id`
- `DELETE /api/v1/persons/:id`

**Screens** (web + mobile):
- Person list with search/filter
- Person detail view
- Person create/edit form
- Delete confirmation

**Test**:
- CRUD operations work via API
- Screens render and function on device
- Validation errors display correctly
- Optimistic locking prevents conflicts

---

### 3.3 Location CRUD
**Goal**: Full CRUD for Location entity

**API Endpoints**:
- `GET /api/v1/locations`
- `GET /api/v1/locations/:id`
- `POST /api/v1/locations`
- `PATCH /api/v1/locations/:id`
- `DELETE /api/v1/locations/:id`

**Screens**: Same pattern as Person

**Test**: Same criteria as Person

---

### 3.4 League CRUD
**Goal**: Full CRUD for League entity (admin-only create/edit)

**API Endpoints**:
- `GET /api/v1/leagues`
- `GET /api/v1/leagues/:id`
- `POST /api/v1/leagues` (admin)
- `PATCH /api/v1/leagues/:id` (admin)
- `DELETE /api/v1/leagues/:id` (admin)

**Screens**: Same pattern, with role-based UI

**Test**: Same criteria, plus admin-only enforcement

---

### 3.5 Season CRUD
**Goal**: Full CRUD for Season entity

**API Endpoints**:
- `GET /api/v1/seasons` (filter by league_id)
- `GET /api/v1/seasons/:id`
- `POST /api/v1/seasons`
- `PATCH /api/v1/seasons/:id`
- `DELETE /api/v1/seasons/:id`

**Screens**: Same pattern, with league selector

**Test**: Same criteria

---

### 3.6 Team & Locker Room CRUD
**Goal**: Full CRUD for Team (creates Locker Room automatically)

**API Endpoints**:
- `GET /api/v1/teams`
- `GET /api/v1/teams/:id`
- `POST /api/v1/teams` — also creates locker_room
- `PATCH /api/v1/teams/:id`
- `DELETE /api/v1/teams/:id`
- `GET /api/v1/locker-rooms/:id` — locker room details

**Screens**:
- Team list
- Team detail (with locker room info)
- Team create/edit (colors, logo upload)

**Test**: 
- Creating team creates locker room
- Team branding (colors, logo) works
- Same CRUD criteria

---

### 3.7 Roster Management
**Goal**: Manage team roster (add/remove persons, assign roles/positions)

**API Endpoints**:
- `GET /api/v1/teams/:teamId/roster` (filter by season_id)
- `POST /api/v1/teams/:teamId/roster` — add person to roster
- `PATCH /api/v1/teams/:teamId/roster/:id` — update role/position/jersey
- `DELETE /api/v1/teams/:teamId/roster/:id` — remove from roster

**Screens**:
- Roster list view (grouped by role)
- Add to roster (person picker + role/position)
- Edit roster entry
- Remove from roster

**Test**:
- Can add persons to team roster
- Can assign roles and positions
- Can set jersey numbers
- Season-specific rosters work

---

### 3.8 Lookup Table Management (Admin)
**Goal**: Admin screens for managing lookup tables

**Entities**:
- Player positions
- Game types
- Game statuses
- Roster roles
- Game roles
- Event types

**Screens**: Simple list + edit for each (admin only)

**Test**: Admin can add/edit lookup values

---

## Phase 4: Locker Room Features

### 4.1 Locker Room Dashboard
**Goal**: Main team workspace view

**Screens**:
- Locker room home (team info, quick links)
- Navigation to: Discussion, Calendar, Documents, Roster, Settings

**Test**: Dashboard loads, navigation works

---

### 4.2 Discussion Board
**Goal**: Team announcements and threaded discussions

**API Endpoints**:
- `GET /api/v1/locker-rooms/:id/posts`
- `POST /api/v1/locker-rooms/:id/posts`
- `PATCH /api/v1/locker-rooms/:id/posts/:postId`
- `DELETE /api/v1/locker-rooms/:id/posts/:postId`
- `GET /api/v1/posts/:postId/comments`
- `POST /api/v1/posts/:postId/comments`

**Screens**:
- Post list (newest first)
- Post detail with comments
- Create/edit post
- Pin/unpin posts (coach only)

**Test**: Can create posts, comment, pin

---

### 4.3 Team Calendar
**Goal**: Calendar for games, practices, events

**API Endpoints**:
- `GET /api/v1/locker-rooms/:id/events` (date range filter)
- `POST /api/v1/locker-rooms/:id/events`
- `PATCH /api/v1/locker-rooms/:id/events/:eventId`
- `DELETE /api/v1/locker-rooms/:id/events/:eventId`

**Screens**:
- Calendar view (month/week/day)
- Event detail
- Create/edit event
- Event type selection (practice, game, meeting, etc.)

**Test**: Calendar displays events, can CRUD events

---

### 4.4 Event Documents (Event as Folder)
**Goal**: Attach documents to events

**API Endpoints**:
- `GET /api/v1/events/:eventId/documents`
- `POST /api/v1/events/:eventId/documents` (file upload)
- `DELETE /api/v1/events/:eventId/documents/:docId`

**Screens**:
- Event detail shows attached documents
- Upload document to event
- View/download document

**Test**: Can upload, view, delete documents per event

---

### 4.5 Shared Documents Library
**Goal**: General team document storage

**API Endpoints**:
- `GET /api/v1/locker-rooms/:id/documents`
- `POST /api/v1/locker-rooms/:id/documents`
- `DELETE /api/v1/locker-rooms/:id/documents/:docId`

**Screens**:
- Document list with folders
- Upload document
- View/download

**Test**: Document upload and retrieval works

---

### 4.6 Direct Messaging
**Goal**: 1:1 messaging between team members

**API Endpoints**:
- `GET /api/v1/messages/conversations`
- `GET /api/v1/messages/conversations/:personId`
- `POST /api/v1/messages`
- `PATCH /api/v1/messages/:id/read`

**Screens**:
- Conversation list
- Message thread
- Compose message

**Test**: Can send/receive messages, mark as read

---

## Phase 5: Game Features

### 5.1 Game Scheduling
**Goal**: Create and manage games

**API Endpoints**:
- `GET /api/v1/games` (filter by team, season, date range)
- `GET /api/v1/games/:id`
- `POST /api/v1/games`
- `PATCH /api/v1/games/:id`
- `DELETE /api/v1/games/:id`

**Screens**:
- Game list
- Game detail
- Create/edit game (teams, date, location, type)

**Test**: Can schedule games, view on calendar

---

### 5.2 Game Lineup (Soccer Field UI)
**Goal**: Visual field with drag-drop player positioning

**Screens**:
- Soccer field visualization
- Drag players from bench to positions
- Formation templates
- Save lineup per game

**Test on device**: 
- Touch drag-drop works smoothly
- Lineup saves correctly
- Can switch formations

---

### 5.3 Game Participants
**Goal**: Manage who's playing in a game

**API Endpoints**:
- `GET /api/v1/games/:id/participants`
- `POST /api/v1/games/:id/participants`
- `PATCH /api/v1/games/:id/participants/:participantId`
- `DELETE /api/v1/games/:id/participants/:participantId`

**Screens**: Integrated with lineup UI

**Test**: Participants saved with positions

---

### 5.4 Live Game Tracking (Mobile)
**Goal**: Real-time event entry during games

**Screens** (mobile only initially):
- Start game → clock begins
- Event buttons: Goal, Sub, Card, Injury, Timeout
- Event log timeline
- Halftime / End game
- Score display

**API Endpoints**:
- `POST /api/v1/games/:id/start`
- `POST /api/v1/games/:id/events`
- `POST /api/v1/games/:id/end`

**Test on device**:
- Game clock runs
- Events log with timestamps
- Final score saves

---

### 5.5 Game Results & Summary
**Goal**: View completed game details

**Screens**:
- Game summary (score, events timeline)
- Player stats from game
- Shareable game report

**Test**: Completed games show all recorded data

---

## Phase 6: Reporting & Polish

### 6.1 Roster Report
**Goal**: Formatted, printable roster

**Output**: PDF or print-friendly HTML with:
- Team info
- Player list with photos, positions, jersey numbers

**Test**: Report generates correctly

---

### 6.2 Lineup Card
**Goal**: Printable game day lineup

**Output**: Field diagram with player positions

**Test**: Lineup card generates from saved lineup

---

### 6.3 Game Summary Report
**Goal**: Post-game summary document

**Output**: Score, events, player stats

**Test**: Report generates from game data

---

## Migration Strategy

### Development
- Use Drizzle Kit to generate migrations from schema changes
- `pnpm db:generate` → `pnpm db:migrate`
- Can reset database anytime: `pnpm db:reset` (drop + migrate + seed)

### Production Releases
- Snapshot schema at each release
- Test migrations on staging before production
- Backup database before applying migrations

---

## Testing Checklist Template

For each feature, verify:

- [ ] API endpoint works (Postman/curl)
- [ ] Web screen renders correctly
- [ ] Mobile screen renders correctly
- [ ] Form validation works
- [ ] Error states display properly
- [ ] Loading states display properly
- [ ] Optimistic locking works (concurrent edit test)
- [ ] Role-based access enforced
- [ ] Data persists correctly

---

## Estimated Timeline

| Phase | Description | Estimate |
|-------|-------------|----------|
| 1 | Foundation & Database | 1-2 days |
| 2 | Authentication | 2-3 days |
| 3 | Core Domain CRUD | 5-7 days |
| 4 | Locker Room Features | 4-5 days |
| 5 | Game Features | 5-7 days |
| 6 | Reporting & Polish | 2-3 days |

**Total**: ~3-4 weeks for MVP

---

## Next Step

Ready to begin **Phase 1.1: Monorepo Scaffolding**?
