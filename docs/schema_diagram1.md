# DoubleZero Database Schema Diagram

Generated to help visualize current table relationships.

```mermaid
erDiagram
    %% Authentication & Users
    user {
        int id PK
        string email UK
        string name
        bool emailVerified
        timestamp createdAt
    }
    
    user_role {
        int id PK
        int userId FK
        enum appRole "ADMIN|USER"
    }
    
    session {
        string id PK
        int userId FK
        string token
        timestamp expiresAt
    }
    
    account {
        string id PK
        int userId FK
        string providerId
        string accountId
    }
    
    verification {
        string id PK
        string identifier
        string value
        timestamp expiresAt
    }

    %% Core Domain
    locker_room {
        int id PK
        string name
        text description
        bool isPublic
        int version
    }
    
    team {
        int id PK
        int lockerRoomId FK
        int leagueId FK
        string name
        string shortName
        string primaryColor
        string secondaryColor
        text icon
        bool isActive
        int version
    }
    
    person {
        int id PK
        int userId FK "optional - links to app user"
        string displayName
        string firstName
        string lastName
        string email
        string phone
        text photo
        date dateOfBirth
        bool isActive
        int version
    }

    %% Team Membership & Permissions
    team_member {
        int id PK
        int teamId FK
        int personId FK
        enum permission "ADMIN|MEMBER|VIEWER"
        int teamRoleId FK "optional"
        string title "optional freeform"
        bool isActive
        int version
    }
    
    team_role {
        int id PK
        string name UK "Head Coach, Player, etc"
        text description
        bool isActive
    }
    
    season_roster {
        int id PK
        int teamId FK
        int seasonId FK
        int personId FK
        int teamRoleId FK
        int positionId FK
        int jerseyNumber
        bool isCaptain
        date joinedAt
        date leftAt
        bool isActive
        int version
    }
    
    player_position {
        int id PK
        string name UK
        string shortName
        text description
        bool isActive
    }

    %% League & Season
    league {
        int id PK
        string name UK
        text description
        string governingBody
        bool isActive
        int version
    }
    
    season {
        int id PK
        int leagueId FK
        string name
        date startDate
        date endDate
        bool isActive
        int version
    }

    %% Location (PROBLEM: has locker_room_id)
    location {
        int id PK
        int lockerRoomId FK "WHY? Should this be teamId?"
        string name
        string address
        string city
        string state
        string zip
        string country
        int homeTeamId FK
        bool isActive
        int version
    }

    %% Games
    game {
        int id PK
        int seasonId FK
        int locationId FK
        int gameTypeId FK
        int statusId FK
        date date
        string startTime
        string endTime
        int homeTeamId FK
        int awayTeamId FK
        int homeScore
        int awayScore
        int refereePersonId FK
        int attendance
        string weather
        text notes
        int version
    }
    
    game_type {
        int id PK
        string name UK
        text description
        bool isActive
    }
    
    game_status {
        int id PK
        string name UK
        bool isActive
    }
    
    game_role {
        int id PK
        enum name "STARTER|SUBSTITUTE|COACH|REFEREE|LINE_JUDGE"
        text description
        bool isActive
    }
    
    game_participant {
        int id PK
        int gameId FK
        int teamId FK
        int personId FK
        int gameRoleId FK
        int positionId FK
        bool isStarter
        int minutesPlayed
        int version
    }
    
    game_event_type {
        int id PK
        string name UK
        text description
        bool isActive
    }
    
    game_event {
        int id PK
        int gameId FK
        int teamId FK
        int personId FK
        int eventTypeId FK
        int matchMinute
        int matchSecond
        real fieldX
        real fieldY
        text notes
        int relatedPersonId FK
    }

    %% Audit
    audit_log {
        int id PK
        string tableName
        int recordId
        string operation
        int userId FK
        timestamp changedAt
        jsonb oldValues
        jsonb newValues
        string ipAddress
        text userAgent
        string requestPath
    }
    
    audit_settings {
        int id PK
        string tableName UK
        bool isEnabled
        bool trackOldValues
        bool trackNewValues
        int retentionDays
    }

    %% Relationships
    user ||--o{ user_role : has
    user ||--o{ session : has
    user ||--o{ account : has
    user ||--o| person : "optionally linked"
    
    locker_room ||--|| team : "1:1 owns"
    team }o--|| league : "belongs to"
    
    person ||--o{ team_member : "memberships"
    team ||--o{ team_member : "members"
    team_member }o--o| team_role : "has role"
    
    team ||--o{ season_roster : "historical"
    season ||--o{ season_roster : "for season"
    person ||--o{ season_roster : "played"
    season_roster }o--o| team_role : "role"
    season_roster }o--o| player_position : "position"
    
    league ||--o{ season : has
    
    location }o--o| locker_room : "PROBLEM - should be teamId?"
    location }o--o| team : "home team"
    
    game }o--|| season : "in season"
    game }o--o| location : "played at"
    game }o--|| game_type : type
    game }o--|| game_status : status
    game }o--|| team : "home team"
    game }o--|| team : "away team"
    game }o--o| person : "referee"
    
    game ||--o{ game_participant : has
    game_participant }o--|| team : "for team"
    game_participant }o--|| person : "person"
    game_participant }o--|| game_role : "role"
    game_participant }o--o| player_position : "position"
    
    game ||--o{ game_event : has
    game_event }o--o| team : "team"
    game_event }o--o| person : "person"
    game_event }o--|| game_event_type : "type"
    game_event }o--o| person : "related person"
    
    audit_log }o--o| user : "by user"
```

## Issues Identified

### 1. `location.locker_room_id` - **WRONG**
Locations are physical places (fields, stadiums). They should NOT reference locker_room (a virtual team workspace).

**Options:**
- A) Remove `locker_room_id` entirely - locations are global/shared
- B) Replace with `team_id` - if locations should be "owned" by a team
- C) Keep both `team_id` (owner) and `home_team_id` (default home team)

### 2. Schema looks reasonable otherwise
- `team` → `locker_room` (1:1) ✅
- `team_member` for permissions ✅  
- `season_roster` for historical data ✅
- `person` no longer has `locker_room_id` ✅

## Recommendation

For `location`:
- Remove `locker_room_id`
- Keep `home_team_id` (which team plays home games here)
- Optionally add `owner_team_id` if you want team-specific locations
