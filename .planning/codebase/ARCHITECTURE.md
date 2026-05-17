# System Architecture

*Last mapped: 2026-05-17*

## Overall Pattern

**Monorepo with separate client-server architecture**

```
group_home/
├── client/          — React SPA (Single Page Application)
├── server/          — Fastify REST API
└── README.md        — Setup and run instructions
```

- **Not a true monorepo:** Separate `package.json` and `node_modules` for each app
- **Communication:** HTTP/REST over `http://localhost:3000` (dev)
- **Authentication:** JWT tokens in HTTP-only cookies
- **Data flow:** Client → API → MySQL → API → Client

## Frontend Architecture

### Pattern: Component-Based SPA

**Framework:** React 19 with React Router 7 for navigation

**Entry Point:**
1. `client/src/main.tsx` — Renders `<App />`
2. `client/src/App.tsx` — Sets up routing, context providers, session management

**Core Layers:**

```
┌─────────────────────────────────────────────┐
│  Pages (route components)                   │
│  └─ Dashboard, Residents, Logs, Settings    │
└─────────────────────────────────────────────┘
          ↓ uses
┌─────────────────────────────────────────────┐
│  Components (reusable UI)                   │
│  └─ AppLayout, ProtectedRoute, Modals, etc. │
└─────────────────────────────────────────────┘
          ↓ uses
┌─────────────────────────────────────────────┐
│  API Layer (axios client)                   │
│  └─ client/src/api/*.ts                     │
└─────────────────────────────────────────────┘
          ↓ calls
┌─────────────────────────────────────────────┐
│  Backend REST API                           │
└─────────────────────────────────────────────┘
```

**State Management:**

- **Global state:** React Context API
  - `AuthContext` — User session, login/logout
  - `HomeContext` — Selected home (multi-tenant isolation)
- **Local state:** `useState`, `useReducer` in components
- **No Redux/Zustand** — Context + local state is sufficient for current scale

**Routing:**

- **Public routes:** `/login`, `/forgot-password`, `/reset-password`, `/request-access`, `/invite/:token`
- **Protected routes:** All others require authenticated session
- **Role-based routes:**
  - `ProtectedRoute` — Any authenticated user
  - `ManagerRoute` — Manager or Org Admin only
  - `OrgAdminRoute` — Org Admin only
  - `AdminRoute` — Platform admin (separate admin panel)

**Route Guards:**

```tsx
<Route path="/residents" element={
  <ProtectedRoute>
    <ManagerRoute>
      <ShiftGuard>
        <ResidentsPage />
      </ShiftGuard>
    </ManagerRoute>
  </ProtectedRoute>
} />
```

- `ProtectedRoute`: Checks for valid JWT
- `ManagerRoute`: Checks user role
- `ShiftGuard`: Forces shift selection before accessing home data

**Session Management:**

- **Inactivity detection:** `useInactivityTimer` hook
- **Warning modal:** Shows before auto-logout
- **Auto-logout:** After 15 min inactivity (configurable)
- **Session refresh:** JWT renewal handled by backend

## Backend Architecture

### Pattern: Plugin-Based REST API

**Framework:** Fastify (high-performance Node.js server)

**Entry Point:** `server/index.ts`

**Plugin Registration Order (critical):**
```typescript
1. corsPlugin         — Enable CORS for frontend
2. cookiePlugin       — Cookie parsing (required before auth)
3. dbPlugin           — MySQL connection pool
4. authPlugin         — JWT verification decorator
5. adminAuthMiddleware — Admin panel authentication
6. sessionMiddleware  — Auto-attach user from JWT
```

**Core Layers:**

```
┌─────────────────────────────────────────────┐
│  Routes (HTTP handlers)                     │
│  └─ /auth, /residents, /medications, etc.   │
└─────────────────────────────────────────────┘
          ↓ uses
┌─────────────────────────────────────────────┐
│  Middleware (authentication, RBAC)          │
│  └─ session.ts, rbac.ts, adminAuth.ts       │
└─────────────────────────────────────────────┘
          ↓ uses
┌─────────────────────────────────────────────┐
│  Services (business logic)                  │
│  └─ server/services/*.ts                    │
└─────────────────────────────────────────────┘
          ↓ uses
┌─────────────────────────────────────────────┐
│  Plugins (database, auth, cookies)          │
│  └─ server/plugins/*.ts                     │
└─────────────────────────────────────────────┘
          ↓ connects to
┌─────────────────────────────────────────────┐
│  MySQL Database (via Knex migrations)      │
└─────────────────────────────────────────────┘
```

