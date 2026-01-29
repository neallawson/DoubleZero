# DoubleZero Project Summary (through 2025-08-13)

Purpose: Capture major debates, decisions, and rationale to help future developers restart or continue the project without losing design history. When earlier decisions were superseded, this document records pros/cons and the final path chosen.

## 1) Project overview
- __Goal__: A modern, team-centric soccer management app with secure auth, clean CRUD, mobile-friendly UI, and auditable data.
- __Scopes__: Global admin and per-team workflows. For v1, no per-league scope; a single league record simplifies early use.
- __Style/UX__: Neutral greys/blues, high contrast, accessible, dialogs/sheets for CRUD over a graphical field workspace.

## 2) Tech stack and tooling
- __Frontend__: SvelteKit (Svelte 5), Vite, Tailwind v4, shadcn-svelte (headless UI), TypeScript.
- __Backend__: Node.js (pure ESM), REST at `/api/v1`, Zod for validation, service-layer pattern.
- __Database__: MariaDB/MySQL dialect. Plain SQL migrations and seed scripts under `docs/`.
- __Auth__: Email/password JWT with refresh tokens (SHA‑256 hashed at rest). Endpoints: `register`, `login`, `refresh`, `logout`, `me`.
- __Build/Repo__: pnpm workspaces, `.gitignore` expanded for SvelteKit/Vite/build outputs.
- __Mobile__: Future: likely Capacitor; web-first components to ease conversion.

## 3) Architectural principles
- __Separation of concerns__: Routers are thin; business logic lives in `services/` (e.g., `gamesService.ts`).
- __Validation at edges__: Zod schemas enforce shape and invariants in both create and patch paths.
- __Optimistic locking__: All CRUD tables include `version`. Patches require `version`; services check/increment; 409 on conflict.
- __Soft delete and activity__: Tables have `is_deleted` and (where applicable) `is_active` columns.
- __Filtering rules__: All list/get responses must be filtered to `is_deleted = 0 AND is_active = 1` with no UI or API override in v1.

## 4) Database model highlights
- __Core entities__: team, person, season, team_roster, league, location, game_type, game_status, game, player_position, player_stats, injury, game_user, app_config.
- __Events (deferred)__: `game_event_types` and `game_events` will be added post‑MVP; design notes captured for required fields and UI behaviors.
- __Team icon storage__: Image blob in DB (PNG/JPEG/WebP), public GET endpoint; default placeholder if none.
- __AppConfig__: Not a generic KV store. Final: relational, namespaced, strongly-typed values, validation, scoping (GLOBAL/TEAM), `is_public`, optimistic locking, and append-only history.

## 5) Authentication and identity
- __Users vs Persons__: A `user` owns login credentials. A linked `person` profile supplies display and domain identity. Current FK direction: `person.user_id` → `user.id` (decision to invert to `user.person_id` deferred).
- __Password policy__: Min 8 chars, mixed case, at least one digit or special character.
- __Email flows__: Email verification and password reset required, pending SMTP provider.

## 6) Authorization and roles
- __Permissions matrix__: Role gating will be driven by a matrix in `docs/permissions_matrix.md` (Create/Read/Update/Delete per domain). UI toggles like “Include deleted” are deferred until RBAC refinement and will appear per-role per matrix.
- __RBAC vs domain roles debate__: Some tables (e.g., `team_roster`, `game_user`) need role semantics for persons, but app RBAC roles live on users.
  - Pros/cons explored:
    - Inherit RBAC roles onto persons: simple but wrong semantics; persons without accounts lack roles; conflates auth and domain.
    - Single `person_roles` table with scopes: flexible but complex and mixes RBAC with domain.
    - Split roles (final): keep RBAC roles on `user` for app authz; introduce domain roles for persons.
  - __Final decision__: Separate domain roles from RBAC.
    - Add `roster_role` (for `team_roster`) and `game_role` (for `game_user`) lookup tables.
    - Rename FKs: `team_roster.role_id` → `team_roster.roster_role_id`; `game_user.role_id` → `game_user.game_role_id`.
    - Keep RBAC roles solely for app authorization. Domain role UX uses dropdowns populated from the new lookups.

## 7) API design and service layer
- __Routers__: `/api/v1/...` with cohesive domain routers.
- __Services__: Each domain (teams, persons, seasons, rosters, leagues, locations, game_types, game_statuses, games, player_positions, player_stats, injuries, game_users, app_config) has a service encapsulating DB reads/writes and enforcing filters and optimistic locking.
- __Zod patch enforcement__: Patch schemas require `version`; services reject stale versions (409) and increment on success.
- __Filtering enforcement__: All list/get paths hard-code `is_deleted = 0 AND is_active = 1` (for tables with `is_active`). Query overrides removed.

