# Confirmed Design Decisions

This document tracks decisions that have been finalized. Reference this when implementing.

---

## Data Model

### 1. No Soft Deletes
- **Decision**: Use hard deletes with audit log
- **Rationale**: Cleaner data model; audit log preserves history
- **Impact**: Remove `is_deleted` from all tables; DELETE operations are permanent; audit log captures deleted record data before removal

### 2. Optimistic Locking
- **Decision**: Keep `version` field on editable entities
- **Rationale**: Standard pattern for concurrent edit protection without DB locks
- **Implementation**:
  - PATCH/PUT requests must include `version`
  - Server: `UPDATE ... WHERE id = ? AND version = ?`
  - Increment version on success
  - Return 409 Conflict if version mismatch

### 3. Audit Fields Strategy
- **Decision**: Keep `created_at` on domain tables; other audit fields go to audit log
- **Rationale**: `created_at` useful for display ("Member since"); updates/deletes captured in audit log
- **Implementation**:
  - All tables have `created_at TIMESTAMP DEFAULT NOW()`
  - On UPDATE: write old/new values to audit log (if auditing enabled)
  - On DELETE: write deleted record to audit log before removal

### 4. Person-User Relationship
- **Decision**: `person.user_id` FK pointing to `user.id` (nullable)
- **Rationale**: Persons can exist without user accounts; coaches create player profiles before players sign up
- **Implementation**: Unique constraint on `person.user_id` (one person per user)

---

## Authorization

### 5. Separated Role Systems
- **Decision**: Split RBAC (app roles) from domain roles (team/game roles)
- **App Roles** (system access):
  - `ADMIN` — system administrator
  - `USER` — standard authenticated user
- **Roster Roles** (team membership via `roster_role` lookup):
  - `OWNER`, `HEAD_COACH`, `COACH`, `MANAGER`, `PLAYER`, `PARENT`
- **Game Roles** (game participation via `game_role` lookup):
  - `STARTER`, `SUBSTITUTE`, `COACH`, `REFEREE`, `LINE_JUDGE`
- **Rationale**: Clean separation; domain roles apply to persons (who may not have accounts), RBAC applies to users

---

## Audit System

### 6. Audit Log Design
- **Decision**: Centralized audit log table with toggleable auditing per table
- **Captures**:
  - Table name, record ID
  - Operation (INSERT, UPDATE, DELETE)
  - User who made the change
  - Timestamp
  - Old values (JSON) — for UPDATE and DELETE
  - New values (JSON) — for INSERT and UPDATE
  - Request metadata (IP, user agent, endpoint) — optional
- **Toggle**: System settings control which tables are audited
- **Retention**: Configurable retention period with auto-purge

---

## Locker Room

### 7. Locker Room Model
- **Decision**: Locker Room is 1:1 with Team
- **Rationale**: Simpler model; 'n' teams = 'n' locker rooms
- **Sharing**: No cross-locker-room data sharing for now
- **Public Page**: Coach and designated roles control what's shared publicly
- **New Role Needed**: Role for managing public page/wall content

---

## Technology Stack

### 8. Database
- **Decision**: PostgreSQL
- **Rationale**: Robust, excellent JSON support, better ecosystem than MariaDB

### 9. ORM
- **Decision**: Drizzle ORM
- **Rationale**: TypeScript-first, lightweight, SQL-like syntax, excellent PostgreSQL support

### 10. Frontend Framework
- **Decision**: React/Next.js (web) + React Native with Expo (mobile)
- **Rationale**: Native mobile feel, shared business logic, huge ecosystem
- **Platform Strategy**:
  - All features available on both web and mobile
  - Real-time in-game tracking is mobile-only initially
  - Shared packages: Zod schemas, API client, types

### 11. Deployment
- **Decision**: Docker + Docker Compose
- **Requirements**:
  - Automated database initialization on first run
  - Root user creation during setup
  - Environment-based configuration
  - Volume mounts for persistent data

### 12. Multi-tenancy
- **Decision**: Single shared PostgreSQL database with row-level filtering
- **Rationale**: Simplest approach, sufficient for v1; can add stricter isolation later