**Request Flow Example (Create Medication):**

```
1. Client: POST /medications
   ↓
2. Fastify: CORS preflight check
   ↓
3. sessionMiddleware: Extract JWT from cookie
   ↓
4. sessionMiddleware: Attach request.user (userId, orgId, role)
   ↓
5. Route handler: Check RBAC (managerOrAbove)
   ↓
6. Route handler: Validate request body (Zod schema)
   ↓
7. Route handler: Query database (fastify.db)
   ↓
8. Route handler: Return JSON response
   ↓
9. Client: Receive 201 Created + medication object
```

**Multi-Tenant Isolation:**

Every database query filters by `org_id`:

```typescript
// sessionMiddleware populates request.user
const orgId = request.user.orgId;

// All queries use orgId for isolation
const residents = await fastify.db.query(
  'SELECT * FROM residents WHERE org_id = ? AND deleted_at IS NULL',
  [orgId]
);
```

**Role-Based Access Control (RBAC):**

Three roles:
1. **org_admin** — Full access to organization
2. **manager** — Manage residents, create employees
3. **employee** — Access assigned homes only

Middleware functions:
- `orgAdminOnly` — Requires `org_admin` role
- `managerOrAbove` — Requires `manager` or `org_admin`

Applied per route:
```typescript
fastify.post('/homes', {
  preHandler: [managerOrAbove],
  handler: async (req, reply) => { ... }
});
```

## Data Flow Patterns

### 1. Authentication Flow

```
┌─────────┐  1. POST /auth/login       ┌────────┐
│ Client  │ ─────────────────────────> │ Server │
│         │  { email, password }       │        │
└─────────┘                             └────────┘
               2. Query DB                 ↓
               SELECT * FROM users      ┌────────┐
               WHERE email = ?  <────── │ MySQL  │
                                        └────────┘
               3. bcrypt.compare()         ↓
               4. Generate JWT             ↓
               5. Set HTTP-only cookie     ↓
┌─────────┐  6. Return user object     ┌────────┐
│ Client  │ <───────────────────────── │ Server │
│         │  { user, token }           │        │
└─────────┘                             └────────┘
               7. Store in AuthContext
               8. Redirect to /home-selection
```

### 2. Resident Data Flow

```
┌─────────┐  1. GET /residents         ┌────────┐
│ Client  │ ─────────────────────────> │ Server │
│         │  Cookie: access_token      │        │
└─────────┘                             └────────┘
               2. Middleware extracts JWT ↓
               3. Populate request.user   ↓
               4. Query DB with orgId  ┌────────┐
               SELECT * FROM residents │ MySQL  │
               WHERE org_id = ?  <──── └────────┘
               AND home_id = ?
               AND deleted_at IS NULL
               5. Return residents[]       ↓
┌─────────┐  6. Render in UI           ┌────────┐
│ Client  │ <───────────────────────── │ Server │
│ ResidentsPage                        │        │
└─────────┘                             └────────┘
```

### 3. Medication Logging Flow (MAR)

```
┌─────────┐  1. POST /medications/logs ┌────────┐
│ Client  │ ─────────────────────────> │ Server │
│ MAR Form│  { medication_id,          │        │
└─────────┘    administered_at,        └────────┘
                given_by_user_id }
               2. Validate schema (Zod)   ↓
               3. Check RBAC (manager+)   ↓
               4. Insert medication_log┌────────┐
               INSERT INTO             │ MySQL  │
               medication_logs ... ───>└────────┘
               5. Return log entry         ↓
┌─────────┐  6. Update UI              ┌────────┐
│ Client  │ <───────────────────────── │ Server │
│ MAR Table                            │        │
└─────────┘                             └────────┘
```

## Database Schema Pattern

### Multi-Tenancy via org_id

