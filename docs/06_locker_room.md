# Locker Room — Team Workspace

## Concept

The **Locker Room** is a team's private workspace within DoubleZero. By default, all activities, communications, and data within a Locker Room are strictly private to authorized members.

---

## Privacy Model

```
┌─────────────────────────────────────────────────────────┐
│                     LOCKER ROOM                         │
│  (Private by default)                                   │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Roster    │  │   Calendar  │  │    Chat     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Games     │  │   Stats     │  │   Gallery   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│         ▼ Selective sharing (opt-in) ▼                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │    PUBLIC PAGE      │
               │  (Visible to all)   │
               └─────────────────────┘
```

---

## Access Levels

### Locker Room Members

| Role | Access |
|------|--------|
| **Owner** | Full control; can delete locker room, transfer ownership |
| **Head Coach** | Manage roster, games, calendar; share to public page |
| **Coach** | Edit games, view all; limited admin |
| **Manager** | Administrative tasks, communications, calendar |
| **Player** | View roster, own stats, calendar; participate in chat |
| **Parent/Guardian** | View linked player's info (youth leagues) |

### Public Visitors

- View only items explicitly shared to the public page
- No authentication required
- Read-only access

---

## Features

### 1. Team Roster Management

**Private by default**

- Add/edit/remove persons (players, coaches, staff)
- Assign roles and positions
- Set jersey numbers
- Track join/leave dates
- Link persons to User accounts (optional)

**Shareable**:
- Roster list (names, positions, jersey numbers)
- Player photos (with consent settings)

### 2. Calendar

**Private by default**

- Practice schedules
- Game schedules (auto-populated from Games)
- Team meetings
- Events
- RSVP tracking

**Shareable**:
- Game schedule only
- Full calendar (practice times, etc.) — *security consideration*

### 3. Games

**Private by default**

- Game details, planning notes
- Lineup/formation planning
- Substitution plans
- Post-game notes

**Shareable**:
- Schedule (date, time, opponent, location)
- Results (score)
- Player statistics

### 4. Statistics

**Private by default**

- Individual player stats
- Team performance metrics
- Season trends

**Shareable**:
- Leaderboards
- Season standings
- Individual highlights (with player consent)

### 5. Communications

**Always private**

- Team chat channels
- Direct messages
- Announcements
- File sharing

### 6. Media Gallery

**Private by default**

- Game photos/videos
- Practice highlights
- Team events

**Shareable**:
- Selected albums/items
- Requires explicit publish action

---

## Sharing Mechanics

### Who Can Share?

Only users with appropriate permissions:
- **Owner**: Everything
- **Head Coach**: Most items
- **Manager**: Announcements, calendar (if permitted)

### Share Settings Per Item

```typescript
interface ShareSettings {
  isPublic: boolean;          // Visible on public page?
  publicSince: Date | null;   // When it was made public
  sharedBy: number;           // User ID who shared it
  expiresAt: Date | null;     // Auto-unpublish date (optional)
}
```

### Public Page Content

The public page aggregates all shared items:

```
┌─────────────────────────────────────────┐
│         [Team Name] Public Page         │
├─────────────────────────────────────────┤
│  Team Info                              │
│  ├── Name, colors, logo                 │
│  └── Description                        │
├─────────────────────────────────────────┤
│  Upcoming Games                         │
│  └── [List of shared games]             │
├─────────────────────────────────────────┤
│  Recent Results                         │
│  └── [Scores from shared games]         │
├─────────────────────────────────────────┤
│  Roster (if shared)                     │
│  └── [Names, positions, numbers]        │
├─────────────────────────────────────────┤
│  Announcements (if shared)              │
│  └── [Public notices]                   │
├─────────────────────────────────────────┤
│  Gallery (if shared)                    │
│  └── [Public photos/videos]             │
└─────────────────────────────────────────┘
```

---

## Data Scoping

### Entities Owned by Locker Room

| Entity | Scoped? | Notes |
|--------|---------|-------|
| Person | Yes | Players/staff belong to a locker room |
| Team | Yes | One primary team per locker room (typically) |
| Calendar Event | Yes | Private team events |
| Message/Chat | Yes | All communications |
| Media | Yes | Team gallery |

### Entities with Broader Scope

| Entity | Scope | Notes |
|--------|-------|-------|
| League | Global | Shared across teams |
| Season | League | Contains games from multiple teams |
| Game | Season | Involves two teams from different locker rooms |
| Location | Global or Locker Room | Can be shared or team-specific |

### Cross-Locker Room Interactions

**Games** are the primary cross-locker room entity:

```
Game
├── Home Team (Locker Room A)
├── Away Team (Locker Room B)
├── Season (League scope)
└── Location (shared)
```

Each locker room sees the game from their perspective but shares the core data (score, time, location).

---

## Implementation Considerations

### Database Design

**Option A**: `locker_room_id` FK on scoped entities

```sql
CREATE TABLE person (
  id BIGINT PRIMARY KEY,
  locker_room_id BIGINT NOT NULL,  -- Scoping FK
  -- ...
  FOREIGN KEY (locker_room_id) REFERENCES locker_room(id)
);
```

**Option B**: Locker Room = Team (1:1)

If locker room is synonymous with team, the `team_id` serves as the scoping key, and we don't need a separate `locker_room` table.

### Query Filtering

All queries for scoped entities must include locker room filter:

```typescript
async function getPersons(lockerRoomId: number, user: AuthUser) {
  // Verify user has access to this locker room
  if (!user.lockerRoomIds.includes(lockerRoomId)) {
    throw new ForbiddenError();
  }
  
  return db.query.person.findMany({
    where: eq(person.lockerRoomId, lockerRoomId)
  });
}
```

### Public Page Queries

Public page queries filter for shared items without requiring authentication:

```typescript
async function getPublicGames(teamId: number) {
  return db.query.game.findMany({
    where: and(
      or(
        eq(game.homeTeamId, teamId),
        eq(game.awayTeamId, teamId)
      ),
      eq(game.isPublic, true)
    )
  });
}
```

---

## Security Considerations

### Data Leakage Prevention

1. **Default deny**: All new items are private
2. **Explicit share action**: Requires deliberate user action
3. **Audit sharing**: Log all share/unshare events
4. **No accidental exposure**: UI confirms before publishing

### Youth Privacy (COPPA Considerations)

For teams with minors:
- Photos require guardian consent
- No location data in public schedules
- No birthdates on public pages
- Consider "youth mode" with stricter defaults

### Practice Schedule Security

Sharing practice schedules publicly reveals when/where the team gathers. Options:
- Warn coaches before sharing calendar
- Allow sharing game schedule only
- Redact location for practices
