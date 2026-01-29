# DoubleZero

Soccer team management application with web and mobile interfaces.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Web**: Next.js, React, Tailwind CSS
- **Mobile**: React Native, Expo
- **Auth**: Better-Auth

## Project Structure

```
doublezero/
├── apps/
│   ├── api/          # Express backend
│   ├── web/          # Next.js frontend
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── schema/       # Shared Zod schemas and types
│   └── api-client/   # Typed API wrapper
└── docs/             # Design documentation
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (native install for development)
- Docker & Docker Compose (for production deployment)

## Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Set up PostgreSQL

Make sure PostgreSQL is running locally and create the database:

```bash
createdb doublezero
```

### 4. Run migrations

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start development server

```bash
pnpm dev
```

The API will be available at http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API in development mode |
| `pnpm dev:web` | Start web app in development mode |
| `pnpm dev:mobile` | Start mobile app in development mode |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with initial data |
| `pnpm db:reset` | Reset database (drop + migrate + seed) |

## Production Deployment

Production uses Docker Compose:

```bash
# Copy and configure production environment
cp .env.example .env
# Edit .env with production values

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

## Documentation

See the `/docs` folder for detailed design documentation:

- `00_design_overview.md` - Project overview
- `01_tech_stack.md` - Technology decisions
- `02_architecture.md` - System architecture
- `03_data_model.md` - Database schema
- `20_implementation_plan.md` - Implementation roadmap

## License

Private - All rights reserved
