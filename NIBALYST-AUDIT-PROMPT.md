# Comprehensive Codebase Audit Prompt for Nibalyst

## Context

You are auditing a **Group Home Management System** - a healthcare application for managing residential care facilities. The tech stack is:

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend:** Node.js + Express + TypeScript
- **Database:** MySQL with Knex.js migrations
- **Location:** `/Users/goat/Documents/github/group_home/`
  - Frontend: `client/src/` (90+ React/TypeScript files)
  - Backend: `server/` (30+ route files, middleware, migrations)
  - Database: `server/migrations/` (45 migration files)

This is a **healthcare application** that manages:
- Resident information (PHI/PII data)
- Medication administration and tracking
- Incident reporting
- Vital signs monitoring
- IPOS (Individual Plan of Service) logs
- Staff shift notes and scheduling

**Compliance Requirements:** HIPAA, ADA/Section 508, WCAG 2.1 Level AA

---

## Your Task

Conduct a **comprehensive full-stack audit** across 6 dimensions:

1. **Backend Security & Code Quality**
2. **Database Schema & Performance**
3. **Frontend UI Quality**
4. **UX Quality & Accessibility**
5. **Design Polish & Consistency**
6. **Healthcare-Specific Safety**

For each dimension, identify issues with:
- **Severity:** Critical (P0 blocker), Warning (P1-P2), Info (P3)
- **File paths and line numbers**
- **Specific code examples**
- **Recommended fixes with code**
- **Effort estimates**

---

## Audit Dimension 1: Backend Security & Code Quality

### Methodology
Use OWASP Top 10, CWE Top 25, and Node.js security best practices.

### Areas to Check

**Security Vulnerabilities:**
1. **CSRF Protection**
   - Check: Do all POST/PUT/DELETE routes have CSRF tokens?
   - Look in: `server/routes/*.ts`, `server/middleware/*.ts`
   - Known issue: NO CSRF protection found on any routes (30 files affected)

2. **SQL Injection**
   - Check: Are all queries parameterized? Any string concatenation in SQL?
   - Look for: `knex.raw()`, template literals in queries, dynamic ORDER BY
   - Known issue: Dynamic query construction in 12 files (e.g., search filters, sorting)

3. **Authorization & Authentication**
   - Check: Is RBAC middleware applied correctly? Any null check gaps?
   - Look in: `server/middleware/rbac.ts`, `server/middleware/session.ts`
   - Known issue: Authorization bypass possible if user role is null/undefined

4. **Rate Limiting**
   - Check: Are auth endpoints rate-limited?
   - Look in: `server/routes/auth.ts`, `server/routes/register.ts`
   - Known issue: ✅ FIXED (login, forgot-password, register now protected)

5. **Input Validation**
   - Check: Is user input sanitized? XSS prevention?
   - Look for: Missing validation on email, phone, text fields

6. **Error Handling**
   - Check: Do errors leak sensitive info in production?
   - Known issue: ✅ FIXED (global error handler added)

7. **Secret Management**
   - Check: Are secrets in .env? Any hardcoded credentials?
   - Known issue: Admin credentials in .env (not production-safe)

8. **Session Security**
   - Check: Are sessions configured securely? HttpOnly, Secure, SameSite?
   - Look in: `server/middleware/session.ts`

**Code Quality Issues:**
1. **Error Handling:** Empty catch blocks, unhandled promise rejections
2. **Code Duplication:** Repeated validation logic across routes
3. **Magic Numbers:** Hardcoded values without constants
4. **Type Safety:** Missing TypeScript strict null checks
5. **Async/Await:** Missing await keywords, race conditions

**Performance Issues:**
1. **N+1 Queries:** Loops with database calls inside
2. **Missing Caching:** Session updates on every request
3. **Unbounded Pagination:** Endpoints without max limit (DoS risk)

