# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WG Grappling is a SaaS for managing a martial arts academy (students, classes, attendance, plans, billing, documents). Backend and frontend are separate npm projects with no shared workspace root.

## Commands

All commands run inside `backend/` or `frontend/` respectively — there is no root `package.json`.

### Backend (`backend/`)

- `npm run start:dev` — start NestJS in watch mode
- `npm run build` — `nest build`
- `npm run lint` — eslint with `--fix` over `src`, `apps`, `libs`, `test`
- `npm run test` — Jest unit tests (`*.spec.ts` colocated with source, rootDir `src`)
- `npx jest src/path/to/file.spec.ts` — run a single unit test file
- `npm run test:e2e` — e2e tests via `test/jest-e2e.json`
- `npm run e2e:smoke` — just the smoke e2e spec, run in band
- `npm run prisma:generate` — regenerate Prisma client (output goes to `backend/generated/prisma`, not the default `node_modules` location)
- `npx prisma migrate dev` — create/apply a migration in development
- `npm run prisma:migrate:deploy` — apply pending migrations (production)
- `npm run financial:cycle` — run the billing cycle job manually via ts-node

### Frontend (`frontend/`)

- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — preview a production build

No test runner is configured on the frontend.

## Architecture

### Backend — NestJS 11 + Prisma 7 + PostgreSQL

Each domain lives in its own module under `backend/src/<domain>/` following the standard Nest layering: `*.controller.ts` (HTTP), `*.service.ts` (business rules), `dto/` (class-validator DTOs), and Prisma for persistence. `PrismaService` (`backend/src/prisma/`) wraps the generated client; the client is generated to `backend/generated/prisma` (custom output path — always run `prisma:generate` after pulling schema changes).

Domain modules: `people`, `students`, `responsible`, `address`, `users`, `auth`, `modality`, `student-modality`, `plans`, `student-plan`, `class`, `student-class`, `attendance`, `enrollment`, `charge` (billing/payments), `documents`, `graduation`, `audit`, `dashboard`, `reports`.

Key relationships to keep in mind (see `backend/prisma/schema.prisma`):
- `Person` is the identity core; `Student` and `Address` hang off it 1:1.
- `Enrollment` is a transactional workflow (not its own table) — `enrollment.service.ts` creates `StudentPlan`, `StudentModality`, and `StudentClass` together in a single Prisma transaction.
- Billing: `Plan` → `StudentPlan` → `Charge` → `Payment`. Charges are unique per `(studentId, type, referenceMonth)`.
- `Attendance` is unique per `(classId, studentId, attendanceDate)` — enforced at the DB level, so duplicate check-ins fail at the query layer, not just in app logic.
- `AuditLog` and `Graduation` both reference `User` as the acting actor (`userId` / `graduatedBy`), separate from the `Student`/`Person` being acted on.

**Auth & authorization**: JWT via `@nestjs/passport` + `passport-jwt` (`auth/jwt.strategy.ts`, `auth/jwt-auth.guard.ts`). Role-based access uses the `@Roles(...)` decorator (`auth/roles.decorator.ts`) read by `RolesGuard` (`auth/roles.guard.ts`) against `UserRole` (`OWNER | ADMIN | RECEPTION | TEACHER`) stored on the JWT-derived `request.user`. When adding an endpoint, apply both `JwtAuthGuard` and `RolesGuard` with an explicit `@Roles(...)` list — there is no implicit default-deny without it. See `backend/src/auth/AGENTS.md` for the repo layout reference kept in that folder.

**Config & env**: all env vars are validated centrally in `backend/src/config/env.validation.ts` (Joi schema) and loaded globally via `ConfigModule`. Several vars (`DOCUMENT_STORAGE_PATH`, `DOCUMENT_MAX_SIZE_MB`, `FINANCIAL_CYCLE_ENABLED`, `CORS_ORIGIN`) are conditionally required only when `NODE_ENV=production` — see `backend/.env.example` for local defaults. Startup fails fast if validation fails.

**Documents**: `documents/storage/` abstracts file persistence behind `storage.service.ts`; `local-storage.adapter.ts` is the current (filesystem) implementation. Binaries live outside the repo/dist at `DOCUMENT_STORAGE_PATH`; only metadata is in Postgres.

**Financial cycle**: a scheduled job (`@nestjs/schedule`, cron pattern from `FINANCIAL_CYCLE_CRON`, default daily 05:00 `America/Sao_Paulo`) drives billing state transitions. It guards against concurrent execution across instances using `pg_try_advisory_xact_lock` inside a serializable transaction — a run that can't acquire the lock is skipped, not queued. There's no catch-up mechanism for a missed run; can also be triggered manually via `npm run financial:cycle`.

**Swagger**: enabled at `/api` except when `NODE_ENV=production` (see `bootstrap-config.ts`).

### Frontend — React 19 + TypeScript + Vite + React Router 7

`src/api/` holds the shared Axios client (`client.ts`), config, interceptors, and token storage. `src/services/` has one file per backend domain (e.g. `attendance.service.ts`, `charge.service.ts`) wrapping `apiClient` calls — add new backend calls there rather than calling Axios directly from components. `src/contexts/AuthContext.tsx` holds auth/session state; routes are gated with `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`), which takes an `allowedRoles` prop matching the backend's `UserRole` values — keep frontend route roles in sync with backend `@Roles()` guards for the same operations. All routing is declared in `src/App.tsx`.

## Notes

- `backend/prisma/schema.prisma` is the source of truth for the data model — read it before making assumptions about relations or constraints.
- `docs/INFRASTRUCTURE_DECISION.md` documents production infra requirements (health check at `GET /health`, CORS restricted to `CORS_ORIGIN` in production, storage/backup separation, etc.) if working on deployment-related changes.
