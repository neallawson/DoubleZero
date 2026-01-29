# MVP Feature Specification

## Vision

DoubleZero MVP is a **comprehensive team management system for soccer coaches** that makes disseminating and discussing important team-and-game-related information as simple and accessible as possible.

All features must work on **both web and mobile** platforms.

---

## Core MVP Features

### 1. Authentication & User Management

**Scope**: Full auth flow with user-person linkage

| Feature | Description | Priority |
|---------|-------------|----------|
| Email/password registration | Standard signup with email verification | Must |
| Login/logout | Session management | Must |
| Password reset | Email-based recovery | Must |
| User profile | Name, email, phone, avatar | Must |
| User→Person linkage | Link authenticated user to team person record | Must |
| Invite system | Coach invites users via email to join team | Must |
| Direct assignment | Coach assigns person to user from dashboard | Must |

---

### 2. Locker Room (Team Workspace)

**Scope**: Private team workspace with 1:1 team relationship

| Feature | Description | Priority |
|---------|-------------|----------|
| Create locker room | Automatically created with team | Must |
| Discussion board | Team announcements and threaded discussions | Must |
| Shared documents | Upload and organize team documents | Must |
| Team messaging | Direct messages between team members | Must |
| Calendar | Centralized team calendar (see Calendar section) | Must |
| Member list | View all team members with roles | Must |
| Privacy controls | All content private by default | Must |

#### Discussion Board
- Post announcements (coach/manager)
- Comment threads on posts
- Pin important posts
- @mention team members
- Rich text formatting

#### Shared Documents
- Upload files (PDF, images, etc.)
- Organize into folders
- Associate with events
- View/download permissions by role

#### Team Messaging
- Direct messages (1:1)
- Unread indicators
- Message history

---

### 3. Team & Roster Management

**Scope**: Full team CRUD with roster and positions

| Feature | Description | Priority |
|---------|-------------|----------|
| Create/edit team | Name, colors, logo | Must |
| Add persons | Create player/staff profiles | Must |
| Roster management | Assign persons to roster with roles | Must |
| Position assignment | Assign player positions | Must |
| Jersey numbers | Assign jersey numbers | Must |
| Season rosters | Roster membership per season | Must |

---

### 4. Calendar & Events System

**Scope**: Unified calendar with event folders

| Feature | Description | Priority |
|---------|-------------|----------|
| Calendar view | Month/week/day views | Must |
| Create events | Games, practices, meetings, tournaments, etc. | Must |
| Event types | Practice, Game, Tournament, Meeting, Social, Other | Must |
| Event details | Date, time, location, description | Must |
| Event folders | Events as containers for related documents | Must |
| Event documents | Attach strategy docs, goals, guidelines to event | Must |
| Event visibility | Team members see relevant events | Must |

#### Event as Folder Concept
Each event acts as an organizational container:
```
Event: "Game vs Thunderbolts - Mar 15"
├── Pre-game strategy.pdf
├── Opponent scouting notes.pdf
├── Starting lineup.png
└── Post-game notes.md

Event: "Practice - Mar 12"
├── Drill sequence.pdf
├── Focus areas.md
└── Attendance.csv
```

Coach creates event → attaches relevant documents → team members view event and see all related materials in one place.

---

### 5. Soccer Field UI & Lineup Planning

**Scope**: Visual field with drag-drop player positioning

| Feature | Description | Priority |
|---------|-------------|----------|
| Field visualization | Soccer field with position markers | Must |
| Drag-drop players | Drag roster members onto field positions | Must |
| Formation templates | Common formations (4-4-2, 4-3-3, etc.) | Should |
| Save lineups | Save lineup configurations | Must |
| Lineup per event | Associate lineup with game event | Must |
| Print/export lineup | Generate printable lineup card | Must |

#### Field UI Mockup
```
┌─────────────────────────────────────┐
│                 GK                  │
│                                     │
│    LB      CB      CB      RB       │
│                                     │
│        LM      CM      RM           │
│                                     │
│    LW            ST          RW     │
│                                     │
└─────────────────────────────────────┘
Bench: [Player] [Player] [Player] ...
```

---

