# Testing & Quality Assurance

*Last mapped: 2026-05-17*

## Current State: No Automated Testing

**Critical Gap:** This project has NO test framework, NO test files, and NO automated quality assurance.

### What's Missing

- ❌ No unit tests
- ❌ No integration tests
- ❌ No end-to-end tests
- ❌ No test framework installed (Jest, Vitest, Testing Library, etc.)
- ❌ No test scripts in package.json
- ❌ No CI/CD pipeline
- ❌ No code coverage tracking

### Evidence

```bash
# No test scripts in package.json
$ grep "test" client/package.json server/package.json
(no results)

# No test files in codebase
$ find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "__tests__"
(no project test files — only node_modules dependencies)

# No testing libraries installed
$ grep -E "jest|vitest|mocha|chai|testing-library" package.json
(no results)
```

## Manual Testing Only

### Current Quality Assurance Process

1. **Developer testing:** Manual browser testing during development
2. **End-user testing:** Staff test features in staging/production
3. **Database migrations:** Tested by running on dev MySQL instance

### Known Risks

Without automated testing:
- **Regression risk:** Changes can break existing features silently
- **Confidence gap:** No way to verify code correctness before deployment
- **Slow feedback:** Bugs found in production rather than development
- **Refactoring fear:** Changing code is risky without safety net

## Recommended Testing Strategy

### 1. Backend Unit Tests (Priority: High)

**Framework:** Jest or Vitest

**What to test:**
- Route handlers (auth, residents, medications, etc.)
- Middleware (session extraction, RBAC)
- Validation schemas (Zod)
- Database queries (use test database or mocks)

**Example test:**

```typescript
// server/routes/__tests__/auth.test.ts
import { build } from '../test-helper';  // Test Fastify app builder

describe('POST /auth/login', () => {
  it('returns 400 for missing email', async () => {
    const app = await build();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { password: 'test123' }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: 'VALIDATION_ERROR'
    });
  });

  it('returns 401 for invalid credentials', async () => {
    const app = await build();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'invalid@example.com',
        password: 'wrong'
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns token for valid credentials', async () => {
    // Test with seeded user
  });
});
```

### 2. Frontend Component Tests (Priority: Medium)

**Framework:** Vitest + React Testing Library

**What to test:**
- Component rendering
- User interactions (button clicks, form submissions)
- Conditional rendering logic
- Context providers

**Example test:**

```typescript
// client/src/components/__tests__/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { AuthContext } from '@/context/AuthContext';
import ProtectedRoute from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  it('redirects to login when unauthenticated', () => {
    render(
      <AuthContext.Provider value={{ user: null, ... }}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    // Should redirect (use router mock)
    expect(window.location.pathname).toBe('/login');
  });

  it('renders children when authenticated', () => {
    render(
      <AuthContext.Provider value={{ user: mockUser, ... }}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

### 3. Integration Tests (Priority: Medium)

**Framework:** Supertest (backend) + Playwright (frontend)

**What to test:**
- Full API flows (create resident → log medication → export MAR)
- Database transactions
- Multi-tenant isolation (org A cannot see org B's data)
- RBAC enforcement

**Example test:**

```typescript
// server/routes/__tests__/integration/medications.test.ts
describe('Medication logging flow', () => {
  it('creates medication and logs administration', async () => {
    const app = await build();

    // 1. Create medication
    const medResponse = await app.inject({
      method: 'POST',
      url: '/medications',
      cookies: { access_token: managerToken },
      payload: {
        resident_id: testResidentId,
        name: 'Aspirin',
        dosage: '100mg',
        frequency: 'daily'
      }
    });

    expect(medResponse.statusCode).toBe(201);
    const medication = medResponse.json().data;

    // 2. Log administration
    const logResponse = await app.inject({
      method: 'POST',
      url: '/medications/logs',
      cookies: { access_token: employeeToken },
      payload: {
        medication_id: medication.id,
        administered_at: new Date().toISOString(),
        given_by_user_id: employeeId
      }
    });

    expect(logResponse.statusCode).toBe(201);

    // 3. Verify in database
    const [rows] = await app.db.query(
      'SELECT * FROM medication_logs WHERE medication_id = ?',
      [medication.id]
    );
    expect(rows).toHaveLength(1);
  });
});
```

### 4. End-to-End Tests (Priority: Low)

**Framework:** Playwright or Cypress

**What to test:**
- Critical user journeys
- Login → home selection → log medication → logout
- Org admin creates home → invites staff → staff accepts

**Example test:**

```typescript
// e2e/medication-logging.spec.ts
import { test, expect } from '@playwright/test';

