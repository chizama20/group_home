# Technology Stack

*Last mapped: 2026-05-17*

## Languages & Runtime

| Component | Language | Version | Notes |
|-----------|----------|---------|-------|
| Frontend  | TypeScript | 5.9.3 | Strict mode enabled |
| Backend   | TypeScript | 5.9.3 | CommonJS module system |
| Runtime   | Node.js | 20+ | Required for both frontend and backend |

## Frontend Stack

### Core Framework
- **React** 19.2.4 — UI framework
- **React Router** 7.13.2 — Client-side routing
- **Vite** 8.0.1 — Build tool and dev server

### UI Libraries
- **Tailwind CSS** 3.4.19 — Utility-first CSS framework
- **Radix UI** — Accessible component primitives
  - `@radix-ui/react-avatar` 1.1.11
  - `@radix-ui/react-dialog` 1.1.15
  - `@radix-ui/react-dropdown-menu` 2.1.16
  - `@radix-ui/react-label` 2.1.8
  - `@radix-ui/react-select` 2.2.6
  - `@radix-ui/react-separator` 1.1.8
  - `@radix-ui/react-tabs` 1.1.13
- **Base UI React** 1.3.0 — Additional component library
- **Lucide React** 1.7.0 — Icon library
- **class-variance-authority** 0.7.1 — Type-safe variant APIs
- **clsx** 2.1.1 / **tailwind-merge** 3.5.0 — Class name utilities
- **@fontsource-variable/geist** 5.2.8 — Typography

### State & Data
- **Axios** 1.13.6 — HTTP client for API communication
- **IndexedDB (idb)** 8.0.3 — Client-side storage
- **uuid** 13.0.0 — Unique ID generation

### PWA Support
- **vite-plugin-pwa** 1.2.0 — Progressive Web App capabilities
  - Service worker with workbox
  - App manifest for installable experience
  - Network-first API caching strategy
  - Offline support

### Dev Tooling (Frontend)
- **ESLint** 9.39.4 — Linting
- **typescript-eslint** 8.57.0 — TypeScript-specific linting
- **Autoprefixer** 10.4.27 / **PostCSS** 8.5.8 — CSS processing

### Build Configuration
- Path aliases: `@/*` → `./src/*`
- Build tool: Vite with React plugin
- Output: `client/dist/`

## Backend Stack

### Core Framework
- **Fastify** 5.8.4 — High-performance web framework (chosen over Express for speed and modern API design)
- **fastify-plugin** 5.1.0 — Plugin encapsulation

### Database
- **MySQL** (via XAMPP) — Primary database
- **mysql2** 3.20.0 — MySQL driver
- **Knex.js** 3.2.5 — Query builder and migration tool
  - Migrations: 41+ migration files in `server/migrations/`
  - Seeding: Development seed data support

### Authentication & Security
- **JWT** (@fastify/jwt 10.0.0, jsonwebtoken 9.0.3) — Token-based auth
- **bcrypt** 6.0.0 — Password hashing
- **@fastify/cookie** 11.0.2 — Cookie handling
- **@fastify/rate-limit** 10.3.0 — Rate limiting protection
- **Zod** 4.3.6 — Runtime validation and schema enforcement

### Fastify Plugins
- **@fastify/cors** 11.2.0 — Cross-origin resource sharing
- **@fastify/postgres** 6.0.2 — PostgreSQL support (installed but MySQL is primary)
- **@fastify/mysql** 5.0.2 — MySQL integration

### External Services
- **Resend** 6.10.0 — Transactional email delivery
- **PDFKit** 0.18.0 — PDF generation for reports/exports
- **uuid** 13.0.0 — Unique ID generation

### Dev Tooling (Backend)
- **ts-node** 10.9.2 — TypeScript execution for dev
- **nodemon** 3.1.14 — Auto-reload during development
- **dotenv** 17.3.1 — Environment variable management

### Build Configuration
- Compiler target: ES2020
- Module system: CommonJS
- Output: `server/dist/`
- Strict mode enabled

## Configuration Files