### Files to Review
```
server/routes/auth.ts
server/routes/register.ts
server/routes/residents.ts
server/routes/medications.ts
server/routes/incidents.ts
server/routes/iposLogs.ts
server/routes/logs.ts
server/routes/vitalsLogs.ts
server/routes/appointments.ts
server/routes/tasks.ts
server/routes/shiftNotes.ts
server/routes/homes.ts
server/routes/users.ts
server/routes/contacts.ts
server/routes/goals.ts
server/routes/vitalsConfig.ts
server/routes/announcements.ts
server/routes/dayProgramLogs.ts
server/routes/iposEntries.ts
server/routes/exports.ts
server/routes/audit.ts
server/routes/orgs.ts
server/routes/organizations.ts
server/routes/admin/*.ts
server/middleware/session.ts
server/middleware/rbac.ts
server/middleware/adminAuth.ts
server/index.ts
```

### Expected Output Format

```markdown
## Backend Security & Code Quality Review

### Critical Issues (P0)

#### Issue #1: Missing CSRF Protection
**Severity:** Critical
**Impact:** All state-changing operations vulnerable to CSRF attacks
**Files Affected:** 30 route files

**Example:**
```typescript
// File: server/routes/residents.ts:45
router.post('/', async (req, res) => {
  // No CSRF token validation
  const resident = await knex('residents').insert(req.body);
});
```

**Recommended Fix:**
```typescript
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

router.post('/', csrfProtection, async (req, res) => {
  const resident = await knex('residents').insert(req.body);
});
```

**Effort:** 8-12 hours
**Priority:** P0 (blocker)

[Continue for all issues...]
```

---

## Audit Dimension 2: Database Schema & Performance

### Methodology
Use database design best practices, PostgreSQL/MySQL optimization guides, and HIPAA data protection standards.

### Areas to Check

**Schema Design Issues:**
1. **Foreign Key Constraints**
   - Check: Do all foreign keys have ON DELETE/ON UPDATE behavior?
   - Known issue: ALL 25+ tables missing ON DELETE CASCADE/RESTRICT
   - Impact: Orphaned records, data inconsistency

2. **Indexes**
   - Check: Are frequently queried columns indexed?
   - Look for: Missing indexes on `org_id`, `home_id`, `resident_id`, `user_id`, datetime columns
   - Known issue: 16+ tables missing critical indexes despite migration 032

3. **Data Types**
   - Check: Are data types appropriate? (e.g., storing dates as strings?)
   - Check: Are ENUM types used where appropriate?

4. **NOT NULL Constraints**
   - Check: Are required fields marked NOT NULL?
   - Look for: Optional fields that should be required

5. **UNIQUE Constraints**
   - Check: Are unique fields properly constrained?
   - Look for: email, username, etc.

6. **CHECK Constraints**
   - Check: Are value ranges validated in DB?
   - Known issue: No CHECK constraints on dates, ranges, conditionals
   - Examples: Future DOB, negative sleep hours, discharge_date without discharged_by

**Security Issues:**
1. **PHI/PII Encryption**
   - Check: Are sensitive fields encrypted at rest?
   - Known issue: NO encryption on diagnosis, notes, medications, contact info, vitals
   - Impact: HIPAA violation (12+ tables affected)

2. **Audit Trail**
   - Check: Are data changes tracked?
   - Known issue: audit_logs table exists but doesn't store old/new values

**Performance Issues:**
1. **Missing Indexes**
   - Impact: 10-100x slower queries
   - Before: 500ms → After: 50ms (with indexes)

2. **Full Table Scans**
   - Check: Are queries using indexes? (EXPLAIN ANALYZE)

3. **Text Search**
   - Check: Are text searches using full-text indexes or LIKE?
   - Known issue: No full-text indexes on names/notes fields

4. **Query Optimization**
   - Check: Any subqueries that could be joins?
   - Check: Any SELECT * queries?

**Data Integrity:**
1. **Cascade Behavior**
   - What happens when you delete a resident? Home? Organization?
   - Known issue: Cannot safely delete anything (FK violations)

2. **Orphaned Records**
   - Check: Are there orphaned records in child tables?

3. **Default Values**
   - Check: Are sensible defaults set?

