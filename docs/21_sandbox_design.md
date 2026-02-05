# Sandbox Design Document

## Overview

This document captures the design decisions and rationale for the sandbox feature in DoubleZero. The sandbox enables a coach to model real-world entities (people, teams, games) that don't yet have accounts in the system, while maintaining proper visibility and access control boundaries.

## Problem Statement

DoubleZero models real people on real teams playing real games so that a coach can capture data for planning, analysis, and insights. However, we can only assume **one real user** will use the app in any given instance. A coach with a real team must be able to create private entities (people, teams, games, locations) to meaningfully use the system even when those entities don't have user accounts.

### Failed Approach: `owningTeamId` on Domain Tables

An initial approach added `owningTeamId` to `team`, `game`, `league`, and `location` tables, with an `isSandbox` boolean on `team`. This was rejected because:

1. **Semantic inversion**: A team "owning" a league is backwards—leagues contain teams, not vice versa
2. **Bidirectional FKs**: Created ugly circular references in the ER diagram
3. **Conflated concerns**: Mixed access control with data modeling
4. **Counter-intuitive**: The code would confuse future developers

**Lesson learned**: Ugly diagrams indicate design problems. Elegant databases have clean, unidirectional relationships.

## The Sandbox Model

### Core Concept

The sandbox is **not** a "fake data playground." It represents **real-world entities that don't have accounts in the system yet**. The data is real. The people are real. The games happened. The sandbox is a visibility/ownership boundary until entities are "claimed" or promoted to public.

### Schema Design

```
sandbox
  id PK
  teamId FK → team (the real team that owns this sandbox)
  name
  createdAt

team.sandboxId FK → sandbox (nullable)
game.sandboxId FK → sandbox (nullable)  
league.sandboxId FK → sandbox (nullable)
location.sandboxId FK → sandbox (nullable)
person.sandboxId FK → sandbox (nullable)
```

- `sandboxId = NULL` → Public entity, visible to all authenticated users
- `sandboxId = X` → Private to the team that owns sandbox X

### Key Principles

1. **One sandbox per team** (initially—multiple sandboxes deferred to future)
2. **Sandbox = "not yet public"** — the data is real, just not visible outside the team
3. **Team members see their team's sandbox** — regardless of whether they were originally sandboxed persons
4. **Public visibility is opt-in** — via a future "Public Wall" feature
5. **Sandboxed teams cannot have claimed persons** — by definition, if a team has real users, it's not in a sandbox

## Visibility Rules

### Entity Visibility Matrix

| Viewer | Public Entities | Own Team's Sandbox | Other Sandboxes |
|--------|-----------------|-------------------|-----------------|
| Unauthenticated | Directory info + Public Walls (future) | ❌ | ❌ |
| Team Member | ✅ Full access | ✅ Full access | ❌ |
| Other Authenticated User | ✅ Full access | ❌ | ❌ |

### Query Pattern

Simple binary visibility—either you can see the sandbox or you can't. No partial visibility in MVP.

```typescript
// Pseudocode for sandbox-aware queries
function getVisibleEntities(userId, teamMemberships) {
  const accessibleSandboxIds = teamMemberships.map(m => m.team.sandboxId);
  
  return db.select()
    .from(entity)
    .where(
      or(
        isNull(entity.sandboxId),  // Public entities
        inArray(entity.sandboxId, accessibleSandboxIds)  // User's team sandboxes
      )
    );
}
```

## Use Cases

### Use Case 1: Coach Creates Team and Roster

1. Coach registers, creates their real team (Team A)
2. System creates a sandbox owned by Team A
3. Coach creates 14 other players as sandboxed persons (real people, no accounts)
4. Coach creates opponent teams in the sandbox (real teams, no accounts in system)
5. Coach schedules games between Team A and sandboxed opponents

**Result**: Coach has a fully functional system with one real user.

### Use Case 2: Player Claims Their Person