Every table (except `orgs`, `password_resets`, `invitations`) has:

```sql
org_id VARCHAR(36) NOT NULL,
FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
```

This ensures:
- Data isolation between organizations
- Cascading deletes when org removed
- Query simplification (always filter by `request.user.orgId`)

### Soft Deletes

Most tables use `deleted_at TIMESTAMP NULL`:

```sql
-- Soft delete
UPDATE residents SET deleted_at = NOW() WHERE id = ?;

-- Query excludes soft-deleted rows
SELECT * FROM residents WHERE deleted_at IS NULL;
```

### Audit Columns

Standard columns on all tables:

```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### UUID Primary Keys

All entities use UUIDs (v4) instead of auto-increment integers:

```sql
id VARCHAR(36) PRIMARY KEY  -- UUID from uuid npm package
```

Benefits:
- No sequential ID enumeration attacks
- Distributed-friendly (no collision risk)
- Frontend can generate IDs client-side

## Frontend Component Hierarchy

### Layout Structure

```
App (BrowserRouter, Providers)
 ├─ Public Routes
 │   ├─ LoginPage
 │   ├─ ForgotPasswordPage
 │   ├─ ResetPasswordPage
 │   ├─ InviteAcceptPage
 │   └─ RequestAccessPage
 │
 ├─ Protected Routes (wrapped in ProtectedRoute)
 │   ├─ HomeSelectionPage (pick home)
 │   ├─ ShiftSelect (daily shift selection)
 │   │
 │   └─ AppLayout (nav, header, content area)
 │       ├─ DashboardPage
 │       ├─ ResidentsPage (Manager+)
 │       │   ├─ ResidentProfile
 │       │   └─ Tabs (Overview, IPOS, Medications, etc.)
 │       ├─ LogsPage
 │       ├─ CalendarPage
 │       └─ SettingsPage
 │
 ├─ Org Admin Routes (OrgAdminRoute)
 │   ├─ OrgDashboard
 │   ├─ HomesPage
 │   │   ├─ CreateHomeWizard
 │   │   └─ HomeDetail
 │   └─ OrgLogsPage
 │
 └─ Admin Panel (AdminRoute, separate auth)
     ├─ AdminLoginPage
     ├─ AdminDashboard
     ├─ AdminRequests (org approval queue)
     └─ AdminOrgs (platform-wide org list)
```

### Reusable Components

**Guards & Wrappers:**
- `ProtectedRoute` — Requires authentication
- `ManagerRoute` — Requires manager or org_admin role
- `OrgAdminRoute` — Requires org_admin role
- `AdminRoute` — Requires admin panel auth
- `ShiftGuard` — Forces shift selection before home access
- `ErrorBoundary` — Catches React errors

**Layout:**
- `AppLayout` — Sidebar navigation, header, main content area
- `SessionWarningModal` — Inactivity warning before auto-logout

**UI Components** (`client/src/components/ui/`):
- Shadcn/ui-style components built on Radix UI primitives
- Button, Dialog, Dropdown, Label, Select, Separator, Tabs, Avatar

## Backend Route Structure

### 24 Route Files (by domain)

**Authentication:**
- `server/routes/auth.ts` — Login, logout, forgot password, reset password
- `server/routes/register.ts` — Organization signup

**Core Entities:**
- `server/routes/orgs.ts` — Organization management
- `server/routes/organizations.ts` — Alternative org endpoint
- `server/routes/users.ts` — Staff management, invitations
- `server/routes/homes.ts` — Group home CRUD
- `server/routes/residents.ts` — Resident profiles
- `server/routes/contacts.ts` — Resident emergency contacts
- `server/routes/goals.ts` — Resident goals/objectives

**Care & Tracking:**
- `server/routes/medications.ts` — Medication schedules + MAR
- `server/routes/iposLogs.ts` — Individual Plan of Service logs
- `server/routes/iposEntries.ts` — IPOS entry details
- `server/routes/dayProgramLogs.ts` — Day program attendance
- `server/routes/vitalsLogs.ts` — Health vitals (BP, temp, etc.)
- `server/routes/vitalsConfig.ts` — Resident-specific vitals tracking
- `server/routes/logs.ts` — General logs endpoint

**Incidents & Tasks:**
- `server/routes/incidents.ts` — Incident reports
- `server/routes/appointments.ts` — Scheduled appointments
- `server/routes/tasks.ts` — Staff tasks

**Communication:**
- `server/routes/announcements.ts` — Organization-wide announcements
- `server/routes/shiftNotes.ts` — Shift handoff notes

**Reports & Admin:**
- `server/routes/exports.ts` — PDF exports (MAR, reports)
- `server/routes/audit.ts` — Activity logs
- `server/routes/admin/auth.ts` — Admin panel login
- `server/routes/admin/orgRequests.ts` — Org approval queue
- `server/routes/admin/orgs.ts` — Platform admin org management

## Service Layer (Business Logic)

Located in `server/services/`

**Purpose:** Extract complex logic out of route handlers

**Example Services:**
- Email service (password reset, invitations via Resend)
- PDF generation (MAR reports via PDFKit)
- Data validation (Zod schemas)
- Database utilities

**Pattern:**
```typescript
// server/services/email.ts
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Reset Your Password',
    text: `Reset link: ${process.env.APP_URL}/reset-password?token=${resetToken}`,
  });
}

