# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (`cd server`)
```bash
npm run dev           # Start with nodemon + ts-node watch
npm run build         # Compile TypeScript → dist/
npm run start         # Run compiled output (production)
npm run migrate       # Run pending Knex migrations
npm run migrate:rollback  # Roll back last migration batch
npm run seed          # Seed dev data (admin@grouphome.com / Admin@123)
```

### Client (`cd client`)
```bash
npm run dev           # Vite dev server → http://localhost:5173
npm run build         # tsc + vite build
npm run lint          # ESLint
npm run preview       # Preview production build
```

There are no automated tests. Type-checking (`tsc --noEmit`) is the primary correctness gate.

## Architecture

### Overview
Multi-tenant care home management platform. A single Fastify REST API serves a React SPA. The DB is MySQL in development (via XAMPP/phpMyAdmin) and PostgreSQL in staging/production.

### Server
- **Entry**: `server/index.ts` — registers plugins then all route modules
- **DB**: raw `mysql2` pool exposed as `fastify.db` (via `plugins/db.ts`). All queries are manual SQL strings — no ORM at runtime, Knex is only used for migrations/seeds
- **Auth**: JWT stored in httpOnly cookies (not Authorization header). `fastify.authenticate` is the preHandler decorator that verifies the cookie token and sets `request.user`
- **Admin auth**: separate `fastify.adminAuthenticate` decorator with its own `ADMIN_JWT_SECRET` — no DB lookup, env-only
- **RBAC**: two middleware helpers in `middleware/rbac.ts` — `orgAdminOnly` and `managerOrAbove` — used as preHandlers on individual routes
- **Home scoping**: `utils/homeAccess.ts` provides `getAccessibleHomeIds` / `homeFilter` / `canAccessHome`. `org_admin` sees all homes; `manager` and `employee` are restricted to `home_staff` assignments
- **Audit**: `utils/audit.ts` → `logAudit()` writes to `audit_logs`. Non-fatal — never throws
- **Response shape**: always `{ success: true, data }` or `{ success: false, error: { code, message } }` via `utils/response.ts`
- **Rate limiting**: opt-in per route via `config.rateLimit` (global: false)
- **Email**: `services/email.ts` uses Resend

### Client
- **Auth state**: `AuthContext` — restores session via `GET /auth/me` on mount, stores `user` + `org`
- **Home state**: `HomeContext` — fetches `/homes` after auth resolves, persists selection to `localStorage`
- **Shift gate**: `ShiftGuard` in `App.tsx` wraps all protected routes — shows `ShiftSelect` screen once per calendar day (keyed by `shift_selected_<date>` in localStorage) before letting the user proceed
- **API layer**: `src/api/client.ts` — single axios instance with `withCredentials: true`. A 401 interceptor redirects to `/login` or `/admin/login` based on current path
- **Route guards**: `ProtectedRoute` (any authenticated user), `ManagerRoute` (manager+), `OrgAdminRoute` (org_admin only), `AdminRoute` (admin panel)
- **UI**: shadcn/ui components (Radix UI primitives + Tailwind). Component library via `components.json`

### Roles
| Role | Scope |
|---|---|
| `org_admin` | Full org access — all homes, staff management, org settings |
| `manager` | Assigned homes — residents, logs, can create employees |
| `employee` | Assigned homes — day-to-day care logging |

Admin panel (`/admin/*`) is a separate surface with its own session — not tied to the org role system.

### Key data relationships
- `orgs` → `homes` → `residents` (core hierarchy)
- `home_staff` — junction table linking users to homes
- Most clinical data (medications, incidents, shift notes, ipos entries, vitals) hangs off `resident_id` + `home_id`
- Announcements and tasks are home-scoped
- `audit_logs` are org-scoped and written alongside mutations

### Migrations
Sequential numbered files in `server/migrations/`. Always add a new numbered file — never edit an existing migration. The knexfile uses `mysql2` for development and `postgresql` for staging/production, so avoid MySQL-specific syntax in new migrations.

## Environment Variables

**server/.env**
```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=grouphome
JWT_SECRET=          # min 32 chars
ADMIN_JWT_SECRET=    # separate secret for admin panel
RESEND_API_KEY=      # email
```

**client/.env**
```
VITE_API_URL=http://localhost:3000
```