## 8) Frontend standards and UX patterns
- __Svelte idioms__: `bind:open`, `on:*`, stores, and Svelte 5 features. Avoid React patterns.
- __UI components__: shadcn-svelte primitives (Input, Label, Button, Card) + Tailwind utility classes.
- __Validation UX__: Inline field errors mapped from `ZodError.flatten()`. First invalid input is focused. Top-right toasts for summary errors/success.
- __Dialogs__: CRUD in modal dialog/sheet; read-only View mode when clicking entity name (fetch latest by id; inputs disabled; Close only).
- __Delete UX__: Replace `confirm()` with proper confirm-delete dialogs (pattern adopted project-wide).
- __Active/deleted in UI__: Final: no “Active” column, no “Is Active” checkbox, and no “include deleted” toggle in v1 UI.

## 9) Implemented vs remaining (frontend)
- __Implemented__: `teams`, `locations`, `game_types`, `game_statuses`, `player_positions`, `leagues` CRUD pages with dialogs, validation, toasts, optimistic locking, and read-only view.
- __Remaining (more complex)__: `persons`, `seasons`, `games`, `team_rosters`, `player_stats`, `injuries`, `game_users`, `app_config`.

## 10) Notable bug fixes and refactors
- __is_deleted boolean mismatch__: Frontend was sending numeric 0/1; Zod expected boolean. Fix: Patch schemas exclude `is_deleted`; forms avoid sending it; services treat it as backend-only.
- __Person migration__: `player_id` → `person_id` across services/schemas/routes. New `persons` CRUD implemented; `/players` routes marked deprecated with HTTP Deprecation headers.
- __Filtering parity__: Confirmed/enforced `is_deleted` and `is_active` filters across audited services.
- __.gitignore__: Expanded to ignore SvelteKit/Vite/build outputs and editor caches to prevent noisy `git status`.

## 11) Decisions superseded (with rationale)
- __League UI__
  - Earlier: “No CRUD/UI; single record only” (simplifies v1).
  - Later: CRUD page implemented for consistency and for testing patterns; keeps UX consistent across domains.
- __AppConfig model__
  - Earlier: generic KV store (simple, but weak typing/auditing).
  - Final: relational, namespaced, typed with validation and history (strong auditability; future-proof).
- __Active in UI__
  - Earlier: visible as column/checkbox (discoverable state, but noisy and unsafe).
  - Final: removed from UI; list/get always filtered server-side; only DELETE affects `is_deleted`.
- __Team icon storage__
  - Alternatives: filesystem path or external URL (simpler infra; potential link rot/permissions issues).
  - Final: DB blob with constrained types and public GET endpoint (atomic, backup-friendly, fewer moving parts).
- __Auth library vs roll-your-own__
  - Considered: Better-auth, others.
  - Final (current): Minimal email/password with JWTs and secure refresh storage; defer library integration until needs grow.

## 12) Conventions and repo hygiene
- __ESM-only__: No CommonJS.
- __TypeScript everywhere__.
- __pnpm workspaces__: `pnpm-workspace.yaml` required; `workspaces` field in `package.json` is ignored.
- __SQL migrations__: Plain SQL scripts live under `docs/`; versioning and seed data added incrementally.

## 13) Game events (future feature notes)
- __Capture__: `person_id`, `position_id`, `game_id`, `event_type_id`, `minute`, `field_location` (click on field UI).
- __Event types__: goals, fouls, yellow/red cards, substitutions, penalty kicks, corner kicks, injuries, timeouts, time-ins, water break, etc.
- __UI__: 3×3 keypad for minute entry; graphical field selector.

## 14) Open items / next steps
- __CRUD pages__: Build remaining complex domains (persons, seasons, games, team_rosters, player_stats, injuries, game_users, app_config).
- __Domain roles__: Implement `roster_role`/`game_role` tables and rename FKs (`roster_role_id`, `game_role_id`); adjust services/routes/UX.
- __Permissions matrix__: Finalize `docs/permissions_matrix.md` legend and per-domain cells; implement gating in routers/UI.
- __Email flows__: Add email verification & password reset when SMTP is available.
- __Officials modeling__: Decide whether `game_user` covers officials (nullable `team_id`) or to add `game_officials` with `official_role`.
- __AppConfig seeds__: Define initial keys and type validators.

## 15) File and path references
- __Frontend routes__: `src/frontend/src/routes/`
- __Backend services__: `src/backend/src/services/`
- __Backend routers__: `src/backend/src/routes/v1/`
- __Schemas__: `src/backend/src/schemas/v1/`
- __Design notes__: `docs/design_notes.txt`
- __Permissions__: `docs/permissions_matrix.md`
- __DB DDL__: `docs/doublezero.sql`

---

If you need a more decision-log view (chronological), we can add a dated changelog appendix derived from commit history and our work logs.
