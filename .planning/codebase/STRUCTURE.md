# Directory Structure

*Last mapped: 2026-05-17*

## Project Root

```
group_home/
├── client/            — React frontend (Vite + TypeScript)
├── server/            — Fastify backend (Node.js + TypeScript)
├── .git/              — Git repository
├── .gitignore         — Git ignore rules
└── README.md          — Setup instructions
```

## Frontend Structure (`client/`)

```
client/
├── src/
│   ├── api/                  — Axios API client setup
│   ├── assets/               — Static assets (images, fonts)
│   ├── components/           — Reusable React components
│   │   ├── ui/               — Base UI components (Shadcn-style)
│   │   ├── AppLayout.tsx     — Main app shell (nav + content)
│   │   ├── ProtectedRoute.tsx — Auth guard
│   │   ├── ManagerRoute.tsx  — Manager+ role guard
│   │   ├── OrgAdminRoute.tsx — Org admin role guard
│   │   ├── AdminRoute.tsx    — Admin panel guard
│   │   ├── ErrorBoundary.tsx — Error catching
│   │   └── SessionWarningModal.tsx — Inactivity warning
│   ├── context/              — React Context providers
│   │   ├── AuthContext.tsx   — User session state
│   │   └── HomeContext.tsx   — Selected home state
│   ├── hooks/                — Custom React hooks
│   │   └── useInactivityTimer.ts — Session timeout logic
│   ├── lib/                  — Utility libraries
│   ├── pages/                — Route components (one per route)
│   │   ├── Admin/            — Platform admin panel pages
│   │   ├── Calendar/         — Calendar view
│   │   ├── Dashboard/        — Home dashboard
│   │   ├── ForgotPassword/   — Password reset request
│   │   ├── Homes/            — Org admin home management
│   │   │   └── tabs/         — Home detail tabs
│   │   ├── HomeSelection/    — Choose home on login
│   │   ├── InviteAccept/     — Staff invitation acceptance
│   │   ├── Login/            — User login
│   │   ├── Logs/             — Activity logs
│   │   ├── OrgDashboard/     — Org-wide dashboard
│   │   ├── OrgLogs/          — Org-wide logs
│   │   │   └── tabs/         — Log type tabs
│   │   ├── RequestAccess/    — New org signup
│   │   ├── ResetPassword/    — Password reset completion
│   │   ├── Residents/        — Resident management
│   │   │   ├── tabs/         — Resident detail tabs
│   │   │   └── ResidentProfile.tsx
│   │   ├── Settings/         — User settings
│   │   ├── SetupPin/         — PIN setup for quick login
│   │   └── ShiftSelect/      — Daily shift selection
│   ├── types/                — TypeScript type definitions
│   │   ├── api.ts            — API response types
│   │   ├── auth.ts           — Auth-related types
│   │   ├── resident.ts       — Resident data types
│   │   ├── medication.ts     — Medication types
│   │   ├── incident.ts       — Incident types
│   │   ├── log.ts            — Log entry types
│   │   ├── task.ts           — Task types
│   │   ├── appointment.ts    — Appointment types
│   │   └── index.ts          — Type barrel
│   ├── utils/                — Helper functions
│   │   ├── date.ts           — Date formatting
│   │   └── role.ts           — Role checking
│   ├── App.tsx               — Root component (routing, providers)
│   └── main.tsx              — React entry point
├── public/                   — Static public files (served as-is)
│   ├── icon-192.png          — PWA icon (192x192)
│   └── icon-512.png          — PWA icon (512x512)
├── node_modules/             — NPM dependencies
├── .env.example              — Environment variable template
├── .gitignore
├── eslint.config.js          — ESLint configuration
├── index.html                — HTML entry point (Vite)
├── package.json              — Dependencies and scripts
├── package-lock.json
├── postcss.config.js         — PostCSS configuration
├── tailwind.config.ts        — Tailwind CSS configuration
├── tsconfig.json             — TypeScript project references
├── tsconfig.app.json         — App TypeScript config
├── tsconfig.node.json        — Node tooling TypeScript config
└── vite.config.ts            — Vite build configuration
```

