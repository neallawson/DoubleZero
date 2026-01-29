# DoubleZero API Design

## Overview

RESTful API under `/api/v1/`. All endpoints return JSON. Authentication via Better-Auth (JWT in Authorization header).

---

## Common Patterns

### Base URL

```
https://api.doublezero.app/api/v1
```

### Authentication

```
Authorization: Bearer <jwt_token>
```

### Pagination

All list endpoints support:

```
GET /api/v1/teams?page=1&limit=25&sortBy=name&order=asc
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 25,
    "totalCount": 142,
    "totalPages": 6
  }
}
```

### Filtering

Query params for filtering (snake_case):

```
GET /api/v1/games?season_id=5&team_id=12&status=COMPLETED
```

### Standard Responses

| Status | Usage |
|--------|-------|
| 200 | Successful GET, PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Resource not found |
| 409 | Conflict (optimistic locking) |
| 500 | Server error |

### Error Response Format

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "name": ["Required"],
      "email": ["Invalid email format"]
    }
  }
}
```

---

## Authentication Endpoints

Handled by Better-Auth, typically mounted at `/api/auth/*`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/refresh` | Refresh JWT |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/reset-password` | Set new password |
| GET | `/api/auth/verify-email/:token` | Verify email |
| GET | `/api/auth/oauth/:provider` | OAuth initiation |
| GET | `/api/auth/oauth/:provider/callback` | OAuth callback |

---

## Locker Room Endpoints

```
GET    /api/v1/locker-rooms              # List user's locker rooms
POST   /api/v1/locker-rooms              # Create locker room
GET    /api/v1/locker-rooms/:id          # Get locker room details
PATCH  /api/v1/locker-rooms/:id          # Update locker room
DELETE /api/v1/locker-rooms/:id          # Delete locker room
```

### Create Locker Room

```json
POST /api/v1/locker-rooms
{
  "name": "Springfield United FC",
  "description": "U14 travel team"
}
```

---

## Team Endpoints

```
GET    /api/v1/locker-rooms/:lrId/teams         # List teams in locker room
POST   /api/v1/locker-rooms/:lrId/teams         # Create team
GET    /api/v1/teams/:id                        # Get team
PATCH  /api/v1/teams/:id                        # Update team
DELETE /api/v1/teams/:id                        # Soft delete team
POST   /api/v1/teams/:id/icon                   # Upload team icon
GET    /api/v1/teams/:id/icon                   # Get team icon (public)
```

### Create Team

```json
POST /api/v1/locker-rooms/1/teams
{
  "name": "Springfield United",
  "shortName": "SU",
  "primaryColor": "#003366",
  "secondaryColor": "#FFD700",
  "leagueId": 5
}
```

---

## Person Endpoints

```
GET    /api/v1/locker-rooms/:lrId/persons       # List persons
POST   /api/v1/locker-rooms/:lrId/persons       # Create person
GET    /api/v1/persons/:id                      # Get person
PATCH  /api/v1/persons/:id                      # Update person
DELETE /api/v1/persons/:id                      # Soft delete
POST   /api/v1/persons/:id/link-user            # Link to user account
DELETE /api/v1/persons/:id/link-user            # Unlink from user
```

### Create Person

```json
POST /api/v1/locker-rooms/1/persons
{
  "displayName": "Alex Johnson",
  "firstName": "Alex",
  "lastName": "Johnson",
  "email": "alex@example.com",
  "phone": "555-1234",
  "dateOfBirth": "2010-05-15"
}
```

---

## Roster Endpoints

```
GET    /api/v1/teams/:teamId/roster                    # Current season roster
GET    /api/v1/teams/:teamId/roster?season_id=5       # Specific season
POST   /api/v1/teams/:teamId/roster                    # Add to roster
PATCH  /api/v1/roster/:id                              # Update roster entry
DELETE /api/v1/roster/:id                              # Remove from roster
```

### Add to Roster

```json
POST /api/v1/teams/12/roster
{
  "personId": 45,
  "seasonId": 5,
  "rosterRoleId": 1,
  "positionId": 3,
  "jerseyNumber": 10,
  "isCaptain": false
}
```

---

## Game Endpoints

```
GET    /api/v1/games                              # List games (filtered)
POST   /api/v1/games                              # Create game
GET    /api/v1/games/:id                          # Get game details
PATCH  /api/v1/games/:id                          # Update game
DELETE /api/v1/games/:id                          # Soft delete

GET    /api/v1/games/:id/participants             # Game participants
POST   /api/v1/games/:id/participants             # Add participant
DELETE /api/v1/games/:id/participants/:pId        # Remove participant

GET    /api/v1/games/:id/events                   # Game events
POST   /api/v1/games/:id/events                   # Add event
DELETE /api/v1/games/:id/events/:eId              # Remove event

GET    /api/v1/games/:id/stats                    # Player stats for game
POST   /api/v1/games/:id/stats                    # Add/update stats
```

### Create Game

```json
POST /api/v1/games
{
  "seasonId": 5,
  "homeTeamId": 12,
  "awayTeamId": 15,
  "gameTypeId": 1,
  "statusId": 1,
  "date": "2025-03-15",
  "startTime": "14:00:00",
  "locationId": 8
}
```

### Add Game Event

```json
POST /api/v1/games/100/events
{
  "eventTypeId": 1,
  "teamId": 12,
  "personId": 45,
  "matchMinute": 23,
  "fieldX": 0.75,
  "fieldY": 0.45,
  "notes": "Header from corner kick"
}
```

---

## League & Season Endpoints

```
GET    /api/v1/leagues                    # List leagues
POST   /api/v1/leagues                    # Create league (admin)
GET    /api/v1/leagues/:id                # Get league
PATCH  /api/v1/leagues/:id                # Update league
DELETE /api/v1/leagues/:id                # Soft delete

GET    /api/v1/leagues/:id/seasons        # List seasons in league
POST   /api/v1/seasons                    # Create season
GET    /api/v1/seasons/:id                # Get season
PATCH  /api/v1/seasons/:id                # Update season
DELETE /api/v1/seasons/:id                # Soft delete

GET    /api/v1/seasons/:id/standings      # Get standings
```

---

## Lookup Table Endpoints

```
GET    /api/v1/player-positions           # List positions
GET    /api/v1/game-types                 # List game types
GET    /api/v1/game-statuses              # List statuses
GET    /api/v1/roster-roles               # List roster roles
GET    /api/v1/game-roles                 # List game roles
GET    /api/v1/event-types                # List event types
```

These are mostly read-only; admin can create/update.

---

## Location Endpoints

```
GET    /api/v1/locations                  # List locations
POST   /api/v1/locations                  # Create location
GET    /api/v1/locations/:id              # Get location
PATCH  /api/v1/locations/:id              # Update location
DELETE /api/v1/locations/:id              # Soft delete
```

---

## Calendar Endpoints

```
GET    /api/v1/locker-rooms/:lrId/calendar            # Calendar events
POST   /api/v1/locker-rooms/:lrId/calendar            # Create event
GET    /api/v1/calendar/:id                           # Get event
PATCH  /api/v1/calendar/:id                           # Update event
DELETE /api/v1/calendar/:id                           # Delete event
```

---

## Public Page Endpoints (No Auth Required)

```
GET    /api/v1/public/teams/:id                       # Public team info
GET    /api/v1/public/teams/:id/schedule              # Public game schedule
GET    /api/v1/public/teams/:id/results               # Public game results
GET    /api/v1/public/teams/:id/roster                # Public roster (if shared)
GET    /api/v1/public/teams/:id/announcements         # Public announcements
```

---

## Audit Endpoints (Admin)

```
GET    /api/v1/admin/audit-logs                       # Query audit logs
GET    /api/v1/admin/audit-settings                   # Get audit config
PATCH  /api/v1/admin/audit-settings/:table            # Update audit config
```

---

## Bulk Operations (Future)

```
POST   /api/v1/games/:id/stats/bulk        # Bulk update player stats
POST   /api/v1/teams/:id/roster/bulk       # Bulk roster operations
```

---

## Webhooks (Future)

```
POST   /api/v1/webhooks                    # Register webhook
GET    /api/v1/webhooks                    # List webhooks
DELETE /api/v1/webhooks/:id                # Remove webhook
```

Events: `game.created`, `game.completed`, `roster.updated`, etc.

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Auth endpoints | 10/min |
| Read endpoints | 100/min |
| Write endpoints | 30/min |
| Admin endpoints | 50/min |

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706400000
```
