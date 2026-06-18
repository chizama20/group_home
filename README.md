# Group Home Management System

A multi-tenant care home management platform built with React + Fastify + MySQL.

## Prerequisites

- Node.js 20+
- XAMPP (for MySQL) — start the MySQL module before running the server

## Project Structure

```
group-home-system/
├── client/   # React 18 + TypeScript + Tailwind CSS
└── server/   # Fastify + MySQL2 + Knex
```

## Setup

### 1. Clone and install dependencies

```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Configure environment variables

**server/.env**
```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=grouphome
JWT_SECRET=          # min 32 chars
ADMIN_JWT_SECRET=    # separate secret for the /admin panel
RESEND_API_KEY=      # optional — only needed for invite/reset emails
```

**client/.env**
```
VITE_API_URL=http://localhost:3000
```

### 3. Create the database

In phpMyAdmin (http://localhost/phpmyadmin), create a database named `grouphome` with `utf8mb4` charset.

### 4. Run migrations

```bash
cd server
npm run migrate
```

### 5. Seed dev data (optional)

```bash
npm run seed
# Org Admin:  orgadmin@grouphome.com  / Admin@123
# Manager:    manager@grouphome.com   / Manager@123
# Employee:   employee@grouphome.com  / Employee@123
```

## Running

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

- API: http://localhost:3000
- App: http://localhost:5173

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with watch mode |
| `npm run migrate` | Run pending migrations |
| `npm run migrate:rollback` | Roll back last migration batch |
| `npm run seed` | Seed development data |
| `npm run build` | Build for production |

## Roles

| Role | Access |
|---|---|
| `org_admin` | Full access — manages homes, staff, and settings |
| `manager` | Can manage residents, logs, and create employees |
| `employee` | Access to homes they are assigned to |
