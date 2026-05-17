# Technical Concerns & Debt

*Last mapped: 2026-05-17*

## Critical Issues

### 1. No Automated Testing ⚠️ HIGH PRIORITY
**Impact:** Production bugs, regression risk, refactoring fear

- Zero test coverage across frontend and backend
- No test framework installed (Jest, Vitest, etc.)
- No CI/CD pipeline to catch errors before deployment
- Manual testing only — error-prone and time-consuming

**Recommended action:**
- Install Vitest for both client and server
- Start with auth and RBAC tests (highest risk areas)
- Add CI/CD (GitHub Actions) to run tests on every PR
- Target 60%+ coverage within 2-3 weeks

**Files affected:** All application code (no test files exist)

---

### 2. No Deployment Configuration ⚠️ HIGH PRIORITY
**Impact:** Manual deployment risk, inconsistent environments

- Development-only setup (XAMPP, localhost)
- No production database configuration
- No environment-specific configs (staging, production)
- No deployment scripts or CI/CD
- No health check endpoints for monitoring

**Recommended action:**
- Create `.env.production` template
- Add health check endpoint (`GET /health`)
- Document deployment process (EC2, Heroku, Fly.io, etc.)
- Set up GitHub Actions for automated deployments

**Files affected:** `server/index.ts`, `knexfile.ts`

---

### 3. SQL Injection Risk (Partial) ⚠️ MEDIUM PRIORITY
**Impact:** Security vulnerability if queries are not parameterized

**Current state:** Most queries use parameterization (`?` placeholders), but needs audit

**Good example:**
```typescript
const [rows] = await fastify.db.query(
  'SELECT * FROM residents WHERE org_id = ? AND home_id = ?',
  [orgId, homeId]
);
```

**Needs verification:**
- All 24 route files should be audited for raw SQL
- Dynamic ORDER BY clauses (e.g., sort parameter from user input)
- String concatenation in queries

**Recommended action:**
- Audit all `fastify.db.query()` calls for parameterization
- Consider query builder (Knex.js) instead of raw SQL
- Add SQL linting (sqlfluff or similar)

**Files affected:** All `server/routes/*.ts` files

---

### 4. No TypeScript Path Mapping (Backend) ⚙️ LOW PRIORITY
**Impact:** Messy imports, harder to refactor

**Current:** Backend uses relative imports:
```typescript
import { sessionMiddleware } from '../../../middleware/session';
import { success, failure } from '../../../utils/response';
```

**Recommended:** TypeScript path aliases (like frontend `@/*`):
```typescript
import { sessionMiddleware } from '@/middleware/session';
import { success, failure } from '@/utils/response';
```

**Action:** Update `server/tsconfig.json` with `paths` configuration

---

### 5. No Error Tracking ⚙️ MEDIUM PRIORITY
**Impact:** Production bugs go unnoticed until users report

- No Sentry, Rollbar, or similar error tracking
- Frontend errors logged to console only
- Backend errors logged to stdout (JSON format)
- No centralized logging (Datadog, LogRocket, etc.)

**Recommended action:**
- Add Sentry for both frontend and backend
- Set up error alerts (email, Slack)
- Track user context with errors (user ID, org ID, home ID)

**Files affected:** `client/src/main.tsx`, `server/index.ts`

---

## Security Concerns

### 1. JWT Secret Strength ✓ SECURE
**Status:** Good — `.env.example` requires 32+ character secrets

```bash
JWT_SECRET=replace_this_with_a_32_character_random_string
COOKIE_SECRET=replace_this_with_a_32_character_random_string
```

**No issue found** — Template enforces strong secrets

---

### 2. Rate Limiting (Partial Implementation) ⚠️ MEDIUM PRIORITY
**Impact:** Brute-force attacks on login, account enumeration

**Current:** `@fastify/rate-limit` installed but not globally enforced

```typescript
// server/index.ts
fastify.register(rateLimit, { global: false });
```

Routes must opt-in. **Needs verification:**
- Which routes have rate limiting enabled?
- Are auth endpoints protected (`/auth/login`, `/auth/forgot-password`)?

**Recommended action:**
- Audit all route files for `config.rateLimit`
- Apply to sensitive endpoints:
  - `POST /auth/login` — 5 attempts per minute
  - `POST /auth/forgot-password` — 3 attempts per minute
  - `POST /register/org` — 3 attempts per hour

**Files affected:** `server/routes/auth.ts`, `server/routes/register.ts`

---

### 3. CORS Configuration ✓ SECURE
**Status:** Good — Origin whitelist enforced

```typescript
// server/plugins/cors.ts
origin: process.env.FRONTEND_URL || 'http://localhost:5173'
credentials: true
```

**No issue found** — Properly configured for multi-tenant SaaS

---

### 4. Password Reset Token Expiry ⚠️ NEEDS VERIFICATION
**Impact:** Old reset links could be reused indefinitely

**Recommended:** Check `password_resets` table for TTL:
- Tokens should expire after 1 hour
- Tokens should be single-use (deleted after reset)
- Old tokens should be pruned from database

**Files affected:** `server/routes/auth.ts`, `server/migrations/*password_resets*.ts`