### Files to Review
All 45 migration files in `server/migrations/`:
```
001_create_organizations.ts
002_create_users.ts
003_create_homes.ts
004_create_home_staff.ts
005_create_residents.ts
006_create_tracked_behaviors.ts
007_create_resident_contacts.ts
008_create_medication_logs.ts
009_create_ipos_logs.ts
010_create_behavioral_logs.ts
011_create_resident_medication_plan.ts
012_create_shift_notes.ts
013_create_announcements.ts
014_create_appointments.ts
015_create_tasks.ts
016_create_shift_roster.ts
017_create_admin_users.ts
018_alter_appointments.ts
019_alter_medication_logs.ts
020_create_incidents.ts
021_alter_medication_plan.ts
022_alter_incidents.ts
023_alter_users_session_cols.ts
024_create_invitations.ts
025_create_password_resets.ts
026_add_facility_type_to_orgs.ts
027_alter_orgs_add_state.ts
028_create_org_requests.ts
029_create_audit_logs.ts
030_add_cascade_to_resident_contacts.ts
031_alter_org_requests.ts
032_add_indexes.ts
033_alter_medication_plan_add_end_date.ts
034_create_ipos_entries.ts
035_alter_homes_phase1.ts
036_alter_medication_plan_add_discontinued.ts
037_create_resident_goals.ts
038_create_resident_vitals_config.ts
039_alter_ipos_logs_phase2.ts
040_create_resident_vitals_logs.ts
041_create_ipos_review_comments.ts
042_alter_residents_add_ipos_dates.ts
043_create_day_program_logs.ts
044_alter_incidents_add_details.ts
045_add_scheduled_date_to_med_logs.ts
```

### Expected Output Format

```markdown
## Database Schema & Performance Audit

### Critical Issues (P0)

#### Issue #1: Missing ON DELETE CASCADE/RESTRICT Behavior
**Severity:** Critical
**Impact:** Cannot safely delete residents, homes, or organizations without FK violations
**Tables Affected:** All 25+ tables with foreign keys

**Example:**
```sql
-- Current (from migration 005):
CREATE TABLE residents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  home_id INT,
  FOREIGN KEY (home_id) REFERENCES homes(id)
  -- Missing: ON DELETE CASCADE or RESTRICT
);
```

**Recommended Fix (Migration 046):**
```sql
-- Add cascade behavior
ALTER TABLE residents
DROP FOREIGN KEY residents_home_id_foreign,
ADD CONSTRAINT residents_home_id_foreign
  FOREIGN KEY (home_id) REFERENCES homes(id)
  ON DELETE RESTRICT;

-- Rationale: RESTRICT prevents deleting homes with active residents
-- Use CASCADE only for dependent data (contacts, logs, etc.)
```

**Effort:** 4-6 hours
**Priority:** P0 (data integrity)

[Continue for all issues...]
```

---

## Audit Dimension 3: Frontend UI Quality (6-Pillar Assessment)

### Methodology
Use the 6-pillar UI assessment framework:
1. Visual Hierarchy & Layout
2. Typography & Readability
3. Color & Contrast
4. Spacing & Rhythm
5. Responsiveness & Adaptivity
6. Interaction & Feedback

Grade each pillar 1-4 (1=poor, 4=excellent), then provide overall score out of 24.

### Areas to Check

**Visual Hierarchy & Layout:**
- Are CTAs prominent?
- Is there clear visual weight?
- Are related items grouped?
- Is the page scannable?

**Typography & Readability:**
- Known issue: 582 unique font sizes (should be 6-8 semantic sizes)
- Check for: `text-[*px]` arbitrary values
- Are line heights appropriate?
- Is text readable on mobile?

**Color & Contrast:**
- Known issue: 371 primary color usages (accent overuse)
- WCAG contrast ratios (4.5:1 text, 3:1 UI)
- Dark mode quality
- Semantic color usage

**Spacing & Rhythm:**
- Known issue: 945 spacing instances with arbitrary values
- Check for: `min-h-[*px]`, `p-[*px]` instead of Tailwind scale
- Is there a consistent spacing scale (4px grid)?
- Vertical rhythm

**Responsiveness & Adaptivity:**
- Mobile-first design?
- Breakpoint usage (sm, md, lg, xl)
- Touch target sizes (minimum 44x44px)
- Known issue: 17 files with touch targets below 44px