### 6. In-Game Event Tracking (Mobile-First)

**Scope**: Real-time game tracking with time-based events

| Feature | Description | Priority |
|---------|-------------|----------|
| Start game | Begin game clock | Must |
| Game clock | Running time display | Must |
| Substitutions | Log player in/out with timestamp | Must |
| Goals | Log goal scorer, assist, time | Must |
| Fouls | Log foul type, player, time | Must |
| Yellow/Red cards | Log cards with player, time | Must |
| Injuries | Log injury with player, time, notes | Must |
| Timeouts | Log timeout with time | Must |
| Halftime | Mark half, reset/continue clock | Must |
| End game | Finalize score, save all events | Must |

#### Game Tracking Flow
1. Coach opens game from calendar
2. Taps "Start Game" → clock begins
3. During game, taps buttons for events:
   - ⚽ Goal → select scorer → optional assist → logged
   - 🔄 Sub → select out player → select in player → logged
   - 🟨 Card → select player → card type → logged
   - 🏥 Injury → select player → notes → logged
4. Halftime → clock pauses, resumes for 2nd half
5. End Game → final score confirmed, all events saved

**Note**: This is mobile-only for initial release. Web can view game results/events but not do live entry.

---

### 7. Reporting & Output

**Scope**: Formatted, shareable team documents

| Feature | Description | Priority |
|---------|-------------|----------|
| Roster report | Formatted roster with photos, positions, numbers | Must |
| Lineup card | Printable game day lineup | Must |
| Game summary | Post-game summary with events, score | Must |
| Export formats | PDF, print-friendly HTML | Must |
| Share via email | Send reports to parents/players | Should |

---

### 8. Public Team Page (Future MVP Iteration)

**Scope**: Controlled public-facing team information

| Feature | Description | Priority |
|---------|-------------|----------|
| Public page toggle | Enable/disable public page | Should |
| Schedule sharing | Public game schedule | Should |
| Results sharing | Public game results | Should |
| Roster sharing | Optional public roster (privacy controls) | Should |
| Announcements | Public announcements section | Should |
| Content control role | Designated role for public content | Should |

---

## Non-MVP Features (Future Phases)

| Feature | Phase |
|---------|-------|
| League management | Phase 2 |
| Standings calculation | Phase 2 |
| Player statistics aggregation | Phase 2 |
| Push notifications | Phase 2 |
| Email notifications | Phase 2 |
| Photo/video galleries | Phase 2 |
| Advanced analytics | Phase 3 |
| Multi-language support | Phase 3 |
| API for third-party integrations | Phase 3 |

---

## User Stories

### Coach Persona

> As a **head coach**, I want to:
> - Create my team and add all my players quickly
> - Plan practice sessions with attached documents
> - Set up game lineups using a visual field
> - Track game events in real-time from my phone
> - Share important info with players/parents easily
> - Keep all team communication in one private place

### Player/Parent Persona

> As a **player or parent**, I want to:
> - See the team calendar with all upcoming events
> - View game strategy and practice goals before events
> - Know my position and role for each game
> - Access team documents in one place
> - Message the coach or teammates

---

## Implementation Priority Order

1. **Auth + User Management** (foundation)
2. **Locker Room Shell** (team workspace container)
3. **Team + Person CRUD** (core entities)
4. **Roster Management** (team membership)
5. **Calendar + Events** (scheduling)
6. **Event Documents** (event folders)
7. **Discussion Board** (team communication)
8. **Messaging** (direct messages)
9. **Soccer Field UI** (lineup planning)
10. **Game Tracking** (mobile live entry)
11. **Reporting** (formatted output)
12. **Public Page** (controlled sharing)

---

## Technical Considerations

### Real-time Features
- Game tracking needs optimistic UI updates
- Consider WebSocket for live game sync (multiple viewers)
- Offline support for game tracking (sync when connected)

### Mobile Considerations
- Touch-friendly drag-drop for field UI
- Large tap targets for game tracking buttons
- Offline-first for game day scenarios
- Push notifications (Phase 2)

### Document Storage
- File uploads to S3-compatible storage
- Image optimization/thumbnails
- PDF preview
- Size limits per team/locker room