---

### 5. Admin Panel Security ⚠️ HIGH PRIORITY
**Impact:** Platform-wide access if admin credentials compromised

**Current:** Separate admin auth with different JWT secret

**Concerns:**
- Admin credentials stored in `.env` (not secure for production)
- No 2FA for admin accounts
- No IP whitelisting for admin panel
- Admin panel accessible on same server (no separate subdomain)

**Recommended action:**
- Move admin credentials to secure vault (AWS Secrets Manager, etc.)
- Implement 2FA for admin login (TOTP via `speakeasy` npm package)
- Add IP whitelist for admin routes (`/admin/*`)
- Consider separate admin subdomain (`admin.grouphome.com`)

**Files affected:** `server/routes/admin/*.ts`, `server/middleware/adminAuth.ts`

---

## Performance Concerns

### 1. No Database Indexes (Needs Verification) ⚠️ MEDIUM PRIORITY
**Impact:** Slow queries as data grows

**Current:** 41+ migrations created tables, but index strategy unclear

**Needs audit:**
- Are foreign keys indexed? (`org_id`, `home_id`, `resident_id`)
- Are frequently queried columns indexed? (`email`, `created_at`, `deleted_at`)
- Are composite indexes used for multi-column queries?

**Recommended action:**
- Read all migration files to identify existing indexes
- Add indexes for high-traffic queries:
  ```sql
  CREATE INDEX idx_residents_org_home ON residents(org_id, home_id);
  CREATE INDEX idx_medication_logs_resident ON medication_logs(resident_id, administered_at);
  CREATE INDEX idx_users_email ON users(email);
  ```

**Files affected:** `server/migrations/*.ts`

---

### 2. N+1 Query Problem (Potential) ⚠️ MEDIUM PRIORITY
**Impact:** Excessive database queries, slow API responses

**Example scenario:**
```typescript
// Route: GET /residents
const residents = await getResidents(orgId);  // 1 query

// Frontend loops over residents to fetch medications
for (const resident of residents) {
  const meds = await getMedications(resident.id);  // N queries
}
```

**Recommended action:**
- Audit API routes for nested loops with queries
- Use JOINs or batch queries instead
- Consider GraphQL or DataLoader pattern for complex data fetching

**Files affected:** `server/routes/residents.ts`, `server/routes/medications.ts`

---

### 3. No Caching Strategy ⚙️ LOW PRIORITY
**Impact:** Repeated database queries for static data

**Current:** No Redis or in-memory cache

**Candidates for caching:**
- Organization settings (`orgs` table)
- Home configurations (`homes` table)
- Tracked behavior definitions (`tracked_behaviors` table)
- User roles (changes infrequently)

**Recommended action:**
- Add Redis for session storage and data caching
- Cache responses with `Cache-Control` headers for frontend
- Implement cache invalidation strategy

**Files affected:** `server/plugins/cache.ts` (new file)

---

### 4. Large MAR Exports (Potential) ⚠️ LOW PRIORITY
**Impact:** PDF generation could timeout for large datasets

**Current:** PDFKit generates MAR reports synchronously

**Concerns:**
- What happens with 1000+ medication logs?
- Is there a pagination limit?
- Does the PDF stream to client or buffer in memory?

**Recommended action:**
- Test with large datasets (1000+ logs)
- Add pagination or date range limits
- Stream PDF instead of buffering entire file

**Files affected:** `server/routes/exports.ts`

---

## Code Quality Concerns

### 1. Inconsistent Code Style ⚙️ LOW PRIORITY
**Impact:** Harder to read, merge conflicts

