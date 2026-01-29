# DoubleZero Tech Stack

## Overview

This document outlines technology choices for DoubleZero. Items marked **[DECISION NEEDED]** require user input.

---

## Backend

### Core
- **Runtime**: Node.js (ESM modules)
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL
- **Validation**: Zod
- **ORM**: Drizzle

### ORM / Database Access

**Decision**: Drizzle ORM
- TypeScript-first, lightweight, SQL-like syntax
- Schema defined in TypeScript, can derive Zod schemas
- Excellent PostgreSQL support
- Migrations via `drizzle-kit`

---

## Frontend

**Decision**: React/Next.js (web) + React Native with Expo (mobile)

### Web Application
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

### Mobile Application
- **Framework**: React Native with Expo
- **Styling**: NativeWind (Tailwind for RN)
- **UI Components**: React Native Paper or Tamagui
- **Navigation**: Expo Router

### Platform Strategy
- **All features available on both web and mobile**
- **Shared packages**: Zod schemas, API client, types
- **Mobile-only (initially)**: Real-time in-game event tracking

---

## Database Tooling

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Migrations** | Drizzle Kit | Depends on ORM choice |
| **Seeding** | Custom scripts | Flexible, version-controlled |
| **Local Dev** | Dockerized PostgreSQL | Simpler than native PostgreSQL for local dev |

---

## Deployment

- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL (containerized or managed)
- **Reverse Proxy**: Nginx or Traefik
- **SSL**: Let's Encrypt
- **Setup**: Automated DB initialization + root user creation on first run

### Docker Requirements
- `docker-compose.yml` for full stack
- Environment-based configuration
- Volume mounts for persistent data
- Health checks for services

---

## Shared Schema Strategy

The **master schema** lives in a shared package (e.g., `@doublezero/schema`):

```
/packages
  /schema          # Zod schemas, TypeScript types, validation
/apps
  /api             # Backend Express app
  /web             # Frontend web app
  /mobile          # Mobile app (React Native)
```

### Schema Flow

```
Zod Schema (source of truth)
    ↓
TypeScript Types (inferred via z.infer<>)
    ↓
├── Backend: Request validation, DB operations
├── Frontend: Form validation, API response typing
└── Mobile: Same as frontend
```

This ensures **one definition** drives validation everywhere.

---

## Build & Tooling

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Monorepo** | pnpm workspaces | Fast, efficient, good TypeScript support |
| **Bundler** | Vite | Fast dev server, good ecosystem |
| **Linting** | ESLint + Prettier | Standard, configurable |
| **Testing** | Vitest (unit), Playwright (e2e) | Fast, modern, good DX |
| **CI/CD** | GitHub Actions | Widely used, good integration |

---

## Summary of Decisions

| Decision | Choice |
|----------|--------|
| **Database** | PostgreSQL |
| **ORM** | Drizzle |
| **Web Framework** | Next.js 14+ (App Router) |
| **Mobile Framework** | React Native with Expo |
| **Styling** | Tailwind CSS (web), NativeWind (mobile) |
| **Deployment** | Docker + Docker Compose |
| **Monorepo** | pnpm workspaces |

All features available on both web and mobile. Real-time in-game tracking is mobile-only initially.
