# Session Log

Newest session at the top. One entry per working session.

---

## 2026-06-18 — UI Refactor + Code Cleanup

**Branch/PR:** `ui-refactor` → dev (PR open), `code-cleanup` (in progress)

**What we did:**
- Full UI token cleanup: replaced all hardcoded `indigo-*` with `primary` token across 57 files
- Radius cleanup: `rounded-2xl`/`rounded-3xl` → `rounded-lg` everywhere
- Typography: snapped arbitrary `text-[15px]`/`[17px]`/`[18px]`/`[20px]` to Tailwind scale
- Role badges: converted from solid fill → subtle outline-only style (Org Admin/Manager/Employee)
- AppLayout sidebar active state: removed `bg-primary/10` block, now `text-primary` only (Linear-style)
- StatusBadge: `signed_off` changed from primary → emerald (semantic: completed = green)
- Hover states fixed: `hover:bg-indigo-700` had become `hover:bg-primary` (no darkening) → `hover:bg-primary/90`
- Code cleanup: removed unused imports across server (index.ts, 5 route files, email.ts) and client (Dashboard, ReviewQueueTab, CreateHomeWizard, useMedicationAdmin)
- CLAUDE.md updated: added design token notes, org admin nav, scheduling module, seed credentials

**Design system now fully applied. Next session starts clean.**

---

## 2026-06-14 — Proto 4 Merged + Scheduling Module

**Branch/PR:** `scheduling` → dev (PR #13 merged), `proto4` → dev (PR #12 merged)

**What we built:**
- Org Admin Dashboard (`/dashboard`): stat bar (homes/residents/staff/open incidents), needs-attention alerts, home cards
- Homes management (`/homes`, `/homes/:id`): list + Create Home wizard (5-step) + Home Detail with 4 tabs (Residents, Staff, Schedule, Settings)
- Org Logs (`/org-logs`): 4 tabs — Incidents, IPOS, Audit, Exports
- Staff Invite Wizard, Staff Profile Sheet (change role, remove from home, deactivate)
- Settings revamp: collapsible grouped sections, role-aware (My Account · My Schedule · Organization · Staff · Preferences · Legal)
- Employee Scheduling: `shift_slots` + `shift_requests` DB tables (migrations 047–048), 8 server routes, ScheduleTab weekly grid (Mon–Sun, Day/Evening/Night rows), My Schedule page
- Separate nav per role in AppLayout (org_admin vs staff)
- Edit Profile Sheet, Change Password Sheet

**Known gaps:**
- Org Settings row in Settings → no edit functionality wired (no PATCH /orgs route)
- Home filter in OrgLogs Audit/IPOS tabs doesn't actually filter (prop unused)
- Live clock-in dot on ScheduleTab is a commented-out placeholder

---

## 2026-06-08 — UI Direction Locked + Proto 4 Queued

**Branch:** `proto4` (created, clean, off dev)

**What we decided:**
- Current UI is too "kidish" — heavy indigo/violet, over-rounded corners, consumer-app feel
- Agreed direction: **Linear layout + Stripe color discipline + GitHub functionality + IBM Carbon structure**
- Chose **Option A** — set design tokens NOW before building Proto 4, so new pages come out right

**Design language locked in:**
| Element | Current | Target |
|---|---|---|
| Radius | `rounded-2xl` everywhere (16px) | `rounded-md` default (6px), `rounded-lg` for cards (8px) max |
| Primary color | Indigo/violet overused | One muted professional blue, CTAs and active state only |
| Dark mode bg | zinc-900 | zinc-950 — true near-black |
| Nav active state | Big indigo block | Subtle tint, compact Linear-style |
| Status colors | Decorative | Semantic only — green/amber/red earn their color |
| Typography | Arbitrary sizes everywhere | 3 weights max, Geist Variable (already installed) |

**Files read, ready to edit next session:**
- `client/src/index.css` — `--radius` is 0.75rem (12px) → needs 0.375rem (6px). Token change propagates to ALL shadcn components automatically.
- `client/tailwind.config.ts` — border radius tied to CSS var, clean.
- `client/src/components/AppLayout.tsx` — sidebar nav needs Linear-style redesign (compact, subtle active, no indigo blocks)

**Next session — do this first, then Proto 4:**
1. Update `client/src/index.css` — new color tokens (muted blue primary, darker dark mode surfaces), tighten `--radius`
2. Update `client/src/components/AppLayout.tsx` — redesign sidebar nav
3. Those two changes propagate everywhere. Old pages still have hardcoded arbitrary values — clean those in a dedicated design sprint later.
4. Then kick off Proto 4 Batch A: bug fixes (A1) + backend routes (A2) in parallel worktrees

**Proto 4 full plan:** memory file `project_proto4_plan.md`
**Scheduling module:** deferred — migrations 046–052 were deleted (never run against DB). Come back after Proto 4.

---

## 2026-06-08 — Session Notes Setup

**What we did:**
- Created this `notes/` folder
- Built `SNAPSHOT.md` — a full inventory of every route, migration, page, context, and hook in the codebase as of migrations 001–045
- Deleted orphaned migration files 046–052 (never run, never committed)
- Decided: Proto 4 first, scheduling later

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