**Current:**
- No Prettier configured
- Semicolons inconsistent (some files use them, some don't)
- Spacing inconsistent

**Recommended action:**
- Install Prettier
- Add `.prettierrc` with project standards
- Run `prettier --write .` to format all files
- Add pre-commit hook (Husky + lint-staged)

**Files affected:** All `.ts` and `.tsx` files

---

### 2. No Centralized Error Handling ⚙️ MEDIUM PRIORITY
**Impact:** Inconsistent error responses, harder to debug

**Current:** Each route handles errors individually:
```typescript
try {
  // ...
} catch (error) {
  fastify.log.error(error);
  return reply.code(500).send(failure('SERVER_ERROR', 'Internal server error'));
}
```

**Recommended:** Global error handler:
```typescript
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.code(400).send(failure('VALIDATION_ERROR', error.message));
  }

  return reply.code(500).send(failure('SERVER_ERROR', 'Internal server error'));
});
```

**Files affected:** `server/index.ts`

---

### 3. No API Versioning ⚙️ LOW PRIORITY
**Impact:** Breaking changes force all clients to update

**Current:** No version prefix (`/api/v1/residents`)

**Recommended:** Add versioning for future-proofing:
```typescript
// v1 routes
fastify.register(residentsRoutes, { prefix: '/api/v1' });

// v2 routes (future)
fastify.register(residentsRoutesV2, { prefix: '/api/v2' });
```

**Files affected:** `server/index.ts`

---

### 4. TODO in Production Code ⚠️ LOW PRIORITY
**Impact:** Incomplete features may reach production

**Found:**
```typescript
// client/src/pages/Homes/CreateHomeWizard.tsx
// TODO: Assign selected staff to home after creation
```

**Recommended action:**
- Resolve TODOs before merging to main
- Use GitHub Issues for deferred work instead of inline TODOs
- Add ESLint rule to warn on TODO comments

**Files affected:** `client/src/pages/Homes/CreateHomeWizard.tsx`

---

## Data Integrity Concerns

### 1. Soft Deletes Not Atomic ⚠️ LOW PRIORITY
**Impact:** Related records could remain after parent soft-deleted

**Current:** Soft deletes via `UPDATE deleted_at = NOW()`

**Concern:**
- Does deleting a resident soft-delete their medications?
- Does deleting a home soft-delete associated residents?
- Are foreign key cascades configured for soft deletes?

**Recommended action:**
- Audit soft delete logic in all CRUD routes
- Add database triggers or application-level cascade
- Write tests to verify referential integrity

**Files affected:** All route files with DELETE endpoints

---

### 2. No Transaction Support (Potential) ⚠️ MEDIUM PRIORITY
**Impact:** Partial writes if multi-step operations fail

**Example:**
```typescript
// Creating resident with contacts
await createResident(data);
await createContact(residentId, contactData);  // Fails here
// → Resident created but contact missing (orphaned data)
```

**Recommended action:**
- Wrap multi-step operations in transactions:
  ```typescript
  const connection = await fastify.db.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query('INSERT INTO residents ...');
    await connection.query('INSERT INTO contacts ...');
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
  ```

**Files affected:** `server/routes/residents.ts`, `server/routes/organizations.ts`

---

## Infrastructure Concerns

### 1. XAMPP Development Database ⚠️ CRITICAL
**Impact:** Cannot deploy to production without database migration

**Current:** MySQL via XAMPP (Windows/Mac development tool)

**Production gap:**
- No managed MySQL service configured
- No backup strategy
- No read replicas for scaling
- No connection pooling verification

**Recommended action:**
- Document production database requirements
- Choose managed MySQL provider (AWS RDS, PlanetScale, etc.)
- Test migrations on production-like environment
- Set up automated backups

**Files affected:** `server/plugins/db.ts`, `server/knexfile.ts`

---

### 2. No Secrets Management ⚠️ HIGH PRIORITY
**Impact:** Secrets in `.env` could be committed to git

**Current:** `.env` is gitignored, but no validation

**Recommended action:**
- Use secrets management service (AWS Secrets Manager, Vault)
- Add startup validation for required env vars:
  ```typescript
  const required = ['DB_HOST', 'JWT_SECRET', 'COOKIE_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
  ```
- Add pre-commit hook to reject commits with secrets

**Files affected:** `server/index.ts`

---

### 3. No Monitoring/Observability ⚙️ MEDIUM PRIORITY
**Impact:** Cannot detect performance degradation or errors in production

**Missing:**
- No APM (Application Performance Monitoring)
- No uptime monitoring
- No database query performance tracking
- No alert system for errors or downtime

**Recommended action:**
- Add health check endpoint (`GET /health`)
- Integrate APM (New Relic, Datadog, or open-source: Grafana + Prometheus)
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Add database query logging for slow queries

**Files affected:** `server/index.ts` (add `/health` route)

---

## Migration Risks

### 1. 41+ Migrations Without Rollback Tests ⚠️ MEDIUM PRIORITY
**Impact:** Cannot safely revert schema changes if deployment fails

**Current:** All migrations have `up` and `down` functions

**Concern:**
- Have rollbacks been tested?
- Are all migrations reversible?
- Is there a rollback procedure documented?

**Recommended action:**
- Test every migration's `down` function
- Document rollback procedure
- Add migration testing to CI/CD

**Files affected:** All `server/migrations/*.ts` files

---

### 2. Migration Naming Conflicts ⚙️ LOW PRIORITY
**Impact:** Merge conflicts if multiple developers create migrations

**Current:** Number-prefixed migrations (`001_`, `002_`, etc.)

**Recommended:**
- Use timestamp-based naming: `20260517_create_table.ts`
- Or let Knex auto-generate names: `npx knex migrate:make create_table`

**Files affected:** Future migrations

---

## Summary of Action Items

### Immediate (High Priority)
1. ✅ Add automated testing framework (Vitest)
2. ✅ Audit rate limiting on auth endpoints
3. ✅ Secure admin panel (2FA, IP whitelist)
4. ✅ Document deployment process
5. ✅ Add secrets validation on startup

### Short-term (Medium Priority)
6. ⚙️ Add error tracking (Sentry)
7. ⚙️ Audit SQL queries for injection risk
8. ⚙️ Add global error handler
9. ⚙️ Verify password reset token expiry
10. ⚙️ Test database transaction usage

### Long-term (Low Priority)
11. ⚙️ Add Prettier for code formatting
12. ⚙️ Implement caching strategy (Redis)
13. ⚙️ Add API versioning
14. ⚙️ Add monitoring/observability
15. ⚙️ Optimize database indexes