### Frontend
- `client/vite.config.ts` — Vite build configuration
- `client/tsconfig.json` — TypeScript project references
- `client/tsconfig.app.json` — App-specific TypeScript config
- `client/tsconfig.node.json` — Node tooling TypeScript config
- `client/eslint.config.js` — Linting rules
- `client/postcss.config.js` — PostCSS configuration
- `client/tailwind.config.ts` — Tailwind CSS customization
- `client/.env.example` — Environment template (VITE_API_URL)

### Backend
- `server/tsconfig.json` — TypeScript configuration
- `server/knexfile.ts` — Database connection and migration config
- `server/nodemon.json` — Dev server watch configuration
- `server/.env.example` — Environment template (DB, JWT, Resend, DocuSign)

## Environment Variables

### Required (Backend)
```bash
DB_HOST=localhost          # MySQL host
DB_PORT=3306              # MySQL port
DB_USER=root              # Database user
DB_PASSWORD=              # Database password
DB_NAME=grouphome         # Database name
JWT_SECRET=               # Min 32 chars
COOKIE_SECRET=            # Min 32 chars
PORT=3000                 # Server port
```

### Optional (Backend)
```bash
APP_URL=http://localhost:5173          # Frontend URL for email links
RESEND_API_KEY=                        # Email delivery
RESEND_FROM_EMAIL=noreply@domain.com   # Email sender
ADMIN_EMAIL=                           # Admin credentials (env only)
ADMIN_PASSWORD=                        # Admin credentials (env only)
ADMIN_JWT_SECRET=                      # Separate admin auth token
DOCUSIGN_ACCOUNT_ID=                   # BAA signing integration
DOCUSIGN_CLIENT_ID=
DOCUSIGN_CLIENT_SECRET=
DOCUSIGN_TEMPLATE_ID=
DOCUSIGN_WEBHOOK_SECRET=
```

### Required (Frontend)
```bash
VITE_API_URL=http://localhost:3000    # Backend API endpoint
```

## Development Workflow

### Prerequisites
1. Node.js 20+
2. XAMPP (MySQL module running)

### Setup
```bash
# Frontend
cd client && npm install

# Backend
cd server && npm install
npm run migrate           # Run database migrations
npm run seed             # Optional: seed dev data
```

### Running
```bash
# Backend (Terminal 1)
cd server && npm run dev  # Runs on port 3000

# Frontend (Terminal 2)
cd client && npm run dev  # Runs on port 5173
```

### Build
```bash
# Frontend
cd client && npm run build  # Output: client/dist/

# Backend
cd server && npm run build  # Output: server/dist/
```

## Key Technology Decisions

### Why Fastify over Express?
- 2-3x faster request handling
- Native TypeScript support
- Built-in schema validation
- Modern async/await-first API
- Strong plugin ecosystem

### Why MySQL?
- Chosen for simplicity (XAMPP bundle)
- Knex.js provides migration/query abstraction
- Could migrate to PostgreSQL without major changes

### Why React 19?
- Latest stable version
- Modern concurrent features
- Server Components ready (future enhancement)

### Why Vite over Create React App?
- 10-100x faster HMR (hot module replacement)
- Native ESM during development
- Optimized production builds
- First-class TypeScript support

### Why Tailwind CSS?
- Utility-first approach reduces custom CSS
- Design system consistency
- Excellent TypeScript integration via config
- Small production bundle (unused classes purged)

### Why PWA Support?
- Offline-first capability for care facilities
- Reduces server load via intelligent caching
- Installable on mobile devices
- Network-first for API, cache-first for assets

## Package Management

- Package manager: npm (lockfile: `package-lock.json`)
- Monorepo structure: No (separate `client/` and `server/` projects)
- Dependency updates: Manual via `npm update`

## Known Limitations

1. **No automated testing** — No test framework configured (Jest, Vitest, or similar)
2. **No CI/CD** — No GitHub Actions or deployment automation
3. **Development-only database** — XAMPP is dev-only, production would need MySQL server
4. **Email provider dependency** — Resend API required for password reset flows
5. **No TypeScript path mapping in backend** — Uses relative imports (`../../../`) instead of `@/*`