**Interaction & Feedback:**
- Loading states
- Error states
- Empty states
- Hover/focus states
- Animations and transitions

### Files to Review
All 90+ TypeScript/TSX files in `client/src/`:
```
App.tsx
main.tsx
pages/*.tsx (Dashboard, Residents, Login, etc.)
components/*.tsx
components/ui/*.tsx (shadcn/ui components)
context/*.tsx (AuthContext, HomeContext)
types/*.ts
utils/*.ts
index.css
tailwind.config.ts
```

### Expected Output Format

```markdown
## Frontend UI Quality Assessment

### Overall Score: 16/24 (67%)

| Pillar | Score | Grade |
|--------|-------|-------|
| Visual Hierarchy & Layout | 3/4 | Good |
| Typography & Readability | 2/4 | Needs Work |
| Color & Contrast | 3/4 | Good |
| Spacing & Rhythm | 2/4 | Needs Work |
| Responsiveness & Adaptivity | 3/4 | Good |
| Interaction & Feedback | 3/4 | Good |

### Critical Issues

#### Issue #1: Typography Inconsistency
**Pillar:** Typography & Readability
**Severity:** Warning (P1)
**Impact:** Design feels inconsistent, harder to maintain

**Evidence:**
- 582 unique font size classes detected
- Arbitrary values: `text-[17px]`, `text-[11px]`, `text-[8px]`, `text-[10px]`
- No semantic typography scale

**Files Affected (75+):**
```
client/src/pages/Dashboard.tsx (18 unique sizes)
client/src/pages/Residents.tsx (23 unique sizes)
client/src/components/MedicationPlan.tsx (15 unique sizes)
[...and 72 more]
```

**Recommended Fix:**
```typescript
// tailwind.config.ts - Define semantic scale
module.exports = {
  theme: {
    fontSize: {
      'xs': '0.75rem',    // 12px - captions, labels
      'sm': '0.875rem',   // 14px - body small
      'base': '1rem',     // 16px - body text
      'lg': '1.125rem',   // 18px - emphasized
      'xl': '1.25rem',    // 20px - subheadings
      '2xl': '1.5rem',    // 24px - headings
      '3xl': '1.875rem',  // 30px - page titles
      '4xl': '2.25rem',   // 36px - hero text
    }
  }
};

// Replace all arbitrary values:
// ❌ <p className="text-[17px]">
// ✅ <p className="text-lg">
```

**Effort:** 12-16 hours
**Priority:** P1 (before 1.0 launch)

[Continue for all pillars...]
```

---

## Audit Dimension 4: UX Quality & Accessibility

### Methodology
Use the Intent UX framework with:
1. **Dark Pattern Detection** (72+ patterns catalog)
2. **WCAG 2.1 Level AA Compliance**
3. **Edge Case Handling**
4. **User Autonomy Assessment**
5. **Healthcare-Specific UX**

### Areas to Check

**Dark Pattern Detection:**
Check against 72+ deceptive/manipulative patterns:
- **Deceptive:** Hidden costs, bait-and-switch, trick questions, misdirection
- **Addictive:** Infinite scroll, variable rewards, social pressure, FOMO
- **Manipulative:** Nagging, obstruction, forced action, confirmshaming

Known finding: **0 dark patterns detected** (excellent!)

**WCAG 2.1 Level AA Compliance:**
1. **Perceivable:**
   - Alt text on images
   - Color contrast (4.5:1 text, 3:1 UI)
   - Text resize support
   - Known issue: 12 contrast violations

2. **Operable:**
   - Keyboard navigation
   - Focus indicators
   - No keyboard traps
   - Touch target sizes (44x44px minimum)
   - Known issue: Missing keyboard nav on 15+ components

3. **Understandable:**
   - Error messages
   - Form labels and instructions
   - Consistent navigation
   - Known issue: Generic error messages

4. **Robust:**
   - ARIA labels
   - Semantic HTML
   - Screen reader support
   - Known issue: Missing ARIA labels on 12 files

**Edge Case Handling:**
- Empty states (no data)
- Error states (API failures)
- Loading states (async operations)
- Permission denied states
- Network offline states

