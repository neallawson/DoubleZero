# DoubleZero Project Decision Log (chronological)

Note: Earlier sessions did not always record exact timestamps. Entries below are ordered by project chronology based on working notes, commits, and discussions. When a date is unknown, it is marked as such. This log complements `docs/project_summary.md` by narrating how decisions evolved.

---

## [Date: unknown] Project kick-off and core stack selection
- Decisions
  - Frontend: SvelteKit (Svelte 5), Vite, Tailwind v4, shadcn-svelte, TypeScript.
  - Backend: Node.js (pure ESM), REST under `/api/v1`, Zod for validation, service-layer pattern.
  - DB: MariaDB/MySQL; plain SQL migrations + seed scripts in `docs/`.
- Rationale
  - Svelte 5 and headless UI for fast, accessible CRUD; Tailwind for consistent theming.
  - Service-layer keeps routers thin, improves testability and versioning.
- Impact
  - Established repo layout, pnpm workspaces, and ESM-only convention.

## [Date: unknown] Auth approach and identity model
- Decisions
  - Email/password auth with JWTs; refresh tokens stored as SHA-256 hashes.
  - `/api/auth`: register, login, refresh, logout, me.
  - User <-> Person: keep `person.user_id` for now; will consider inverting later.
  - Password policy: min 8 chars, mixed case, at least one digit/special char.
  - Email verification and password reset deferred until SMTP available.
- Alternatives considered
  - Adopt an auth library (e.g., better-auth). Deferred to maintain control and simplicity.
- Impact
  - Stable minimal auth; person profile joined in `/me` for display_name.

## [Date: unknown] AppConfig model debate
- Options
  - Simple key/value store (initial idea).
  - Relational, typed model with validation, history (final).
- Decision (final)
  - Use relational, namespaced entries with value typing/validation, scoping (GLOBAL/TEAM), `is_public`, optimistic locking, and append-only history.
- Rationale
  - Strong auditability and future-proofing outweighed the simplicity of KV.

## [Date: unknown] DB conventions and optimistic locking
- Decisions
  - CRUD tables include: `is_active`, `is_deleted`, audit fields, and integer `version`.
  - All PATCH requests require `version`; services enforce check-and-increment; 409 on conflict.
- Impact
  - Consistency across domains; clear conflict handling UX for the frontend.

## [Date: unknown] Filtering policy: hide inactive/deleted by default
- Decisions (final)
  - All list/get endpoints hard-code `WHERE is_deleted = 0 AND is_active = 1`.
  - No UI/API toggles to override in v1; only DELETE affects `is_deleted`.
- Rationale
  - Reduces user error and keeps UX uncluttered; aligns with audit-first approach.

## [Date: unknown] Frontend CRUD standards
- Decisions
  - Read-only View dialog: clicking a name fetches latest by id; inputs disabled; Close only.
  - Inline field-level Zod errors; focus first invalid input.
  - Replace `confirm()` with accessible confirm-delete dialogs.
  - Use Svelte idioms; avoid React patterns.
- Impact
  - Consistent, accessible CRUD UX across domains.

## [Date: unknown] Team icon storage
- Alternatives
  - Filesystem or external URLs.
- Decision (final)
  - Store blob in DB (PNG/JPEG/WebP) with public GET endpoint; fallback placeholder.
- Rationale
  - Atomic backups, simpler permissioning, fewer moving parts.

## [Date: unknown] Persons vs Players refactor
- Decisions
  - Migrate from `player_id` to `person_id` across services/schemas/routes.
  - Implement Persons CRUD; deprecate `/players` with HTTP Deprecation headers.
- Rationale
  - Aligns identity across the app; supports people who may or may not have accounts.

## [Date: unknown] CRUD implementations (foundational domains)
- Implemented
  - teams, locations, game_types, game_statuses, player_positions, leagues.
- UX
  - shadcn-svelte components; neutral, high-contrast theme; toasts for validation and success.

## [Date: unknown] UI cleanup: remove Active column and Is Active checkbox
- Decision (final)
  - Removed "Active" column from list tables and "Is Active" checkbox from dialogs for leagues, game_types, player_positions (and extended consistently).
- Rationale
  - Reinforces server-side filtering policy; declutters UI.

## [Date: unknown] Permissions matrix and role gating plan
- Decision
  - Maintain role gating in `docs/permissions_matrix.md` with a legend of role letters; cells indicate allowed operations per domain (CRUD).
  - Implement basic gating from this matrix in routers/UI.
- Impact
  - Central, editable policy document; enables non-code review of permissions.

## [Date: unknown] Domain roles vs RBAC roles debate (critical design)
- Problem
  - Domain tables (e.g., `team_roster`, `game_user`) need person roles, but RBAC roles live on users.
- Options considered
  - Inherit RBAC roles onto persons (rejected: conflates concerns; persons without accounts have no roles).
  - Generic `person_roles` with scopes (flexible but complex; still mixes concerns).
  - Split RBAC from domain roles (final).
- Decision (final)
  - Keep RBAC roles on `user` for app authorization.
  - Introduce domain role lookups: `roster_role` for `team_roster`, `game_role` for `game_user`.
  - Rename FKs: `team_roster.role_id` → `roster_role_id`; `game_user.role_id` → `game_role_id`.
  - Plan for officials: either allow `game_user.team_id` NULL or add `game_officials` with `official_role`.
- Impact
  - Clean separation of authz vs domain semantics; supports persons without accounts.

## [Date: unknown] Game events (future design notes)
- Decision
  - Capture: `person_id`, `position_id`, `game_id`, `event_type_id`, `minute`, `field_location` via field UI.
  - Provide a 3×3 keypad for minute entry.
  - Event types include goals, fouls, yellow/red cards, substitutions, penalty/corner kicks, injuries, timeouts, time-ins, water break, etc.
- Impact
  - Guides future schema/routes/UI; implementation deferred post-MVP.

## 2025-08-13 Documentation artifacts
- Created `docs/project_summary.md` summarizing debates and final decisions.
- Created `docs/project_decision_log_view.md` (this file) to chronologically capture major choices for future developers.
- Next steps
  - Build remaining CRUD pages: persons, seasons, games, team_rosters, game_users, player_stats, injuries, app_config.
  - Implement domain role tables and update FKs/services/UI accordingly.
  - Finalize permissions matrix and wire gating.

---

How to extend this log
- When making a new decision, append an entry with: Date, Context/Problem, Options, Decision, Rationale, and Impact.
- Reference code paths (e.g., `src/backend/src/services/...`, `src/frontend/src/routes/...`) and SQL files in `docs/` when relevant.
- If a prior decision is superseded, add a new entry and explicitly call out the supersession.
