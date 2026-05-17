# Code Conventions

*Last mapped: 2026-05-17*

## TypeScript Configuration

### Frontend
- **Strict mode:** Enabled
- **Module system:** ES modules (`"type": "module"` in package.json)
- **Target:** ES2020+
- **Path aliases:** `@/*` → `./src/*`
- **JSX:** React 19 (new JSX transform)

### Backend
- **Strict mode:** Enabled
- **Module system:** CommonJS (`"type": "commonjs"`)
- **Target:** ES2020
- **No path aliases:** Uses relative imports (`../../../`)

## Naming Conventions

### Variables & Functions
```typescript
// camelCase for variables and functions
const userId = '123';
function getUserById(id: string) { ... }

// PascalCase for React components
function ResidentProfile() { ... }
export default AppLayout;

// PascalCase for types/interfaces
interface Resident { ... }
type ApiResponse<T> = { ... }
```

### Files
```
Frontend:
  - Components: PascalCase (AppLayout.tsx, ProtectedRoute.tsx)
  - Pages: index.tsx inside PascalCase directory (Dashboard/index.tsx)
  - Utils: camelCase (date.ts, role.ts)
  - Hooks: camelCase with 'use' prefix (useInactivityTimer.ts)

Backend:
  - Routes: camelCase (auth.ts, residents.ts, iposLogs.ts)
  - Migrations: NNN_snake_case.ts (001_create_orgs.ts)
  - Utilities: camelCase (response.ts)
```

### Database
```sql
-- Tables: snake_case plural
residents, medication_logs, shift_notes

-- Columns: snake_case
first_name, date_of_birth, is_active, created_at

-- Foreign keys: <table_singular>_id
org_id, user_id, home_id, resident_id

-- Booleans: is_/has_/can_ prefix
is_active, has_access, can_edit
```

## Code Style

### TypeScript/JavaScript

**No explicit style guide** — Code is consistent but not enforced by Prettier/StandardJS

**Observed patterns:**

```typescript
// Single quotes preferred
import { useAuth } from '@/context/AuthContext';
const message = 'Hello';

// Optional semicolons (inconsistent — some files use them, some don't)
const x = 1;
const y = 2

// 2-space indentation
function example() {
  if (condition) {
    doSomething();
  }
}

// Destructuring preferred
const { user, logout } = useAuth();
const { homeId } = useHome();

// Arrow functions for components
const AppLayout = () => {
  return <div>...</div>;
};

// Explicit return types for backend functions
export async function getResident(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // ...
}
```

### React Patterns

```tsx
// Functional components only (no class components)
function DashboardPage() {
  const [state, setState] = useState<Type>(initial);

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  return <div>...</div>;
}

// Props destructuring
interface Props {
  resident: Resident;
  onUpdate: () => void;
}

function ResidentCard({ resident, onUpdate }: Props) {
  // ...
}

// Conditional rendering
{user ? <Dashboard /> : <Login />}
{loading && <Spinner />}
{error && <ErrorMessage message={error} />}

// Map without index keys (UUIDs preferred)
{residents.map((r) => (
  <ResidentCard key={r.id} resident={r} />
))}
```

### Fastify Patterns

```typescript
// Route registration via function export
export default async function residentsRoutes(fastify: FastifyInstance) {
  fastify.get('/residents', {
    preHandler: [managerOrAbove],  // RBAC middleware
    handler: async (request, reply) => {
      const orgId = request.user.orgId;

      // Query database
      const [rows] = await fastify.db.query(
        'SELECT * FROM residents WHERE org_id = ? AND deleted_at IS NULL',
        [orgId]
      );

      return reply.send(success(rows));
    }
  });
}

// Error handling
try {
  // ...
} catch (error) {
  fastify.log.error(error);
  return reply.code(500).send(failure('SERVER_ERROR', 'Internal server error'));
}
```

## Error Handling

### Frontend

```typescript
// Try-catch for async operations
try {
  const response = await axios.post('/api/endpoint', data);
  setSuccess(true);
} catch (error) {
  if (axios.isAxiosError(error)) {
    setError(error.response?.data?.message || 'Request failed');
  } else {
    setError('An unexpected error occurred');
  }
}

// Error boundaries for React errors
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Backend

```typescript
// Standard response format
import { success, failure } from '../utils/response';

// Success
return reply.send(success(data));
// → { success: true, data: {...} }

// Failure
return reply.code(400).send(failure('INVALID_INPUT', 'Email is required'));
// → { success: false, error: 'INVALID_INPUT', message: 'Email is required' }

// Validation errors (Zod)
const schema = z.object({ email: z.string().email() });
const result = schema.safeParse(request.body);

if (!result.success) {
  return reply.code(400).send(failure('VALIDATION_ERROR', result.error.message));
}
```

## Data Validation

### Backend (Zod)

```typescript
import { z } from 'zod';