Known finding: **Good coverage** (424 state patterns found)

**User Autonomy:**
- Can users undo actions?
- Are destructive actions confirmed?
- Can users export their data?
- Can users opt-out?

**Healthcare-Specific UX:**
1. **Medication Safety:**
   - Known issue: No allergy warnings during administration
   - Known issue: Timezone bugs in scheduling
   - Known issue: No barcode verification

2. **PHI Protection:**
   - Is sensitive data hidden/masked appropriately?
   - Are permissions enforced in UI?

3. **Incident Reporting:**
   - Is reporting flow clear?
   - Are required fields obvious?

4. **Vital Signs:**
   - Are critical values highlighted?
   - Are trends visualized?

### Files to Review
Same as UI Quality audit + focus on:
```
client/src/pages/MedicationPlan.tsx
client/src/pages/IncidentForm.tsx
client/src/pages/VitalsLog.tsx
client/src/pages/ResidentProfile.tsx
client/src/components/ErrorBoundary.tsx
client/src/utils/offlineQueue.ts
```

### Expected Output Format

```markdown
## UX Quality & Accessibility Audit

### Summary
- **Dark Patterns:** 0 detected ✅
- **WCAG Violations:** 8 Critical, 10 Warning
- **Healthcare Safety:** 3 Critical issues
- **Edge Case Coverage:** Good (424 patterns)

### Critical Issues

#### Issue #1: Missing Keyboard Navigation
**Category:** WCAG 2.1 - Operable (Level A violation)
**Severity:** Critical (P0)
**Impact:** Users cannot navigate without mouse, ADA non-compliance

**Components Affected (15):**
```
client/src/components/ui/dropdown-menu.tsx
client/src/components/ui/dialog.tsx
client/src/components/ui/select.tsx
client/src/pages/Dashboard.tsx (custom tabs)
client/src/pages/MedicationPlan.tsx (time slot buttons)
[...and 10 more]
```

**Example:**
```typescript
// File: client/src/pages/MedicationPlan.tsx:234
<button
  onClick={() => administerMed(slot)}
  className="bg-primary text-white"
>
  {/* Missing: onKeyDown handler, tabIndex, role */}
  Administer
</button>
```

**Recommended Fix:**
```typescript
<button
  onClick={() => administerMed(slot)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      administerMed(slot);
    }
  }}
  tabIndex={0}
  role="button"
  aria-label={`Administer ${med.name} at ${slot.time}`}
  className="bg-primary text-white"
>
  Administer
</button>
```

**Testing:**
- Tab through entire medication administration flow
- Verify all actions accessible via keyboard
- Test with screen reader (NVDA, JAWS)

**Effort:** 8-12 hours
**Priority:** P0 (legal compliance)

#### Issue #2: No Allergy Warnings During Medication Administration
**Category:** Healthcare Safety
**Severity:** Critical (P0)
**Impact:** Risk of administering medication to allergic resident

**File:** `client/src/pages/MedicationPlan.tsx`
**Missing:** Cross-reference with resident allergies before administration

**Current Flow:**
1. User clicks "Administer" on medication
2. Confirmation dialog appears
3. Medication logged (no allergy check)

**Recommended Flow:**
```typescript
const administerMed = async (slot: MedicationSlot) => {
  // 1. Check for allergies
  const resident = await fetchResident(slot.resident_id);
  const allergies = resident.allergies || [];

  const allergyMatch = allergies.find(allergy =>
    slot.medication.toLowerCase().includes(allergy.toLowerCase())
  );

  if (allergyMatch) {
    // Show critical warning
    setAllergyWarning({
      medication: slot.medication,
      allergy: allergyMatch,
      resident: resident.name,
    });
    return; // Block administration
  }

  // 2. Proceed with administration
  confirmAdministration(slot);
};

