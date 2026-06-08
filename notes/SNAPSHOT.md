# Codebase Snapshot — Group Home Management Platform

> Last updated: 2026-06-08
> Branch: dev | Migrations: 001–045

---

## What This App Is

Multi-tenant care home management platform. A single Fastify REST API serves a React SPA.

- **DB**: MySQL in development (XAMPP), PostgreSQL in staging/production
- **Auth**: JWT in httpOnly cookies (`token` for users, `admin_token` for admin panel)
- **Roles**: `employee` → `manager` → `org_admin` (plus a separate admin panel layer)
- **Dev seed**: `admin@grouphome.com` / `Admin@123`

---

## Server Routes (26 files)

| File | What it does |
|---|---|
| `auth.ts` | Login, logout, /me, forgot/reset password, invite acceptance, shift selection |
| `users.ts` | Profile edit, password change, PIN set/verify, invite staff, deactivate users |
| `organizations.ts` | Org details, update name, list/deactivate users (org_admin) |
| `orgs.ts` | Duplicate of org info — get current org, update name, manage users (manager+) |
| `homes.ts` | Home CRUD, staff assignments, create residents, clock in/out, shift roster, announcements, tasks, incidents, shift notes, appointments |
| `residents.ts` | Single resident GET/PATCH, behaviors, contacts, goals, vitals config, ipos logs, vitals logs, day program logs |
| `medications.ts` | Medication CRUD (manager+), administer with outcomes (given/partial/refused/missed/held), PIN-gated |
| `incidents.ts` | Single incident GET, sign-off PATCH, escalate |
| `shiftNotes.ts` | Paginated GET, POST shift notes with flagged option |
| `logs.ts` | IPOS log GET/POST |
| `iposLogs.ts` | IPOS log CRUD |
| `iposEntries.ts` | PATCH IPOS entries (own entries, 2-day edit window) |
| `vitalsLogs.ts` | PATCH vitals to acknowledge flagged readings |
| `dayProgramLogs.ts` | PATCH day program return status/notes |
| `appointments.ts` | PATCH appointment completion |
| `tasks.ts` | PATCH task claim/completion, DELETE (manager+) |
| `announcements.ts` | PATCH pin/unpin, DELETE (manager+) |
| `contacts.ts` | PATCH/DELETE resident emergency contacts (manager+) |
| `goals.ts` | PATCH/DELETE resident goals/CLS/PC codes (manager+) |
| `vitalsConfig.ts` | PATCH vitals config (target ranges, frequency, meal timing) |
| `audit.ts` | GET paginated audit logs, filter by action/entity/user/date (org_admin only) |
| `exports.ts` | GET/POST MAR PDF, IPOS CSV/PDF, incident CSV/PDF, behavioral CSV/PDF |
| `register.ts` | Public org registration request |
| `admin/auth.ts` | Admin panel login/logout |
| `admin/orgs.ts` | Admin: list all orgs, suspend/reactivate |
| `admin/orgRequests.ts` | Admin: list/approve/reject org registration requests with email |

---

## Migrations (001–052)

| Range | What was added |
|---|---|
| 001–004 | Core tables: orgs, users, homes, home_staff |
| 005 | residents |
| 006 | tracked_behaviors |
| 007–008 | medications, medication_logs |
| 009 | ipos_logs (original) |
| 010 | behavioral_logs |
| 011 | incidents |
| 012 | shift_notes |
| 013 | announcements |
| 014–015 | appointments, tasks |
| 016 | shift_roster |
| 017–022 | Alterations: incidents, appointments, shift enums, medications (partial outcome) |
| 023–025 | users session cols, invitations, password_resets |
| 026 | orgs.facility_type |
| 027–028 | residents extended fields, org_requests |
| 029–030 | audit_logs, orgs BAA cols |
| 031 | med_logs PIN cols |
| 032–033 | Indexes, updated_at cols |
| 034–038 | residents clinical fields, homes capacity/staffing, resident_contacts, resident_goals, resident_vitals_config |
| 039–041 | ipos_logs restructured (multi-staff model), ipos_entries, ipos_review_comments |
| 042–045 | vitals_logs, day_program_logs, shift_selections, med_logs.scheduled_date |
| 046–052 | *(orphaned scheduling files — never run, deleted)* |

