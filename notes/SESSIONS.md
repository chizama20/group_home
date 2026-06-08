# Session Log

Newest session at the top. One entry per working session.

---

## 2026-06-08 — Session Notes Setup

**What we did:**
- Created this `notes/` folder
- Built `SNAPSHOT.md` — a full inventory of every route, migration, page, context, and hook in the codebase as of migrations 001–052
- Purpose: so future sessions don't require a full codebase scan to get oriented

**Current state of the app:**
- 52 migrations applied, full scheduling module complete (shift_slots, shift_clock, shift_requests)
- Latest fix: mobile bottom nav bar, password toggles, collapsible sidebar (2026-05-30)
- Branch: dev, clean working tree

---

## 2026-05-30 — Mobile + UI Polish

**Branch/PR:** direct to dev
**Commits:** `5611659`

**What we did:**
- Fixed mobile bottom nav bar layout/display issues
- Added password visibility toggles on login/reset forms
- Made the sidebar collapsible

---

## 2026-04-08 — Security & Error Handling Fixes

**Branch/PR:** direct to dev
**Commits:** `73f428e`, `2369000`, `b9f1b2e`, `2fe6adc`, `5527554`

**What we did:**
- F-01: Added rate limiting to forgot-password endpoint
- F-02: Added rate limiting to org registration endpoint
- F-03: Added environment variable validation on startup
- F-07: Added global error handler
- Removed old/stale seed data

---

## 2026-04-07 — PR #10: Shift Notes, Incident Polish & Announcements

**Branch/PR:** `shift_notes` → dev
**Commits:** `26c958b`

**What we did:**
- `ShiftNotesTab` — paginated shift notes with flagged option
- `shiftNotes.ts` server route — GET paginated, POST new notes
- Incident review polish — `IncidentReviewSheet`, sign-off and escalate flows
- Announcement feed on dashboard, pin/unpin, delete (manager+)

---

## 2026-04-07 — PR #9: Medications & MAR

**Branch/PR:** `medication_plan` → dev
**Commits:** `510af38`

**What we did:**
- `MedicationsTab` on resident profile
- `MarTab` — Medication Administration Record view
- `medications.ts` server route — CRUD, administration with outcomes (given/partial/refused/missed/held)
- PIN-gated medication administration (`PinModal`)
- Migrations 020, 022, 031, 045 — medication alterations, partial outcome, PIN cols, scheduled_date
- `useMedicationAdmin` hook

---

## 2026-04-07 — PR #8: Daily Operations (Shift Selection + IPOS/Vitals/Day Program)

**Branch/PR:** `daily_operation` → dev
**Commits:** `18a3ed9`, `ff690a1`

**What we did:**
- `ShiftSelect` screen with AM/PM/MN toggles, localStorage persistence
- `ShiftGuard` component wrapping core routes in App.tsx (once per calendar day)
- Migrations 039–044: restructured ipos_logs, created ipos_entries, ipos_review_comments, vitals_logs, day_program_logs, shift_selections
- `IposTab`, `IposCompliancePanel` — IPOS entries per shift
- `VitalsTab`, `VitalsLogForm` — vitals entry and flagged acknowledgment
- `DayProgramLogForm` — attendance logging

---

## 2026-04-06 — PR #7: Setup Wizard + Clinical Extensions

**Branch/PR:** `setup-wizard` → dev
**Commits:** `2d47bc2`

**What we did:**
- Extended Resident type with 10 new clinical fields (medicaid_id, admit_date, HAB waiver, LOA, sleep hours, day program attendance, etc.)
- Added `ResidentContact`, `ResidentGoal`, `ResidentVitalsConfig` interfaces and API functions
- `CreateHomeWizard` — multi-step facility onboarding wizard
- `InviteStaffWizard` — multi-step staff invitation flow
- 13 new API functions for discharge, contacts, goals, vitals-config CRUD

---

## 2026-04-06 — PR #6: Resident Revamp

**Branch/PR:** `resident-revamp` → dev
**Commits:** `57e3a24`

**What we did:**
- Migrations 034–038: alter residents (10 clinical fields), alter homes (capacity + min staffing), create resident_contacts, resident_goals, resident_vitals_config tables
- Revamped `ResidentProfile` with tabbed layout
- Added `InfoTab`, `AppointmentsTab`, `IncidentsTab`, `BehaviorsSection`, `LogsTab`, `VitalsTab`
- `contacts.ts`, `goals.ts`, `vitalsConfig.ts` server routes

---

## 2026-04-04 — PR #5: Proto 3 — UI Revamp

**Branch/PR:** `proto3/sprint-5-ui-revamp` → dev
**Commits:** `893cfeb` + several fix commits

**What we did:**
- Full dark-first UI redesign — dashboard, residents, logs, calendar
- Design system: Tailwind tokens, shadcn/ui integration, global layout components
- `AppLayout.tsx` with collapsible sidebar
- `HomeSwitcherStrip` — facility switcher
- `Settings/` page (replaces old Shift page in nav)
- `Calendar/` page (replaces Meds in nav)
- N+1 query fixes across several endpoints
- Rate limiting, audit logging, DB indexes, updated_at columns (migrations 029–033)
- Admin route fixes and session storage checker
- `SetupPin` dark mode, `OfflineBanner`, `SessionWarningModal`

---

## 2026-04-03 — Proto 3 Backend: Permissions + Audit + Indexes

**Branch/PR:** direct commits to proto3 branch

**What we did:**
- Backend permission tightening — orgAdminOnly, managerOrAbove middleware enforced across all relevant routes
- Audit logging added to mutations (`logAudit` calls)
- DB indexes migration (032)
- updated_at columns migration (033)
- Rate limiting on login endpoints

---

## 2026-03-31 — Proto 2 (Sprints 1–4): Foundation

**Branch/PRs:** sprints 1–4

**What we built across these sprints:**
- **Sprint 1**: httpOnly cookie auth, invite flow, password reset, inactivity timeout
- **Sprint 2**: org onboarding, admin panel (`/admin/*`), audit log table, signing PIN
- **Sprint 3**: shadcn/ui component library, design tokens, responsive layout, PWA setup, offline queue skeleton
- **Sprint 4**: Zod validation on all routes, dashboard data endpoint, skeleton loading states, react-hook-form integration

---

## 2026-03-28 — Initial Seed & Schema

**What we did:**
- Full test dataset in seed: 3 roles (employee, manager, org_admin), sample org, homes, residents
- Core migrations 001–016: orgs, users, homes, home_staff, residents, behaviors, medications, med_logs, ipos_logs, behavioral_logs, incidents, shift_notes, announcements, appointments, tasks, shift_roster

---

## Template for Future Sessions

```
## YYYY-MM-DD — Short Description

**Branch/PR:** `branch-name` → dev (or PR #N)
**Migrations added:** (list new migration numbers and table names)

**What we did:**
- bullet: server changes (new routes, altered endpoints)
- bullet: client changes (new pages, components, hooks)
- bullet: DB changes (new tables, altered columns)
- bullet: bug fixes

**Known issues / left to do:**
- anything not finished or deferred
```
