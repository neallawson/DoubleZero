# DoubleZero Database Schema (v2 - Season-Aware)

## Overview

- **Permission Model:** ADMIN (system) | TEAM_ADMIN | TEAM_MEMBER
- **Soft Delete:** All entities use `isActive` boolean
- **Optimistic Locking:** All entities have `version` field

---

## Entity Relationship Diagram

```mermaid
erDiagram
    %% ===== USER & AUTH =====
    user {
        int id PK
        string email UK
        string passwordHash
        boolean isVerified
        boolean isActive
        int version
        timestamp createdAt
    }
    
    user_role {
        int id PK
        int userId FK
        string role
    }
    
    session {
        string id PK
        int userId FK
        string token
        timestamp expiresAt
        timestamp createdAt
    }
    
    user_session_state {
        int id PK
        string sessionId FK
        int activeTeamId FK
        timestamp createdAt
    }

    %% ===== PERSON =====
    person {
        int id PK
        int userId FK
        string displayName
        string firstName
        string lastName
        string email
        string phone
        bytes photo
        date dateOfBirth
        boolean isActive
        int version
        timestamp createdAt
    }

    %% ===== LEAGUE & SEASON =====
    league {
        int id PK
        string name UK
        string description
        string governingBody
        int activeSeasonId FK
        boolean isActive
        int version
        timestamp createdAt
    }
    
    season {
        int id PK
        int leagueId FK
        string name
        date startDate
        date endDate
        boolean isActive
        int version
        timestamp createdAt
    }

    %% ===== TEAM & MEMBERSHIP =====
    team {
        int id PK
        int leagueId FK
        int activeSeasonId FK
        string name
        string shortName
        string primaryColor
        string secondaryColor
        bytes icon
        string iconMime
        boolean isActive
        int version
        timestamp createdAt
    }
    
    locker_room {
        int id PK
        int teamId FK
        int seasonId FK
        string name
        string description
        boolean isPublic
        int version
        timestamp createdAt
    }
    
    team_member {
        int id PK
        int teamId FK
        int personId FK
        int seasonId FK
        string permission
        int teamRoleId FK
        int positionId FK
        int jerseyNumber
        string title
        boolean isActive
        int version
    }
    
    team_role {
        int id PK
        string name UK
        string description
        boolean isActive
    }
    
    player_position {
        int id PK
        string name UK
        string shortName
        string description
        boolean isActive
    }

    %% ===== LOCATION =====
    location {
        int id PK
        string name
        string address
        string city
        string state
        string zip
        string country
        int homeTeamId FK
        boolean isActive
        int version
        timestamp createdAt
    }

    %% ===== GAME =====
    game {
        int id PK
        int seasonId FK
        int locationId FK
        int gameTypeId FK
        int statusId FK
        date date
        time startTime
        time endTime
        int homeTeamId FK
        int awayTeamId FK
        int homeScore
        int awayScore
        int attendance
        string weather
        text notes
        int version
        timestamp createdAt
    }
    
    game_type {
        int id PK
        string name UK
        string description
        boolean isActive
    }
    
    game_status {
        int id PK
        string name UK
        boolean isActive
    }
    
    game_participant {
        int id PK
        int gameId FK
        int teamMemberId FK
        int positionId FK
        int jerseyNumber
        boolean isStarter
        boolean isCaptain
        int minutesPlayed
        int version
    }
    
    game_official {
        int id PK
        int gameId FK
        int personId FK
        string role
        int version
    }
    
    game_event {
        int id PK
        int gameParticipantId FK
        int eventTypeId FK
        int matchMinute
        int matchSecond
        int fieldX
        int fieldY
        text notes
        int relatedParticipantId FK
        int version
        timestamp createdAt
    }
    
    game_event_type {
        int id PK
        string name UK
        string description
        boolean isActive
    }

    %% ===== AUDIT =====
    audit_log {
        int id PK
        string tableName
        int recordId
        string operation
        int userId FK
        timestamp changedAt
        json oldValues
        json newValues
        string ipAddress
        text userAgent
        string requestPath
    }
    
    audit_settings {
        int id PK
        string tableName UK
        boolean isEnabled
        boolean trackOldValues
        boolean trackNewValues
        int retentionDays
    }
    
    app_config {
        int id PK
        string key UK
        text value
        text description
        boolean isActive
        int version
        timestamp createdAt
        timestamp updatedAt
    }

    %% ===== RELATIONSHIPS =====
    user ||--o{ user_role : has
    user ||--o{ session : has
    user ||--o| person : linkedTo
    session ||--o| user_session_state : has
    user_session_state }o--|| team : activeTeam
    
    league ||--o{ season : contains
    league }o--o| season : activeSeason
    league ||--o{ team : contains
    
    team ||--o{ locker_room : hasPerSeason
    team ||--o{ team_member : has
    team }o--o| season : activeSeason
    
    locker_room }o--|| season : forSeason
    
    team_member }o--|| person : is
    team_member }o--|| season : forSeason
    team_member }o--o| team_role : has
    team_member }o--o| player_position : plays
    
    location }o--o| team : homeOf
    
    game }o--|| season : inSeason
    game }o--o| location : playedAt
    game }o--|| game_type : is
    game }o--|| game_status : has
    game }o--|| team : homeTeam
    game }o--|| team : awayTeam
    game ||--o{ game_participant : has
    game ||--o{ game_official : has
    
    game_participant }o--|| team_member : is
    game_participant }o--o| player_position : playsAs
    game_participant ||--o{ game_event : triggers
    
    game_official }o--|| person : is
    
    game_event }o--|| game_event_type : is
    game_event }o--o| game_participant : involves
    
    audit_log }o--o| user : by
```