**Key Directories:**
- `src/pages/` — One directory per route (contains index.tsx + sub-components)
- `src/components/` — Shared components used across multiple pages
- `src/components/ui/` — Primitive UI components (buttons, inputs, modals)
- `src/types/` — TypeScript interfaces for data models
- `src/api/` — HTTP client setup (axios)

## Backend Structure (`server/`)

```
server/
├── handlers/                 — (Empty directory — handlers inlined in routes)
├── middleware/               — Fastify middleware
│   ├── session.ts            — JWT extraction and user attachment
│   ├── rbac.ts               — Role-based access control
│   └── adminAuth.ts          — Admin panel authentication
├── migrations/               — Knex database migrations (41+ files)
│   ├── 001_create_orgs.ts
│   ├── 002_create_users.ts
│   ├── 003_create_homes.ts
│   ├── 004_create_home_staff.ts
│   ├── 005_create_residents.ts
│   ├── 006_create_tracked_behaviors.ts
│   ├── 007_create_medications.ts
│   ├── 008_create_medication_logs.ts
│   ├── 009_create_ipos_logs.ts
│   ├── 010_create_behavioral_logs.ts
│   ├── 011_create_day_program_logs.ts
│   ├── 012_create_vitals_logs.ts
│   ├── 013_create_vitals_config.ts
│   ├── 014_create_appointments.ts
│   ├── 015_create_tasks.ts
│   ├── 016_create_shift_roster.ts
│   ├── 017_create_contacts.ts
│   ├── 018_create_goals.ts
│   ├── 019_create_audit_logs.ts
│   ├── 020_create_announcements.ts
│   ├── 021_create_home_settings.ts
│   ├── 022_create_shift_notes.ts
│   ├── 023_create_medication_groups.ts
│   ├── 024_create_invitations.ts
│   ├── 025_create_password_resets.ts
│   ├── 026_add_facility_type_to_orgs.ts
│   ├── 027_create_incidents.ts
│   ├── 028_create_org_requests.ts
│   ├── 029_create_resident_photos.ts
│   ├── 030_add_roles_to_users.ts
│   ├── 031_alter_medications.ts
│   ├── 032_alter_homes.ts
│   ├── 033_alter_residents.ts
│   ├── 034_alter_incidents.ts
│   ├── 035_alter_homes_phase1.ts
│   ├── 036_create_resident_insurance.ts
│   ├── 037_alter_goals.ts
│   ├── 038_create_resident_vitals_config.ts
│   ├── 039_alter_ipos_logs_phase2.ts
│   ├── 040_create_ipos_logs_review.ts
│   └── 041_create_ipos_review_comments.ts
├── plugins/                  — Fastify plugins
│   ├── db.ts                 — MySQL connection pool
│   ├── auth.ts               — JWT verification decorator
│   ├── cookie.ts             — Cookie parsing
│   └── cors.ts               — CORS configuration
├── routes/                   — HTTP route handlers (24 files)
│   ├── admin/                — Admin panel routes
│   │   ├── auth.ts           — Admin login
│   │   ├── orgRequests.ts    — Org approval queue
│   │   └── orgs.ts           — Platform org management
│   ├── announcements.ts      — Organization announcements
│   ├── appointments.ts       — Appointment scheduling
│   ├── audit.ts              — Activity logs
│   ├── auth.ts               — User authentication
│   ├── contacts.ts           — Resident emergency contacts
│   ├── dayProgramLogs.ts     — Day program attendance
│   ├── exports.ts            — PDF exports (MAR, reports)
│   ├── goals.ts              — Resident goals
│   ├── homes.ts              — Group home CRUD
│   ├── incidents.ts          — Incident reports
│   ├── iposEntries.ts        — IPOS entry details
│   ├── iposLogs.ts           — Individual Plan of Service logs
│   ├── logs.ts               — General logs endpoint
│   ├── medications.ts        — Medication schedules + MAR
│   ├── organizations.ts      — Alternative org endpoint
│   ├── orgs.ts               — Organization management
│   ├── register.ts           — Organization signup
│   ├── residents.ts          — Resident profiles
│   ├── shiftNotes.ts         — Shift handoff notes
│   ├── tasks.ts              — Staff tasks
│   ├── users.ts              — Staff management, invitations
│   ├── vitalsConfig.ts       — Resident-specific vitals tracking
│   └── vitalsLogs.ts         — Health vitals (BP, temp, etc.)
├── schemas/                  — Zod validation schemas
├── seeds/                    — Database seed files
├── services/                 — Business logic layer
├── types/                    — TypeScript type definitions
│   └── fastify.d.ts          — Fastify module augmentation
├── utils/                    — Helper functions
│   └── response.ts           — Standard response formatters
├── node_modules/             — NPM dependencies
├── dist/                     — TypeScript build output
├── .env                      — Environment variables (gitignored)
├── .env.example              — Environment variable template
├── .gitignore
├── index.ts                  — Server entry point
├── knexfile.ts               — Knex database configuration
├── nodemon.json              — Nodemon configuration
├── package.json              — Dependencies and scripts
├── package-lock.json
└── tsconfig.json             — TypeScript configuration
```