// server/routes/auth.ts
import { sendPasswordResetEmail } from '../services/email';
```

## Security Layers

### 1. Authentication (Who are you?)

- JWT tokens in HTTP-only cookies
- Tokens signed with `JWT_SECRET` (min 32 chars)
- Cookie signed with `COOKIE_SECRET` (separate key)
- Admin panel uses separate `ADMIN_JWT_SECRET`

### 2. Authorization (What can you do?)

- `sessionMiddleware` — Populates `request.user`
- RBAC middleware (`orgAdminOnly`, `managerOrAbove`)
- Per-route authorization checks

### 3. Multi-Tenant Isolation

- All queries filter by `request.user.orgId`
- Home-level isolation via `home_staff` join table
- Employees only see assigned homes

### 4. Rate Limiting

- `@fastify/rate-limit` plugin (opt-in per route)
- Example: `/auth/login` limited to 5 attempts/minute
- Prevents brute-force attacks

### 5. Input Validation

- **Zod schemas** for request body validation
- Defined in `server/schemas/*.ts`
- Applied before business logic

### 6. Password Security

- bcrypt hashing (cost factor 10+)
- Passwords never stored plain-text
- Password reset tokens expire after use

### 7. CORS Protection

- Origin whitelist (frontend URL only)
- Credentials allowed (for cookies)
- Preflight requests handled

## PWA Architecture

### Offline Support

**Service Worker (Workbox):**
- Registered via `vite-plugin-pwa`
- Auto-generated from `client/vite.config.ts`

**Caching Strategy:**
```
App Shell (HTML, JS, CSS, images)
  → Cache-first (instant load)

API Calls (GET requests)
  → Network-first (5s timeout)
  → Fallback to cache if offline

Mutations (POST, PUT, DELETE)
  → Network-only (never cached)
```

**Manifest:**
```json
{
  "name": "Group Home Management",
  "short_name": "GroupHome",
  "display": "standalone",
  "start_url": "/",
  "icons": [...],
  "theme_color": "#4F46E5"
}
```

Enables:
- Install to home screen (mobile)
- Offline dashboard access
- Background sync (future enhancement)

## Deployment Architecture (Production)

**Not currently implemented** — Development-only setup

**Expected production architecture:**

```
┌─────────────────────────────────────────────┐
│  CDN / Static Hosting (Vercel, Netlify)    │
│  └─ client/dist/ (Vite build output)       │
└─────────────────────────────────────────────┘
          ↓ API calls
┌─────────────────────────────────────────────┐
│  Node.js Server (EC2, Heroku, Fly.io)      │
│  └─ server/dist/ (TypeScript build output) │
└─────────────────────────────────────────────┘
          ↓ queries
┌─────────────────────────────────────────────┐
│  Managed MySQL (RDS, PlanetScale, etc.)    │
└─────────────────────────────────────────────┘
```

**Current gap:** No CI/CD, no deployment scripts, no environment-specific configs