1. Coach invites a player to join
2. Player registers, receives invite link
3. Player claims their existing person record: `person.sandboxId = NULL`, `person.userId = newUserId`
4. Player is now a full team member with access to:
   - Team's private locker room
   - Team calendar and scheduled games
   - Team's sandbox (can view, limited edit based on role)

**Key insight**: Claiming an account grants access to the sandbox you came from. You're on the team—you should see what the team sees.

### Use Case 3: Public Team vs Sandboxed Team Game

Team A (public, real) plays Team B (sandboxed, in Team A's sandbox):

- Team A members see full game details (it's their sandbox)
- Team B has no real users (by definition—it's sandboxed)
- Other authenticated users cannot see this game
- The game is real, the result is real, but visibility is limited to Team A

### Use Case 4: Sandboxed Team Becomes Real

When Team A has sandboxed "Team B", and later Team B's actual coach joins:

1. Team B's coach creates their **own** real team in the system
2. Team A's sandboxed "Team B" becomes a historical artifact
3. No automatic merge (too complex, data integrity risks)
4. Team A can manually update future games to reference the real Team B
5. Historical games retain the sandboxed Team B reference (accurate to what existed at the time)

## Design Decisions

### Why Not Duplicate Tables (sandbox_team, sandbox_game, etc.)?

- Schema duplication is honest but expensive
- Promotion from sandbox to public would require data migration
- Single table with `sandboxId` is simpler and allows easy promotion (`SET sandboxId = NULL`)

### Why Not Use Locker Room as Sandbox Boundary?

- Locker rooms are season-scoped (archived with seasons)
- Teams span seasons
- Sandbox needs to persist across seasons with the team

### Why Sandbox Owned by Team, Not User?

- Multiple users on a team should share the same sandbox
- Team is the natural ownership boundary for collaborative data
- User ownership would fragment data when multiple coaches exist

### What About Cross-Sandbox References?

- A public entity CAN be referenced by a sandboxed entity (e.g., public Team A in a sandboxed game)
- A sandboxed entity CANNOT be referenced by a public entity (would leak private data)
- Validation enforced on create/update

### What About Sandbox Deletion?

- Soft delete recommended (set `isActive = false`)
- Hard delete would cascade to all sandboxed entities—potentially large data loss
- Deferred: detailed deletion/archival workflow

## MVP Scope

### Included

- `sandbox` table with `teamId` ownership
- `sandboxId` FK on `team`, `game`, `league`, `location`, `person`
- Query filtering by sandbox access
- Person claiming workflow (`sandboxId → NULL`, `userId → claimed`)
- Basic sandbox CRUD

### Deferred

- **Public Wall**: Team-controlled public sharing of selected content
- **Multiple sandboxes per team**: Requires additional UX for sandbox selection
- **Partial public visibility**: Game results visible without roster details
- **Team promotion/merge**: Converting sandboxed team to real team with history
- **Sandbox-to-sandbox visibility**: Always "none" for now

## Implementation Notes

### Database Indexes

```sql
-- Partial index for public entity queries
CREATE INDEX idx_team_public ON team (id) WHERE sandbox_id IS NULL;
CREATE INDEX idx_game_public ON game (id) WHERE sandbox_id IS NULL;
-- etc.

-- Composite index for sandbox-scoped queries  
CREATE INDEX idx_team_sandbox ON team (sandbox_id) WHERE sandbox_id IS NOT NULL;
CREATE INDEX idx_game_sandbox ON game (sandbox_id) WHERE sandbox_id IS NOT NULL;
-- etc.
```

### API Middleware Pattern

Every list/get endpoint needs sandbox awareness. Recommended approach:

1. Middleware determines user's accessible sandbox IDs from team memberships
2. Attach `accessibleSandboxIds` to request context
3. Repository/query layer filters by sandbox access automatically

### Validation Rules

- Cannot set `sandboxId` on an entity if it would create a public→sandboxed reference
- Cannot claim a person (`sandboxId = NULL`) if they're on a sandboxed team
- Sandboxed team cannot have any persons with `userId` set

## Open Questions (Future)

1. **Game result visibility**: Should scores be public even if rosters are private?
2. **Directory visibility**: What team info appears in public search/directory?
3. **Invite flow**: Exact UX for inviting users and claiming persons
4. **Sandbox analytics**: Should sandboxed data be included in any aggregations?

---

## Permission System Reference

### Entity Types and Sandbox Support

| Entity | Has sandboxId | Has Team Context | Notes |
|--------|---------------|------------------|-------|
| **team** | ✅ | Self | Team can be sandboxed (opponent team) or public (real team) |
| **game** | ✅ | homeTeamId, awayTeamId | Games involve two teams |
| **league** | ✅ | None directly | Leagues contain teams but aren't "owned" by one |
| **location** | ✅ | homeTeamId (optional) | Venues, can be shared |
| **person** | ✅ | Via teamMember | People belong to teams via membership |
| **season** | ❌ | Via league | Seasons are league-scoped, always public |
| **teamMember** | ❌ | teamId, seasonId | Membership records, scoped to team+season |
| **lockerRoom** | ❌ | teamId, seasonId | Team workspace, inherits team's sandbox |

### User Roles

| Role | Scope | Description |
|------|-------|-------------|
| **ADMIN** | System | Full access to everything |
| **TEAM_ADMIN** | Team + Season | Can manage team, roster, games for that team |
| **TEAM_MEMBER** | Team + Season | Can view team data, limited edits |
| **TEAM_VIEWER** | Team + Season | Read-only access to team |

### Permission Matrix

| Operation | ADMIN | TEAM_ADMIN (sandbox owner) | TEAM_ADMIN (entity's team) | Other |
|-----------|-------|---------------------------|---------------------------|-------|
| **Sandboxed Entity** |
| View/List | ✅ | ✅ (if activeTeamId matches) | ❌ | ❌ |
| Create | ✅ | ✅ (auto-assigns to sandbox) | N/A | ❌ |
| Edit | ✅ | ✅ (if activeTeamId matches) | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| **Public Entity** |
| View/List | ✅ | ✅ | ✅ | ✅ (authenticated) |
| Create | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ❌ | ✅ (if activeTeamId matches) | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |

### Permission Check Algorithm

```
canManageEntity(user, entity):
  1. If user is ADMIN → ✅ Allow
  2. If entity.sandboxId is set (sandboxed entity):
     a. Get owningTeamId from sandbox
     b. If user.activeTeamId == owningTeamId 
        AND user is TEAM_ADMIN of owningTeamId → ✅ Allow
     c. Otherwise → ❌ Deny
  3. If entity is public and has direct team context (entityTeamId):
     a. If user.activeTeamId == entityTeamId
        AND user is TEAM_ADMIN of entityTeamId → ✅ Allow
     b. Otherwise → ❌ Deny
  4. Public entity with no team context → ❌ Deny (ADMIN only)
```

### Key Principle: activeTeamId Context

The `activeTeamId` in the user's session serves two purposes:

1. **Visibility filter**: Determines which sandbox the user can see (GET routes)
2. **Permission context**: Determines which sandbox the user can modify (PATCH/DELETE routes)

A user who is TEAM_ADMIN on multiple teams must switch their `activeTeamId` to the appropriate team before modifying entities in that team's sandbox. This prevents accidental cross-sandbox modifications.

### Route-Specific Context

| Route | Entity Context | Notes |
|-------|----------------|-------|
| **teams** | sandboxId from team, entityTeamId = team.id for public | Public teams can be edited by their own TEAM_ADMIN |
| **games** | sandboxId from game, entityTeamId = homeTeamId for public | Home team "owns" the game |
| **leagues** | sandboxId from league, entityTeamId = null | Public leagues require ADMIN |
| **locations** | sandboxId from location, entityTeamId = homeTeamId for public | Home team can edit their venue |
| **persons** | sandboxId from person, entityTeamId = null | Public persons require ADMIN (except /me) |

---

*Document created: Feb 2, 2026*
*Updated: Feb 3, 2026 - Added permission system reference*
*Based on design discussions between user and AI assistant*
