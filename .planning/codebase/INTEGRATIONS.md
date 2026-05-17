# External Integrations

*Last mapped: 2026-05-17*

## Database

### MySQL
**Purpose:** Primary data store for all application data

**Connection:**
- Driver: `mysql2` (Node.js)
- Query builder: Knex.js
- Host: Configured via `DB_HOST` env var (default: `localhost`)
- Port: 3306
- Database: `grouphome`

**Schema Management:**
- Migrations: 41+ migration files in `server/migrations/`
- Migration tool: Knex CLI
- Run: `npm run migrate` (in server/)
- Rollback: `npm run migrate:rollback`

**Database Structure:**
```
orgs                    — Organizations (care facilities)
users                   — Staff accounts
homes                   — Individual group homes
home_staff              — Staff-to-home assignments
residents               — Resident profiles
contacts                — Resident emergency contacts
goals                   — Resident goals/objectives
medications             — Medication schedules
medication_logs         — MAR (Medication Administration Record)
ipos_logs               — Individual Plan of Service logs
ipos_entries            — IPOS entry details
ipos_review_comments    — Review feedback
behavioral_logs         — Behavior tracking
day_program_logs        — Day program attendance
vitals_logs             — Health vitals (BP, temp, etc.)
vitals_config           — Resident-specific vitals tracking config
incidents               — Incident reports
appointments            — Scheduled appointments
tasks                   — Staff tasks
shift_notes             — Shift handoff notes
announcements           — Organization-wide announcements
tracked_behaviors       — Behavior types to monitor
audit_logs              — User activity audit trail
password_resets         — Password reset tokens
invitations             — Staff invite system
org_requests            — New organization signup requests
```

**Key Patterns:**
- All tables use UUID primary keys (`VARCHAR(36)`)
- Multi-tenant isolation via `org_id` foreign key
- Soft deletes: `deleted_at TIMESTAMP NULL`
- Audit columns: `created_at`, `updated_at`

**Files:**
- Connection: `server/plugins/db.ts`
- Migrations: `server/migrations/*.ts`
- Knex config: `server/knexfile.ts`

---

## Authentication

### JWT (JSON Web Tokens)
**Purpose:** Stateless authentication for API requests

**Implementation:**
- Library: `@fastify/jwt` + `jsonwebtoken`
- Storage: HTTP-only cookies (via `@fastify/cookie`)
- Secret: `JWT_SECRET` env var (min 32 chars)
- Admin tokens: Separate `ADMIN_JWT_SECRET`

**Token Flow:**
1. User logs in via `/auth/login` (POST)
2. Server validates credentials (bcrypt comparison)
3. Server issues JWT, sets HTTP-only cookie
4. Client includes cookie in subsequent requests
5. Server validates token via `sessionMiddleware`

**Token Payload:**
```typescript
{
  userId: string,      // User UUID
  orgId: string,       // Organization UUID
  role: string,        // 'org_admin' | 'manager' | 'employee'
  iat: number,         // Issued at
  exp: number          // Expiry
}
```

**Session Management:**
- Cookie name: `access_token`
- Cookie options: `httpOnly: true`, `secure: true` (production), `sameSite: 'strict'`
- Logout: Cookie cleared client-side and server-side

**Files:**
- Plugin: `server/plugins/auth.ts`
- Middleware: `server/middleware/session.ts`
- Routes: `server/routes/auth.ts`

---

## Email Delivery

### Resend
**Purpose:** Transactional email delivery (password resets, invites)

**Integration:**
- Library: `resend` (6.10.0)
- API Key: `RESEND_API_KEY` env var
- From address: `RESEND_FROM_EMAIL` env var

**Email Types:**
1. **Password Reset**
   - Trigger: User requests password reset
   - Template: Plain text with reset link
   - Link format: `{APP_URL}/reset-password?token={reset_token}`
   - Expiry: Token stored in `password_resets` table with TTL

