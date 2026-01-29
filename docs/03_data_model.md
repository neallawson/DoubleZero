# DoubleZero Data Model

## Design Principles

1. **Keep `created_at`** — All tables have `created_at` for display purposes ("Member since")
2. **Audit log for changes** — `updated_at`, `created_by`, `updated_by` captured by audit system on updates/deletes
3. **Hard deletes** — No `is_deleted` flag; audit log preserves deleted record data before removal
4. **Optimistic locking** — `version` field on editable entities for concurrent edit protection
5. **Locker Room = Team** — 1:1 relationship; locker room is the team's private workspace
6. **Person vs User** — Persons exist independently; Users are authenticated accounts

---

## Core Entities

### Locker Room (Team Workspace)

```
locker_room
├── id (PK)
├── name                    -- e.g., "Scholar's Guild Spartans"
├── description
├── owner_user_id (FK)      -- User who created/owns it
├── is_public               -- Has a public page?
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

**Note**: Locker Room is 1:1 with Team. Creating a team automatically creates its locker room.

### User (Authentication)

```
user
├── id (PK)
├── email (unique)
├── password_hash           -- Or managed by Better-Auth
├── is_verified
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

Better-Auth may add additional fields/tables for sessions, OAuth accounts, etc.

### Person (Domain Identity)

```
person
├── id (PK)
├── locker_room_id (FK)     -- Which team workspace owns this person
├── user_id (FK, nullable, unique)  -- Link to User if they have an account
├── display_name
├── first_name
├── last_name
├── email                   -- Contact email (may differ from User email)
├── phone
├── photo                   -- BLOB or URL
├── date_of_birth           -- For age-group verification
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

### Team

```
team
├── id (PK)
├── locker_room_id (FK)     -- Owning workspace (1:1)
├── league_id (FK, nullable)
├── name
├── short_name
├── primary_color
├── secondary_color
├── icon (BLOB)
├── icon_mime
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

### League

```
league
├── id (PK)
├── name (unique)
├── description
├── governing_body
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

### Season

```
season
├── id (PK)
├── league_id (FK)
├── name
├── start_date
├── end_date
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

### Team Roster

```
team_roster
├── id (PK)
├── team_id (FK)
├── season_id (FK)
├── person_id (FK)
├── roster_role_id (FK)     -- PLAYER, HEAD_COACH, COACH, MANAGER
├── position_id (FK, nullable)
├── jersey_number
├── is_captain
├── joined_at
├── left_at
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

**Note**: `roster_role_id` is a domain role (not RBAC). Renamed from `role_id` to avoid confusion.

---

## Game & Events

### Location

```
location
├── id (PK)
├── locker_room_id (FK, nullable)  -- Null = shared/public location
├── name
├── address
├── city
├── state
├── zip
├── country
├── home_team_id (FK, nullable)
├── is_active
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

### Game Type

```
game_type
├── id (PK)
├── name (unique)           -- LEAGUE, FRIENDLY, TOURNAMENT, etc.
├── description
└── is_active
```

### Game Status

```
game_status
├── id (PK)
├── name (unique)           -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED
└── is_active
```

### Game

```
game
├── id (PK)
├── season_id (FK)
├── location_id (FK, nullable)
├── game_type_id (FK)
├── status_id (FK)
├── date
├── start_time
├── end_time
├── home_team_id (FK)
├── away_team_id (FK)
├── home_score
├── away_score
├── referee_person_id (FK, nullable)
├── attendance
├── weather
├── notes
├── version                 -- Optimistic locking
└── created_at              -- Timestamp
```

### Game Participant

```
game_participant
├── id (PK)
├── game_id (FK)
├── team_id (FK)
├── person_id (FK)
├── game_role_id (FK)       -- PLAYER, COACH, REFEREE, etc.
├── position_id (FK, nullable)
├── is_starter
├── minutes_played
└── version                 -- Optimistic locking
```

**Note**: Renamed from `game_user` to `game_participant` since it tracks persons, not users.

### Game Event Type

