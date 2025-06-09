# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development Setup:**
```bash
pnpm run prepare              # Install Husky git hooks
pnpm run start-docker        # Start PostgreSQL container
pnpm run migrate:dev         # Apply database migrations
```

**Code Quality:**
```bash
pnpm run check               # TypeScript type checking
pnpm run lint                # ESLint checking
pnpm run lint:fix            # Auto-fix ESLint issues
pnpm run format              # Format code with Prettier
```

**Testing:**
```bash
pnpm run test:unit           # Unit tests only
pnpm run test:integration    # Integration tests (requires DB)
pnpm run test:all           # All tests (requires DB)
pnpm run coverage           # Test coverage report
```

**Single Test Execution:**
```bash
npx vitest run path/to/test.spec.ts        # Run specific test file
npx vitest --project unit pattern          # Run unit tests matching pattern
npx vitest --project integration pattern   # Run integration tests matching pattern
```

**Database Operations:**
```bash
pnpm run migrate:dev                    # Dev environment migrations
pnpm run deploy:dev                     # Deploy migrations (dev)
pnpm run deploy:preprod                 # Deploy migrations (preprod)
```

**Data Download Applications:**
```bash
pnpm run download-listes-stations                    # Download station lists
pnpm run download-all-informations-stations          # Download station metadata
pnpm run download-all-last-horaires-data            # Download latest hourly data
pnpm run download-all-previous-24-horaires-data     # Download 24h hourly data
pnpm run download-all-last-infrahoraires-data       # Download latest sub-hourly data
```

## Architecture Overview

**Clean Architecture + DDD Pattern:**
- Domain entities in `/src` root and domain-specific folders
- Use cases orchestrate business logic in `use-cases/` directories  
- Infrastructure adapters in `adapters/` (meteofrance, prisma, in-memory)
- Repository pattern abstracts data persistence

**Key Domain Boundaries:**
- `stations/` - Weather station management and metadata
- `commandes/` - Data request commands with status tracking
- `produits-obs/`, `paquet-obs/`, `paquet-stations-obs/` - Different data product types from Météo-France API

**Core Entities:**
- `Station` - Weather stations with geo/operational metadata
- `CommandeStation` - Commands for requesting data from stations
- `InformationStation` - Detailed station information
- Data types: `Horaire` (hourly), `Infrahoraire` (sub-hourly), `Quotidienne` (daily)

**Testing Strategy:**
- `*.spec.ts` - Unit tests (fast, no external dependencies)
- `*.integration.spec.ts` - Integration tests (API calls, database)
- `*.e2e.spec.ts` - End-to-end tests (full workflows)
- In-memory adapters enable fast unit testing

**External Dependencies:**
- Météo-France APIs with token-based authentication (`TokenStorage` singleton)
- PostgreSQL via Prisma ORM
- Docker container for local development database

**Data Flow:**
1. Download station lists → Parse CSV → Store in database
2. Create station commands → Execute API requests → Parse responses
3. Transform API data → Validate with Zod schemas → Persist to database

## Important Implementation Notes

- Use pnpm (not npm) as package manager
- All database schema changes require `pnpm run migrate:dev`
- Git hooks automatically run formatting, linting, and tests on commit
- Integration tests must run with `--no-file-parallelism` flag
- Environment-specific commands available with `:preprod` suffix
- Extensive use of adapters pattern - always implement interfaces consistently