2. **Staff Invitations**
   - Trigger: Admin invites new staff member
   - Template: Plain text with invite link
   - Link format: `{APP_URL}/invite/{invite_token}`

**Configuration:**
- Frontend base URL: `APP_URL` env var (used to construct links)
- Required for password reset flow
- Optional for development (can skip if `RESEND_API_KEY` not set)

**Files:**
- Service: `server/services/email.ts` (assumed based on integration pattern)
- Routes: `server/routes/auth.ts` (password reset), `server/routes/users.ts` (invites)

---

## Document Signing (Optional)

### DocuSign
**Purpose:** Business Associate Agreement (BAA) signing for HIPAA compliance

**Integration:**
- Used during organization onboarding
- If credentials not configured, organizations activate immediately without BAA

**Configuration (Optional):**
```bash
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_CLIENT_ID=
DOCUSIGN_CLIENT_SECRET=
DOCUSIGN_TEMPLATE_ID=        # BAA template
DOCUSIGN_WEBHOOK_SECRET=
```

**Flow:**
1. Organization admin completes signup
2. If DocuSign configured: Send BAA for signature
3. If DocuSign not configured: Auto-activate organization
4. Webhook callback updates `orgs.baa_signed_at`

**Files:**
- Integration: Likely in `server/routes/organizations.ts` or `server/handlers/` directory
- Webhook handler: Likely `/docusign/webhook` route (to be verified)

---

## Frontend ↔ Backend API

### Axios HTTP Client
**Purpose:** All frontend-to-backend communication

**Configuration:**
- Base URL: `VITE_API_URL` env var (default: `http://localhost:3000`)
- Library: `axios` (1.13.6)
- Credentials: Cookies sent automatically (`withCredentials: true`)

**API Structure:**
```
Authentication
  POST   /auth/login
  POST   /auth/logout
  POST   /auth/forgot-password
  POST   /auth/reset-password

Organizations
  POST   /register/org                  — Organization signup
  GET    /orgs/:id                      — Organization details
  GET    /organizations/:id             — Alternative endpoint

Users
  GET    /users
  POST   /users
  PUT    /users/:id
  DELETE /users/:id
  POST   /users/invite

Homes
  GET    /homes
  POST   /homes
  PUT    /homes/:id
  DELETE /homes/:id

Residents
  GET    /residents
  POST   /residents
  PUT    /residents/:id
  DELETE /residents/:id
  GET    /residents/:id/contacts
  GET    /residents/:id/goals
  GET    /residents/:id/vitals-config

Medications
  GET    /medications
  POST   /medications
  GET    /medications/logs              — MAR entries
  POST   /medications/logs
  PUT    /medications/logs/:id

Logs & Tracking
  GET    /ipos-logs
  POST   /ipos-logs
  GET    /ipos-entries
  POST   /ipos-entries
  POST   /ipos-entries/:id/comments
  GET    /day-program-logs
  POST   /day-program-logs
  GET    /vitals-logs
  POST   /vitals-logs
  GET    /logs                          — General logs endpoint

Incidents
  GET    /incidents
  POST   /incidents
  PUT    /incidents/:id

Appointments
  GET    /appointments
  POST   /appointments
  PUT    /appointments/:id
  DELETE /appointments/:id

Tasks
  GET    /tasks
  POST   /tasks
  PUT    /tasks/:id
  DELETE /tasks/:id

Shift Management
  POST   /shift-notes
  GET    /shift-notes

Announcements
  GET    /announcements
  POST   /announcements
  PUT    /announcements/:id
  DELETE /announcements/:id

Exports
  GET    /exports/mar-pdf               — MAR report PDF
  GET    /exports/*                     — Other export endpoints

Audit
  GET    /audit                         — Activity logs

Admin (separate auth)
  POST   /admin/auth/login
  GET    /admin/org-requests
  POST   /admin/org-requests/:id/approve
  POST   /admin/org-requests/:id/reject
  GET    /admin/orgs
```

