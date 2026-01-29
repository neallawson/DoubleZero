# Open Questions & Decisions Needed

This document tracks decisions that need user input before finalizing the design.

> **See `99_decisions.md` for all confirmed decisions.**

---

# ✅ Resolved Decisions

## Data Model
- **Role Model**: Separate RBAC (ADMIN, USER) from domain roles (roster/game roles)
- **Person-User**: `person.user_id` FK (nullable, unique) — persons can exist without accounts
- **Optimistic Locking**: Keep `version` field; 409 on conflict
- **Soft Deletes**: Hard deletes with audit log preservation
- **Audit Fields**: Keep `created_at` on tables; other fields in audit log

## Technology Stack
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **Frontend**: React/Next.js (web) + React Native with Expo (mobile)
- **Deployment**: Docker + Docker Compose with automated setup
- **Multi-tenancy**: Single shared PostgreSQL database with row-level filtering

## Architecture
- **Locker Room Model**: 1:1 with Team (no cross-team sharing)
- **Platform Strategy**: All features on both web and mobile; real-time game tracking mobile-only initially

## MVP Scope
See `08_mvp_features.md` for detailed feature specification including:
- Auth with user→person linkage (invites + direct assignment)
- Locker room essentials (discussion board, calendar, shared docs, messaging)
- Events as folders containing related documents
- Soccer field UI with drag-drop positioning
- "Start Game" real-time tracking (mobile-first)
- Minimal reporting (formatted rosters, lineup cards)

---

# Remaining Minor Questions

## 1. Naming Conventions

**API JSON fields**: snake_case or camelCase?
- snake_case matches DB conventions
- camelCase is more JavaScript-idiomatic

**Recommendation**: camelCase for JSON (JavaScript convention), snake_case for DB columns.

## 2. Timestamps

Store in UTC and convert on display?

**Recommendation**: Yes — always store UTC, convert in frontend based on user's timezone.

## 3. Public Page Details

To be refined as features are developed:
- What specific entities can be shared?
- Privacy controls for minors?
- Consent workflows for photos?

## 4. New Role for Public Content

Need to define a new roster role for managing public page/wall content (beyond HEAD_COACH).

Options:
- `CONTENT_MANAGER` — dedicated role
- Permission flag on existing roles
- Coach can delegate to specific persons

---

# Summary

**All major decisions are resolved.** The design documents are ready for implementation planning.

Minor items above can be decided during implementation as needed.