---

## Client Pages (53 files)

### Auth & Onboarding
- `Login/` — user login
- `Admin/Login.tsx` — admin panel login
- `ForgotPassword/`, `ResetPassword/` — password recovery
- `InviteAccept/` — staff invitation acceptance
- `RequestAccess/` — public org registration request form
- `SetupPin/` — PIN setup after first login

### Core App
- `Dashboard/` — main dashboard: shift info, quick actions, tasks, appointments, announcements
- `HomeSelection/` — facility picker (appears before dashboard)
- `ShiftSelect/` — daily AM/PM/MN shift selection (ShiftGuard enforces once per day)
- `Calendar/` — appointments/events calendar view

### Residents
- `Residents/index.tsx` — resident list with filtering/grouping
- `Residents/ResidentProfile.tsx` — resident detail with tabs:
  - `InfoTab` — demographics, contacts
  - `AppointmentsTab` — appointments
  - `MedicationsTab` — medications
  - `IncidentsTab` — incident history
  - `BehaviorsSection` — tracked behaviors
  - `LogsTab` — log history
  - `VitalsTab` — vital signs + config
  - `MarTab` — MAR (Medication Administration Record)
- `Residents/ResidentForm.tsx` — create/edit resident
- `Residents/CreateHomeWizard.tsx` — multi-step facility setup

### Homes/Facilities
- `Homes/index.tsx` — facility list
- `Homes/HomeDetail.tsx` — facility detail with tabs:
  - `ResidentsTab`, `StaffTab`, `ScheduleTab`, `SettingsTab`
- `Homes/HomeForm.tsx` — create/edit facility

### Logs Hub (Main clinical data entry)
- `Logs/index.tsx` — tabbed hub containing:
  - `IposTab` — IPOS entries for the day
  - `IposCompliancePanel` — compliance metrics
  - `BehavioralTab` — behavioral incident logging
  - `IncidentTab` — safety incidents + `IncidentReviewSheet`
  - `MedsTab` — medication administration
  - `ShiftNotesTab` — shift handoff notes
  - `ReviewQueueTab` — items pending sign-off
  - `ExportSheet` — data export

### Org Admin
- `OrgDashboard/` — org stats overview
- `OrgLogs/` — org-wide logs with tabs: AuditTab, IncidentsTab, IposTab, ExportsTab
- `Settings/` — user settings

### Admin Panel
- `Admin/Dashboard.tsx`, `Admin/Orgs.tsx`, `Admin/Requests.tsx`, `Admin/RequestDetail.tsx`

---

## Client State & API

### Contexts
- `AuthContext` — user + org, restored via `GET /auth/me` on mount
- `HomeContext` — homes list + selected home, persisted to localStorage

### Hooks
- `useMedicationAdmin` — medication administration logic
- `useResidents` — residents fetching
- `useInactivityTimer` — session timeout tracking
- `useOnlineStatus` — offline detection
- `useDashboard` — dashboard data aggregation

### Route Guards
- `ProtectedRoute` — any authenticated user
- `ManagerRoute` — manager+
- `OrgAdminRoute` — org_admin only
- `AdminRoute` — admin panel

### API Client
Single axios instance in `src/api/client.ts` with `withCredentials: true`. 401 interceptor redirects to `/login` or `/admin/login`.

---

## Key Architectural Notes

- **Home scoping**: `utils/homeAccess.ts` — `getAccessibleHomeIds` / `homeFilter` / `canAccessHome`. org_admin sees all; manager/employee restricted to `home_staff` assignments.
- **Audit**: `utils/audit.ts` → `logAudit()` writes to `audit_logs`. Non-fatal.
- **Response shape**: always `{ success: true, data }` or `{ success: false, error: { code, message } }` via `utils/response.ts`
- **ShiftGuard**: wraps all protected routes in `App.tsx` — shows `ShiftSelect` once per calendar day (keyed by `shift_selected_<date>` in localStorage)
- **Email**: `services/email.ts` via Resend
- **Migrations**: always add a new numbered file, never edit existing ones. Avoid MySQL-specific syntax (must work on both mysql2 and postgresql)