// Add warning UI
{allergyWarning && (
  <div className="bg-red-100 border-2 border-red-600 p-4 rounded-lg">
    <h3 className="text-red-900 font-bold text-xl">
      ⚠️ ALLERGY WARNING
    </h3>
    <p className="text-red-800 mt-2">
      {allergyWarning.resident} is allergic to {allergyWarning.allergy}.
      Cannot administer {allergyWarning.medication}.
    </p>
    <button
      onClick={() => setAllergyWarning(null)}
      className="mt-4 bg-red-600 text-white px-4 py-2"
    >
      Acknowledged
    </button>
  </div>
)}
```

**Effort:** 4-6 hours
**Priority:** P0 (patient safety)

[Continue for all issues...]
```

---

## Audit Dimension 5: Design Polish & Consistency

### Methodology
Use the Impeccable design framework's 23 commands:
- **DISTILL** - Simplify and consolidate
- **RHYTHM** - Establish spacing patterns
- **BOLDER** - Emphasize important elements
- **QUIETER** - Reduce visual noise
- **RESTRAIN** - Limit color palette usage
- **ANIMATE** - Add purposeful motion
- **BIGGER** - Improve touch targets
- **SIMPLIFY** - Progressive disclosure
- **PROTECT** - Prevent errors

### Areas to Check

**Typography Consolidation (DISTILL):**
- Known issue: 582 unique font sizes → consolidate to 6-8
- Known issue: 817 font class instances across 75 files
- Remove all arbitrary `text-[*px]` values

**Spacing Rhythm (RHYTHM):**
- Known issue: 945 spacing instances without systematic 4px grid
- Arbitrary values: `min-h-[44px]`, `p-[17px]`, `gap-[13px]`
- Enforce Tailwind spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px)

**Visual Hierarchy (BOLDER/QUIETER):**
- Are primary CTAs prominent?
- Is secondary content subdued?
- Known issue: Flat design with equal weight

**Color Restraint (RESTRAIN):**
- Known issue: 885 primary color instances (should be ~400)
- Primary color should be CTAs only
- Use neutral colors for backgrounds

**Animation & Motion (ANIMATE):**
- Known issue: Only 137 transition instances
- Target: 300+ for smooth, polished feel
- Add micro-interactions on hover/click

**Touch Targets (BIGGER):**
- Known issue: 17 files with buttons below 44x44px
- WCAG requirement: minimum 44x44px

**Progressive Disclosure (SIMPLIFY):**
- Are complex forms broken into steps?
- Are advanced options hidden initially?

### Expected Output Format

```markdown
## Design Polish & Consistency Audit

### Overall Assessment
**Score:** 6/10 (Production-ready, not delightful)

### Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Typography sizes | 582 unique | 6-8 semantic | 97% reduction |
| Touch violations | 17 files | 0 files | 100% compliance |
| Color instances | 885 | ~400 | 55% reduction |
| Animations | 137 | 300+ | 119% increase |
| Design score | 6/10 | 9/10 | 50% improvement |

### Recommendations by Impeccable Command

#### DISTILL: Typography Consolidation
**Issue:** 582 unique font sizes creates inconsistency
**Impact:** Design feels amateurish, hard to maintain

**Before:**
```typescript
// 75 files with arbitrary sizes:
<h1 className="text-[28px]">Dashboard</h1>
<p className="text-[17px]">Welcome</p>
<span className="text-[11px]">Updated</span>
```

**After:**
```typescript
// Semantic scale (6-8 sizes):
<h1 className="text-3xl">Dashboard</h1>
<p className="text-lg">Welcome</p>
<span className="text-xs">Updated</span>
```

**Files to update:** 75+ files
**Effort:** 12-16 hours
**Priority:** P1

#### BOLDER: Emphasize Primary CTAs
**Issue:** Primary actions don't stand out

**Before:**
```typescript
// All buttons look the same:
<button className="bg-primary text-white px-4 py-2">
  Save Changes
</button>
<button className="bg-primary text-white px-4 py-2">
  Cancel
</button>
```

**After:**
```typescript
// Primary CTA is bolder:
<button className="bg-primary text-white px-6 py-3 text-lg font-semibold shadow-lg">
  Save Changes
</button>
<button className="bg-gray-200 text-gray-700 px-4 py-2">
  Cancel
</button>
```

**Effort:** 6-8 hours
**Priority:** P2

[Continue for all commands...]
```

---

## Audit Dimension 6: Healthcare-Specific Safety