**Authentication:**
- All routes (except `/auth/login`, `/register/*`, `/admin/auth/login`) require valid JWT cookie
- Role-based access control enforced by `rbac.ts` middleware

**Error Handling:**
- HTTP status codes: 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- Error responses: `{ error: string, message: string }`

**Files:**
- API client setup: `client/src/api/` directory (assumed)
- Route handlers: `server/routes/*.ts`

---

## Client-Side Storage

### IndexedDB (via idb)
**Purpose:** Offline data caching for PWA functionality

**Implementation:**
- Library: `idb` (8.0.3)
- Used by: Service Worker (Workbox)
- Stores: API response cache, app shell assets

**Cache Strategy:**
- **API calls:** Network-first, fallback to cache (5s timeout)
- **Static assets:** Cache-first (JS, CSS, HTML, images, fonts)
- **Expiration:** API cache max 100 entries, 24-hour TTL

**Configuration:**
- Workbox config: `client/vite.config.ts` → `VitePWA.workbox`
- Cache name: `api-cache`
- Excluded routes: `/auth/logout` (never cached)

**Files:**
- Service worker: Auto-generated by `vite-plugin-pwa`
- Config: `client/vite.config.ts`

---

## Rate Limiting

### Fastify Rate Limit
**Purpose:** Prevent abuse and DDoS attacks

**Configuration:**
- Plugin: `@fastify/rate-limit` (10.3.0)
- Strategy: Opt-in per route (not global)
- Limit: Configured per endpoint (to be determined by reading route files)

**Implementation:**
```typescript
fastify.register(rateLimit, { global: false });

// Routes opt in:
fastify.post('/auth/login', {
  config: {
    rateLimit: {
      max: 5,           // 5 requests
      timeWindow: 60000 // per minute
    }
  }
}, handler);
```

**Files:**
- Configuration: `server/index.ts`
- Applied in: Individual route files

---

## Third-Party Dependencies (Client)

### Content Delivery
- **Fonts:** Self-hosted via `@fontsource-variable/geist`
- **Icons:** Bundled via `lucide-react` (no CDN)
- **UI Components:** Bundled via Radix UI (no CDN)

### No Analytics
- No Google Analytics, Mixpanel, or similar integrations detected
- No error tracking (Sentry, Rollbar, etc.) configured

---

## Monitoring & Observability

### Logging
**Frontend:**
- Console logging only (no structured logging)
- No error tracking service

**Backend:**
- Fastify built-in logger (Pino)
- Log level: Configured via `logger: true` option
- Output: Console (JSON format)
- No centralized logging (e.g., Datadog, LogRocket)

### Audit Trail
**Database-level:**
- `audit_logs` table captures user actions
- Fields: `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`
- Route: `GET /audit` (admin-accessible)

---

## CORS (Cross-Origin Resource Sharing)

**Configuration:**
- Plugin: `@fastify/cors` (11.2.0)
- Allowed origin: Frontend URL (`http://localhost:5173` in dev)
- Credentials: Enabled (allows cookies)
- Methods: `GET, POST, PUT, DELETE, OPTIONS`

**Files:**
- Configuration: `server/plugins/cors.ts`
- Registration: `server/index.ts`

---

## Missing Integrations

Based on codebase analysis, the following are **NOT** currently integrated:

- **SMS notifications** (Twilio, etc.)
- **Push notifications** (Firebase Cloud Messaging, OneSignal, etc.)
- **Payment processing** (Stripe, PayPal, etc.)
- **File storage** (AWS S3, Cloudinary, etc.) — files stored in database or local filesystem
- **Analytics** (Google Analytics, Mixpanel, etc.)
- **Error tracking** (Sentry, Rollbar, etc.)
- **Monitoring** (Datadog, New Relic, etc.)
- **Search** (Elasticsearch, Algolia, etc.)
- **Calendar sync** (Google Calendar, Outlook, etc.)
- **Video calls** (Zoom, Twilio Video, etc.)
- **Chat** (real-time messaging)