test('employee logs medication administration', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'employee@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 2. Select home
  await expect(page).toHaveURL('/home-selection');
  await page.click('text=Test Home 1');

  // 3. Select shift
  await page.click('text=Morning Shift');
  await page.click('button:has-text("Start Shift")');

  // 4. Navigate to MAR
  await expect(page).toHaveURL('/dashboard');
  await page.click('text=Medications');

  // 5. Log medication
  await page.click('button:has-text("Log as Given")');
  await expect(page.locator('text=Administered at')).toBeVisible();

  // 6. Verify toast/confirmation
  await expect(page.locator('text=Medication logged')).toBeVisible();
});
```

## Code Coverage Goals

**Recommended targets:**

- **Backend routes:** 80%+ coverage
- **Frontend components:** 70%+ coverage
- **Business logic (services):** 90%+ coverage
- **Utilities:** 90%+ coverage

**Tools:**
- Backend: `c8` or `nyc` (Istanbul)
- Frontend: Vitest built-in coverage (via c8)

## Test Data Management

### Database Seeding

**Current:** `server/seeds/` directory exists (likely for dev data)

**Recommended:**
- Separate seed files for test data
- Test database: `grouphome_test`
- Reset database before each test suite
- Use fixtures for repeatable test data

**Example:**

```typescript
// server/test/fixtures/users.ts
export const testUsers = [
  {
    id: 'user-org-admin-123',
    email: 'admin@test.com',
    role: 'org_admin',
    org_id: 'org-test-123',
    password_hash: '$2b$10$...'  // bcrypt hash of 'password123'
  },
  {
    id: 'user-manager-456',
    email: 'manager@test.com',
    role: 'manager',
    org_id: 'org-test-123',
    password_hash: '$2b$10$...'
  }
];

// server/test/helpers/db.ts
export async function seedTestDatabase() {
  // Truncate all tables
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE residents');
  await db.query('TRUNCATE TABLE users');
  // ...
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  // Insert fixtures
  for (const user of testUsers) {
    await db.query('INSERT INTO users SET ?', [user]);
  }
}
```

## Continuous Integration (CI)

**Current:** No CI/CD configured

**Recommended GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: grouphome_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd server && npm ci
      - run: cd server && npm run migrate -- --env test
      - run: cd server && npm test
      - run: cd server && npm run coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd client && npm ci
      - run: cd client && npm test
      - run: cd client && npm run coverage
```

## Manual Testing Checklist

**Until automated tests are implemented, use this checklist:**

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error shown)
- [ ] Logout clears session
- [ ] Password reset email sent
- [ ] Password reset link works
- [ ] Session expires after inactivity

### Multi-Tenancy
- [ ] Org A cannot see Org B's residents
- [ ] Org A cannot see Org B's homes
- [ ] Employee only sees assigned homes
- [ ] Manager can create employees
- [ ] Org admin can create homes

### Medication Logging (MAR)
- [ ] Create medication schedule
- [ ] Log as given (timestamp recorded)
- [ ] Log as refused (reason captured)
- [ ] Export MAR as PDF
- [ ] MAR shows correct date range

### Incident Reporting
- [ ] Create incident report
- [ ] Attach resident to incident
- [ ] View incident history
- [ ] Only authorized users can edit

### Offline Support (PWA)
- [ ] App installs on mobile
- [ ] Dashboard loads offline (cached)
- [ ] API calls retry when back online
- [ ] Service worker updates correctly

## Performance Testing

**Not currently implemented**

**Recommended tools:**
- **k6** — Load testing API endpoints
- **Lighthouse** — Frontend performance audit
- **Artillery** — Distributed load testing

**Critical scenarios to test:**
- 100 concurrent users logging medications
- Large MAR exports (1000+ medication logs)
- Dashboard load time with 50+ residents

## Security Testing

**Not currently implemented**

**Recommended:**
- **OWASP ZAP** — Automated security scanning
- **npm audit** — Dependency vulnerability scanning
- **Snyk** — Continuous dependency monitoring

**Manual security checklist:**
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF protection (cookie SameSite=strict)
- [ ] JWT secret is strong (32+ chars)
- [ ] Passwords are hashed (bcrypt)
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS in production
- [ ] HTTP-only cookies for tokens

## Next Steps

**Priority order:**

1. **Install Vitest** (backend and frontend)
2. **Write auth tests** (login, logout, session validation)
3. **Write RBAC tests** (org admin vs manager vs employee)
4. **Write resident CRUD tests** (create, read, update, delete)
5. **Add CI/CD** (GitHub Actions)
6. **Measure coverage** (aim for 60%+ initially)
7. **Add E2E tests** (Playwright for critical flows)

**Estimated effort:** 2-3 weeks to reach 60% coverage across critical paths