```
game_event_type
├── id (PK)
├── name (unique)           -- GOAL, ASSIST, YELLOW_CARD, RED_CARD, SUBSTITUTION, etc.
├── description
└── is_active
```

### Game Event

```
game_event
├── id (PK)
├── game_id (FK)
├── team_id (FK, nullable)
├── person_id (FK, nullable)
├── event_type_id (FK)
├── match_minute
├── match_second
├── field_x                 -- Field position coordinates
├── field_y
├── notes
└── related_person_id (FK, nullable)  -- e.g., assist provider for a goal
```

---

## Statistics & Standings

### Player Stats (per game)

```
player_stats
├── id (PK)
├── game_id (FK)
├── team_id (FK)
├── person_id (FK)
├── minutes_played
├── goals
├── assists
├── shots_on_goal
├── shots_total
├── fouls_committed
├── fouls_suffered
├── yellow_cards
├── red_cards
├── saves
├── passes_completed
├── passes_attempted
└── version                 -- Optimistic locking
```

### Standings (per season)

```
standings
├── id (PK)
├── season_id (FK)
├── team_id (FK)
├── played
├── won
├── drawn
├── lost
├── goals_for
├── goals_against
├── goal_difference
├── points
├── position
└── version                 -- Optimistic locking
```

---

## Lookup Tables

### Player Position

```
player_position
├── id (PK)
├── name (unique)           -- GOALKEEPER, DEFENDER, MIDFIELDER, FORWARD, etc.
├── short_name              -- GK, DEF, MID, FWD
├── description
└── is_active
```

### Roster Role (Domain)

```
roster_role
├── id (PK)
├── name (unique)           -- PLAYER, HEAD_COACH, COACH, MANAGER, ASSISTANT
├── description
└── is_active
```

### Game Role (Domain)

```
game_role
├── id (PK)
├── name (unique)           -- STARTER, SUBSTITUTE, COACH, REFEREE, LINE_JUDGE
├── description
└── is_active
```

---

## Communication (Future/MVP TBD)

### Message / Chat

```
message
├── id (PK)
├── locker_room_id (FK)
├── channel_id (FK, nullable)  -- For group chats
├── sender_person_id (FK)
├── recipient_person_id (FK, nullable)  -- For DMs
├── content
├── sent_at
└── is_read
```

### Calendar Event

```
calendar_event
├── id (PK)
├── locker_room_id (FK)
├── title
├── description
├── event_type              -- PRACTICE, GAME, MEETING, OTHER
├── start_time
├── end_time
├── location_id (FK, nullable)
├── is_public               -- Show on public page?
├── is_all_day
└── version                 -- Optimistic locking
```

---

## Audit System

### Audit Log

```
audit_log
├── id (PK)
├── table_name
├── record_id
├── operation               -- INSERT, UPDATE, DELETE
├── user_id (FK, nullable)  -- Who made the change
├── changed_at              -- When
├── old_values (JSON)       -- Before state
├── new_values (JSON)       -- After state
├── ip_address
├── user_agent
└── request_path            -- API endpoint
```

### Audit Settings

```
audit_settings
├── id (PK)
├── table_name
├── is_enabled              -- Audit this table?
├── track_old_values
├── track_new_values
└── retention_days          -- Auto-purge after N days
```

---

## Entity Relationship Summary

```
Locker Room
    ├── Person (many)
    ├── Team (many, typically 1)
    │     ├── Team Roster (per season)
    │     │     └── Person + Role + Position
    │     └── Location (home field)
    ├── Calendar Event (many)
    └── Message (many)

League
    └── Season (many)
          ├── Game (many)
          │     ├── Game Participant (many)
          │     ├── Game Event (many)
          │     └── Player Stats (many)
          └── Standings (per team)
```

---

## Notes

- **Optimistic locking**: All editable entities have `version INT DEFAULT 0`; PATCH requests must include version; 409 on mismatch
- **Hard deletes**: No `is_deleted` flag; audit log preserves deleted record data before removal
- **Timestamps**: Store in UTC; convert on display
- **Audit fields**: No inline `created_at`, `updated_at`, `created_by`, `updated_by`; captured by audit system