**Key Directories:**
- `migrations/` — Database schema evolution (41+ migrations, ~1000 lines total)
- `routes/` — One file per domain (24 route files)
- `plugins/` — Fastify plugin registration (db, auth, cors, cookies)
- `middleware/` — Request preprocessing (session extraction, RBAC)
- `services/` — Business logic extracted from routes

## Naming Conventions

### Frontend

**Directories:**
- PascalCase for page directories: `Dashboard/`, `Residents/`
- camelCase for utility directories: `hooks/`, `utils/`, `api/`

**Files:**
- PascalCase for components: `AppLayout.tsx`, `ProtectedRoute.tsx`
- lowercase for pages index: `index.tsx` (inside PascalCase directory)
- camelCase for utilities: `date.ts`, `role.ts`

**Components:**
```tsx
// Pages: PascalCase directory + index.tsx
pages/Dashboard/index.tsx → export default DashboardPage

// Components: PascalCase file = PascalCase export
components/AppLayout.tsx → export default AppLayout

// Hooks: camelCase file, use prefix
hooks/useInactivityTimer.ts → export function useInactivityTimer
```

### Backend

**Directories:**
- lowercase plural: `routes/`, `migrations/`, `plugins/`

**Files:**
- camelCase for routes: `auth.ts`, `residents.ts`, `iposLogs.ts`
- camelCase for utilities: `response.ts`
- Migration numbers: `001_create_table.ts` (zero-padded)

**Functions:**
```typescript
// Route handlers: camelCase
export async function getResidents(request, reply) { ... }

// Middleware: camelCase
export async function sessionMiddleware(request, reply, next) { ... }
```

## File Organization Patterns

### Frontend Pages

Each page is a directory with sub-components:

```
pages/Residents/
├── index.tsx              — Main component exported as default
├── ResidentProfile.tsx    — Sub-component (shared within page)
├── tabs/                  — Tab components
│   ├── Overview.tsx
│   ├── IPOS.tsx
│   ├── Medications.tsx
│   └── Vitals.tsx
└── modals/                — Modals specific to this page
```

### Backend Routes

Each route file exports route registration:

```typescript
// routes/residents.ts
import { FastifyInstance } from 'fastify';
import { managerOrAbove } from '../middleware/rbac';

export default async function residentsRoutes(fastify: FastifyInstance) {
  fastify.get('/residents', {
    preHandler: [managerOrAbove],
    handler: async (req, reply) => { ... }
  });

  fastify.post('/residents', { ... });
  fastify.put('/residents/:id', { ... });
  fastify.delete('/residents/:id', { ... });
}
```

Registered in `index.ts`:
```typescript
fastify.register(residentsRoutes);
```

## Migration Naming

Pattern: `NNN_verb_table_name.ts`

Examples:
- `001_create_orgs.ts` — Initial table creation
- `030_add_roles_to_users.ts` — Add column
- `039_alter_ipos_logs_phase2.ts` — Schema change (phase marker)
- `041_create_ipos_review_comments.ts` — Latest migration

Migrations run sequentially (Knex enforces order).

## Import Path Patterns

### Frontend

**Absolute imports** via Vite alias (`@/*`):
```typescript
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import type { Resident } from '@/types/resident';
```

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Backend

**Relative imports** (no path mapping):
```typescript
import { sessionMiddleware } from '../middleware/session';
import { managerOrAbove } from '../middleware/rbac';
import { success, failure } from '../utils/response';
```

No TypeScript path aliases configured (uses `../../` style imports).
