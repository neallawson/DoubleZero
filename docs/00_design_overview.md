# DoubleZero Design Overview

## Purpose

DoubleZero is a coach-and-player, team-oriented soccer management application for web and mobile. It provides private team workspaces ("Locker Rooms"), game planning tools, roster management, statistics tracking, and communication features.

## Core Concepts

### The Locker Room

Each team has a private **Locker Room** — a secure workspace where all coach, staff, and player activities are strictly private by default:

- **Chat rooms** and **discussion boards**
- **Calendars** (practices, games, events)
- **Rosters** and **player profiles**
- **Game plans** and **statistics**
- **Media galleries** (photos, videos)

Only the team owner/head coach (or delegated personnel) can share specific items to the team's **Public Page**. This allows coaches to manage their teams without requiring all players to have app accounts. Initially for the MVP, the **Public Page** will be read-only, date-and-time sorted, scrolling page of posted content, be it articles, links to other resources or media, scheduled events, etc. "Sticky" events stay at the top of the time line/page.

### Identity Model

- **User**: An authenticated app account (email/password, OAuth)
- **Person**: A profile representing anyone in the soccer domain (player, coach, official, etc.) — may or may not be linked to a User account

This separation allows coaches to create and manage player profiles before those players sign up.

## Key Design Changes (from v1)

| Area | Old Approach | New Approach |
|------|--------------|--------------|
| **Audit fields** | `created_at`, `updated_at`, `created_by`, `updated_by` on every table | Separate audit system with dedicated audit log table; toggleable via system settings |
| **Team private space** | Called "sandbox" | Renamed to **"Locker Room"** |
| **Authentication** | Custom JWT implementation | Industry-standard auth library (Better-Auth or similar) |
| **Schema sharing** | Separate backend/frontend validation | **Single master Zod schema** shared between backend and frontend |
| **Frontend framework** | SvelteKit | TBD (Svelte, React, or other — must support clean mobile parity) |

## Document Index

| Document | Description |
|----------|-------------|
| `01_tech_stack.md` | Technology choices and rationale |
| `02_architecture.md` | System architecture, folder structure, code organization |
| `03_data_model.md` | Database schema design, entity relationships |
| `04_api_design.md` | RESTful API patterns, endpoints, versioning |
| `05_auth_and_security.md` | Authentication, authorization, RBAC |
| `06_locker_room.md` | Team workspace features and privacy model |
| `07_features.md` | Feature specifications and MVP scope |
| `08_ui_ux.md` | UI/UX patterns, accessibility, theming |
| `09_mobile.md` | Mobile app strategy and implementation |
| `10_open_questions.md` | Decisions pending user input |

## Guiding Principles

1. **Privacy by default** — Team data is private; sharing is opt-in
2. **Coach-first UX** — Coaches can manage everything without player accounts
3. **Single source of truth** — One Zod schema drives DB, API, and UI validation
4. **Clean separation** — Auth/authz, domain logic, and UI are decoupled
5. **Mobile parity** — Web and mobile share components/logic where possible
6. **Audit without clutter** — Comprehensive auditing via a separate, toggleable system
