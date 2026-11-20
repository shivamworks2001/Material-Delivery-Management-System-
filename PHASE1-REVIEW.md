# Sunshine Engineering — Phase 1

Implemented: responsive login and dashboard, PostgreSQL/Prisma schema and migration, administrator/office/delivery roles, opaque HTTP-only sessions, scrypt passwords, same-origin write checks, database-backed login throttling, administrator user creation/editing/deactivation, session revocation on account edits, protected pages and API, audit trail, loading/error/empty states.

Verified: production build, TypeScript, ESLint, three security unit tests, Prisma validation/migration and HTTP/database integration suite. Dependency audit reports zero known vulnerabilities after patched transitive dependency overrides. Browser sign-in and dashboard rendering checked. Integration tests cover anonymous access, failed/successful login, both non-admin roles denied user management, cross-origin rejection, validation, account update/deactivation, revoked sessions, self-demotion prevention, audit trail and logout.

Delivery counters, master data, challans, proofs, offline synchronization and reports remain future phases. The dashboard shows real identity data and an explicit delivery empty state. Phase 2 requires user approval.

## Running locally

Requirements: Node.js 22+, npm, Docker Desktop running. From this directory:

1. `npm ci`
2. Configure `.env` from `.env.example`. Bundled Compose DATABASE_URL is `postgresql://sunshine:sunshine-local-development@localhost:55432/sunshine`; APP_ORIGIN is `http://localhost:3000`.
3. `docker compose up -d`
4. `npm run db:generate` then `npm run db:migrate`
5. For a fresh database, set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD (12+ characters) in the terminal environment and run `node --env-file=.env --import tsx scripts/bootstrap.ts`. Clear the password variable afterwards. Bootstrap refuses if an administrator exists.
6. `npm run dev`; visit http://localhost:3000.

A local review administrator already exists in this workspace; credentials are in the chat, not source. Change its password in Team & access. All account edits revoke that user's sessions, including your own.

## Repeat verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit`. With the local app/database running, `npm run test:integration` tests API and database behavior using isolated fixtures, then removes its test users/audit records. Never run it against production.

## Operations and limits

Database port 55432 is loopback-only; data persists in Docker volume sunshine_sunshine_data. `docker compose stop` preserves it. Production requires managed credentials, HTTPS, matching APP_ORIGIN, backups, gateway body/IP limits, monitoring and retention/session cleanup scheduling in Phase 7. Local Compose credentials are development-only. Account login throttling allows ten attempts per 15-minute window. Password recovery is administrator-managed; email is not configured. Roles are a closed enum for the three requested roles. No deployment has been created.

See ARCHITECTURE.md for the seven-phase plan and pending business decisions.