### Methodology
Check against healthcare software best practices and regulatory requirements.

### Areas to Check

**Medication Administration Safety:**
1. **Allergy Warnings**
   - Known issue: No allergy check before administration
2. **Barcode Verification**
   - Known issue: No barcode scanning (5 Rights of medication administration)
3. **Witness Signatures**
   - Check: Are controlled substances witnessed?
4. **Timezone Handling**
   - Known issue: Timezone bugs (UTC vs local time confusion)
5. **PRN Medications**
   - Check: Are PRN (as-needed) meds tracked separately?

**Incident Reporting:**
1. **Critical Alerts**
   - Are serious incidents flagged immediately?
   - Are managers notified?
2. **Photo Evidence**
   - Can staff attach photos to incident reports?
3. **Witness Statements**
   - Can multiple staff add statements?

**Vital Signs Monitoring:**
1. **Critical Value Alerts**
   - Are abnormal vitals highlighted?
   - Are thresholds configurable per resident?
2. **Trend Visualization**
   - Can staff see vital sign trends over time?
3. **Fall Risk Indicators**
   - Are high-risk residents flagged?

**PHI Protection:**
1. **Access Control**
   - Is PHI masked for unauthorized staff?
2. **Audit Logging**
   - Are PHI views/edits logged?
3. **Session Timeout**
   - Do sessions expire after inactivity?

### Expected Output Format

```markdown
## Healthcare Safety Audit

### Critical Issues

#### Issue #1: No Allergy Warnings
[See UX Audit above]

#### Issue #2: Timezone Bugs in Medication Scheduling
**Severity:** Critical (P0)
**Impact:** Medications could be administered at wrong time

**Current Issue:**
```typescript
// File: client/src/utils/medicationSlot.ts:23
const slotTime = new Date(`2024-01-01 ${slot.time}`);
// Problem: Creates date in local timezone, but server expects UTC
// Result: 8:00 AM becomes 11:00 AM (PST → UTC conversion)
```

**Real-World Scenario:**
- Nurse in California schedules medication for 8:00 AM
- Server stores as UTC (16:00 UTC)
- When retrieved, displays as 8:00 AM UTC → 12:00 AM PST
- Medication administered 16 hours late

**Recommended Fix:**
```typescript
// Store all times in UTC, display in facility timezone
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Saving to server:
const facilityTimezone = 'America/Los_Angeles';
const localTime = new Date(`2024-01-01 ${slot.time}`);
const utcTime = zonedTimeToUtc(localTime, facilityTimezone);
await saveMedSchedule({ time: utcTime.toISOString() });

// Displaying to user:
const utcTime = new Date(schedule.time);
const localTime = utcToZonedTime(utcTime, facilityTimezone);
const displayTime = format(localTime, 'h:mm a');
```

**Testing:**
- Test across timezones (PST, EST, UTC)
- Test during daylight saving time changes
- Verify 24-hour periods don't shift

**Effort:** 8-12 hours
**Priority:** P0 (patient safety)

[Continue for all issues...]
```

---

## Output Format

Create 6 separate markdown files:

1. **BACKEND-SECURITY-REVIEW.md** - Backend security and code quality
2. **DATABASE-AUDIT.md** - Database schema and performance
3. **FRONTEND-UI-REVIEW.md** - UI quality 6-pillar assessment
4. **UX-ACCESSIBILITY-AUDIT.md** - UX quality and WCAG compliance
5. **DESIGN-POLISH-AUDIT.md** - Design consistency using Impeccable framework
6. **HEALTHCARE-SAFETY-AUDIT.md** - Healthcare-specific safety issues

Then create:

7. **COMPREHENSIVE-AUDIT-SUMMARY.md** - Executive summary consolidating all findings

---

## Key Findings Reference (from Claude Code audit)

Use these as cross-validation for your own findings:

### Backend Security (35 issues found)
- **Critical (9):** CSRF missing, SQL injection risks, auth bypass, race conditions
- **Warning (18):** Performance issues, missing transactions, unsafe comparisons
- **Info (8):** Magic numbers, code duplication, empty catch blocks