// Define schema
const createResidentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  home_id: z.string().uuid(),
  room: z.string().nullable().optional(),
});

// Validate in route handler
const result = createResidentSchema.safeParse(request.body);
if (!result.success) {
  return reply.code(400).send(failure('VALIDATION_ERROR', result.error.message));
}

const data = result.data;  // Type-safe validated data
```

### Frontend

**No formal validation library** — Manual checks + backend validation

```typescript
// Manual validation
if (!email || !password) {
  setError('All fields are required');
  return;
}

if (password.length < 8) {
  setError('Password must be at least 8 characters');
  return;
}

// Rely on backend validation
try {
  await axios.post('/auth/login', { email, password });
} catch (error) {
  // Backend returns validation errors
  setError(error.response?.data?.message);
}
```

## Comments & Documentation

### JSDoc (minimal usage)

```typescript
// Type annotations preferred over JSDoc
interface User {
  id: string;
  email: string;
  role: 'org_admin' | 'manager' | 'employee';
}

// Comments for non-obvious logic
// Cookie must be set before auth plugin registration
fastify.register(cookiePlugin);
fastify.register(authPlugin);

// Multi-line comments for complex logic
/**
 * Shift selection is enforced daily for employees.
 * Managers and org admins are exempt.
 * Selection is stored in localStorage with date key.
 */
```

### TODOs

```typescript
// TODO: Add rate limiting to this endpoint
// FIXME: This query is slow for large datasets
// NOTE: This workaround is temporary until Fastify v6
```

**No TODO tracking** — Comments scattered in code, no centralized list

## Async Patterns

### Prefer async/await over promises

```typescript
// Good
async function fetchResident(id: string) {
  const resident = await getResidentById(id);
  const logs = await getLogsForResident(id);
  return { resident, logs };
}

// Avoid
function fetchResident(id: string) {
  return getResidentById(id).then(resident => {
    return getLogsForResident(id).then(logs => {
      return { resident, logs };
    });
  });
}
```

### Error handling

```typescript
// Always use try-catch for async
try {
  const result = await operation();
} catch (error) {
  fastify.log.error(error);
  throw error;
}
```

## Database Query Patterns

### Raw SQL via mysql2

```typescript
// Parameterized queries (prevent SQL injection)
const [rows] = await fastify.db.query(
  'SELECT * FROM residents WHERE org_id = ? AND home_id = ?',
  [orgId, homeId]
);

// Insert with RETURNING (MySQL 8.0+)
const [result] = await fastify.db.query(
  'INSERT INTO residents (id, org_id, first_name, last_name) VALUES (?, ?, ?, ?)',
  [uuid(), orgId, firstName, lastName]
);

// Soft delete pattern
await fastify.db.query(
  'UPDATE residents SET deleted_at = NOW() WHERE id = ?',
  [residentId]
);

// Exclude soft-deleted rows
const [rows] = await fastify.db.query(
  'SELECT * FROM residents WHERE org_id = ? AND deleted_at IS NULL',
  [orgId]
);
```

### Knex.js (migrations only)

```typescript
// Migration up
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('residents', (table) => {
    table.uuid('id').primary();
    table.uuid('org_id').notNullable().references('id').inTable('orgs').onDelete('CASCADE');
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.date('date_of_birth').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });
}

// Migration down
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('residents');
}
```

## Authentication Patterns

### Backend: JWT in HTTP-only cookies

```typescript
// Login: Set cookie
const token = fastify.jwt.sign({ userId, orgId, role });
reply.setCookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
});

// Logout: Clear cookie
reply.clearCookie('access_token');
```

### Frontend: Axios with credentials

```typescript
// Include cookies in all requests
axios.defaults.withCredentials = true;

// API calls automatically include cookie
const response = await axios.get('/residents');
```

## Environment Variables

### Backend `.env` pattern

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=grouphome

# Authentication
JWT_SECRET=replace_with_32_char_random_string
COOKIE_SECRET=replace_with_32_char_random_string

# Server
PORT=3000
NODE_ENV=development

# External services (optional)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@domain.com
```

### Frontend `.env` pattern

```bash
# API base URL
VITE_API_URL=http://localhost:3000
```

## Linting & Formatting

### ESLint Configuration

```javascript
// client/eslint.config.js
// Uses new flat config format (ESLint 9+)
```

**Enabled rules:**
- TypeScript type checking
- React hooks rules
- React refresh rules (Vite HMR)

**No Prettier** — Code is manually formatted (inconsistent spacing/semicolons)

## Git Commit Conventions

**No formal convention** — Commits are freeform

Examples from recent history:
- "fixed final errors, and removed old data"
- "Shift Notes, Incident Polish & Announcement Feed"
- "Medications & MAR"

**Recommendation:** Adopt Conventional Commits (feat:, fix:, docs:, chore:)
