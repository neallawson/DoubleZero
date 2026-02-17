# DoubleZero - Project Context

## Overview
Soccer/sports team management application with a Playboard Composer feature for creating tactical diagrams.

## Architecture
- **API**: Express + Drizzle ORM + PostgreSQL (`/apps/api`, port 3000)
- **Web**: React + Vite + Tailwind + shadcn/ui (`/apps/web`, port 3001/3002)
- **Monorepo**: pnpm workspaces

## Recent Work (Feb 2025)

### Server Mode for Playboard (Just Completed)
Implemented admin-controlled "Server-Only Mode" that bypasses IndexedDB for reliable testing:

- **Backend**: `/apps/api/src/routes/config.ts` - Config key-value API (GET/PUT/DELETE)
- **Frontend**:
  - `configApi` in `/apps/web/src/lib/api.ts`
  - `AppConfigContext` in `/apps/web/src/contexts/AppConfigContext.tsx`
  - System Settings card in Admin Dashboard with toggle
  - `useOfflineSync` hook accepts `serverOnly` option
  - PlayboardPage uses `usePlayboardServerOnly()` hook

**How it works**: When "Playboard Server-Only Mode" is enabled in Admin Dashboard, Playboard bypasses IndexedDB and syncs directly with server API.

### Bug Fixes Applied
1. **Plays not loading** - Missing imports (`deletePlayersForPlay`, `deleteAnnotationsForPlay`) in `useOfflineSync.ts`
2. **Play edit not persisting** - Added `version` field to `playsApi.update()` calls
3. **Mobile responsiveness** - Added `max-h-[90vh] overflow-y-auto` to DialogContent
4. **Unsaved changes warning** - Added confirmation on Back navigation

### Mobile/Desktop Toggle
PlayboardPage has "Full Screen" button (desktop) and "Exit Full Screen" (mobile menu) to toggle between views.

## Key Files

### Playboard
- `/apps/web/src/pages/PlayboardPage.tsx` - Main playboard page
- `/apps/web/src/pages/PlaysListPage.tsx` - Play list with edit/delete
- `/apps/web/src/components/playboard/hooks/useOfflineSync.ts` - Offline-first sync (with serverOnly option)
- `/apps/web/src/lib/playboard/offlineStorage.ts` - IndexedDB operations

### Config/Settings
- `/apps/api/src/routes/config.ts` - Config API
- `/apps/api/src/db/schema/config.ts` - app_config table schema
- `/apps/web/src/contexts/AppConfigContext.tsx` - Config context + usePlayboardServerOnly hook
- `/apps/web/src/pages/AdminDashboardPage.tsx` - Admin dashboard with System Settings

### Auth
- `/apps/api/src/middleware/auth.ts` - Auth middleware (requireAuth, requireRole)
- `/apps/web/src/contexts/AuthContext.tsx` - Auth context

## Database
PostgreSQL with Drizzle ORM. Key tables:
- `user`, `user_role`, `session`, `user_session_state`
- `team`, `team_member`, `person`
- `play`, `play_player`, `play_annotation`, `field_template`
- `app_config` (key-value system settings)

Migrations in `/apps/api/drizzle/`

## Running the Project
```bash
# From repo root
pnpm install
pnpm --filter api dev      # API on port 3000
pnpm --filter web dev      # Web on port 3001 (or 3002 if 3001 busy)
```

## Plan File
Original Playboard implementation plan at `/home/neal/.claude/plans/dapper-stirring-moore.md` (now outdated - most items completed).