### Database (80 issues found)
- **Critical (37):** Missing cascades (25+ tables), missing indexes (16+ tables), no PHI encryption (12+ tables)
- **Warning (28):** Missing CHECK constraints, incomplete audit trail
- **Info (15):** Migration quality, default values

### Frontend UI (scored 16/24)
- Typography: 2/4 (582 unique sizes)
- Spacing: 2/4 (945 arbitrary values)
- Visual Hierarchy: 3/4
- Color: 3/4 (371 primary overuses)
- Responsiveness: 3/4
- Interaction: 3/4

### UX & Accessibility (38 issues found)
- **Dark Patterns:** 0 detected ✅
- **WCAG Critical (8):** Keyboard nav, ARIA labels, contrast, screen reader
- **Healthcare Safety Critical (3):** Allergy warnings, timezone bugs, barcode verification

### Design Polish (Score: 6/10)
- 817 typography instances to consolidate
- 17 files with touch target violations
- 137 animations (needs 300+)
- 885 color instances (needs 55% reduction)

---

## Effort Estimates

Provide effort estimates in this format:

```markdown
## Estimated Effort Summary

| Phase | Issues | Hours | Weeks (40hr) | Priority |
|-------|--------|-------|--------------|----------|
| Phase 1: Critical Fixes | Security, DB, A11y, Safety | 220-300 | 6-8 | P0 BLOCKER |
| Phase 2: High Priority | Design system, Testing | 160-190 | 5-7 | P1 |
| Phase 3: Medium Priority | Performance, Production | 120-160 | 4-6 | P2 |
| Phase 4: Polish | Design delight | 60-80 | 2-3 | P3 |
| **TOTAL** | - | **560-730** | **17-24** | - |
```

---

## Compliance Checklists

Include these checklists with ✅/❌ status:

### HIPAA Compliance
- ❌ PHI encryption at rest (database)
- ✅ PHI encryption in transit (HTTPS)
- ❌ Complete audit trail with old/new values
- ❌ Access control audit
- ❌ Data backup/disaster recovery plan
- ❌ Business Associate Agreements (BAA)

### ADA/Section 508 Compliance
- ❌ WCAG 2.1 Level AA conformance
- ❌ Keyboard navigation
- ❌ Screen reader support
- ❌ Color contrast requirements
- ❌ Touch target sizes (44x44px minimum)

### Security Best Practices
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting (critical endpoints)
- ✅ Environment variable validation
- ✅ Global error handler
- ❌ CSRF protection
- ❌ SQL injection prevention
- ❌ Admin 2FA
- ❌ Secrets management

---

## Example Evidence Format

For each issue, provide concrete evidence:

```markdown
**Evidence:**
```bash
# Count of arbitrary font sizes
$ grep -r "text-\[" client/src --include="*.tsx" | wc -l
817

# Files with touch target violations
$ grep -r "min-h-\[.*px\]" client/src --include="*.tsx" | grep -E "min-h-\[(1|2|3)[0-9]px\]"
[17 files found]

# Primary color overuse
$ grep -r "bg-primary" client/src --include="*.tsx" | wc -l
371
```
```

---

## Final Deliverable Structure

```
/Users/goat/Documents/github/group_home/
├── BACKEND-SECURITY-REVIEW.md (30-40KB)
├── DATABASE-AUDIT.md (60-70KB)
├── FRONTEND-UI-REVIEW.md (25-35KB)
├── UX-ACCESSIBILITY-AUDIT.md (50-60KB)
├── DESIGN-POLISH-AUDIT.md (35-45KB)
├── HEALTHCARE-SAFETY-AUDIT.md (20-30KB)
└── COMPREHENSIVE-AUDIT-SUMMARY.md (12-15KB)
```

Each file should be:
- **Actionable:** Specific file paths, line numbers, code examples
- **Prioritized:** Clear severity classification (P0, P1, P2, P3)
- **Estimated:** Effort estimates in hours
- **Verified:** Evidence-based findings with grep counts, examples
- **Fixable:** Concrete recommended fixes with code samples

---

## Begin Audit

Start your comprehensive audit now, following all 6 dimensions above. Cross-reference findings with the known issues listed to validate accuracy.