---

## Seed Data

The following lookup tables are pre-populated by the seed script.

### team_role

| name | description |
|------|-------------|
| Head Coach | Head coach of the team |
| Assistant Coach | Assistant coach |
| Goalkeeper Coach | Specialized goalkeeper coach |
| Manager | Team manager |
| Player | Team player |
| Goalkeeper | Team goalkeeper |
| Parent | Parent or guardian of a player |
| Volunteer | Team volunteer |

### player_position

| name | shortName | description |
|------|-----------|-------------|
| Goalkeeper | GK | Goalkeeper |
| Right Back | RB | Right defender |
| Left Back | LB | Left defender |
| Center Back | CB | Central defender |
| Defensive Midfielder | CDM | Defensive midfielder |
| Central Midfielder | CM | Central midfielder |
| Attacking Midfielder | CAM | Attacking midfielder |
| Right Midfielder | RM | Right midfielder |
| Left Midfielder | LM | Left midfielder |
| Right Winger | RW | Right winger |
| Left Winger | LW | Left winger |
| Striker | ST | Center forward / Striker |
| Center Forward | CF | Center forward |

### game_type

| name | description |
|------|-------------|
| League | Regular league match |
| Friendly | Friendly / exhibition match |
| Tournament | Tournament match |
| Cup | Cup competition match |
| Playoff | Playoff match |
| Scrimmage | Practice scrimmage |

### game_status

| name |
|------|
| Scheduled |
| In Progress |
| Completed |
| Cancelled |
| Postponed |
| Forfeit |

### game_event_type

| name | description |
|------|-------------|
| Goal | Goal scored |
| Own Goal | Own goal |
| Assist | Goal assist |
| Yellow Card | Yellow card issued |
| Red Card | Red card issued |
| Second Yellow | Second yellow card (red) |
| Substitution In | Player substituted in |
| Substitution Out | Player substituted out |
| Injury | Player injury |
| Penalty Kick | Penalty kick awarded |
| Penalty Scored | Penalty kick scored |
| Penalty Missed | Penalty kick missed |
| Penalty Saved | Penalty kick saved |
| Free Kick | Free kick awarded |
| Corner Kick | Corner kick |
| Offside | Offside called |
| Foul | Foul committed |
| Shot on Target | Shot on target |
| Shot off Target | Shot off target |
| Save | Goalkeeper save |
| Timeout | Timeout called |
| Half Time | Half time |
| Full Time | Full time |
