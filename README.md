# ERP Backend

Backend API for a multi-tenant ERP system built with NestJS, Prisma, and PostgreSQL.

## Architecture Priority

Long-term maintainability is a project priority.

- prefer a modular, clean architecture over short-term convenience
- keep controllers thin and focused on HTTP concerns
- keep services focused on orchestration and business flow
- extract pure helpers into `utils/`
- extract response shaping into `mappers/`
- avoid letting large service files accumulate unrelated formatting, validation, mapping, and persistence logic
- favor backend modules that can grow cleanly over time without turning into monolith files

## Current Progress

This project already has the core backend foundation in place:

- Auth module with `register`, `login`, and `me` endpoints
- JWT-based authentication
- Role-based authorization using guards and decorators
- API versioning with NestJS built-in URI versioning
- User management module with protected CRUD endpoints
- Prisma schema and migrations for users, companies, and memberships
- Global request validation with `class-validator`
- Environment-based configuration using `@nestjs/config`
- Separate local PostgreSQL and Neon staging database workflows

## Implemented Features

### Authentication

- User registration
- Password hashing with `bcrypt`
- JWT access token generation
- Logged-in user profile endpoint
- Multi-company login support
- Email verification before company onboarding
- Post-auth onboarding state that continues into company setup

### Authorization

- Public route decorator
- JWT auth guard
- Roles guard
- App roles: `SUPER_ADMIN`, `ADMIN`, `USER`

### User Management

- List users
- Get single user
- Create user (`SUPER_ADMIN` only)
- Update user (`SUPER_ADMIN` only)
- Delete user (`SUPER_ADMIN` only)

## Tech Stack

- NestJS
- Prisma ORM
- PostgreSQL
- TypeScript
- Passport JWT
- Class Validator
- Bcrypt

## Database Design

Current main entities:

- `User`
- `Company`
- `Membership`
- `SubscriptionPlan`
- `CompanySubscription`

Role structure:

- `SystemRole`: `SUPER_ADMIN`, `STANDARD`
- `MembershipRole`: `ADMIN`, `USER`

This supports a multi-tenant setup where:

- one user can belong to multiple companies
- one company can have multiple users
- each membership stores the user role inside that company

Subscription ownership rule:

- subscriptions belong to the `Company`, not the admin user
- the registering account is the future company admin and primary billing contact for the company it creates during onboarding
- when a company subscription expires or becomes unavailable, all memberships in that company lose access, including the admin
- pre-company onboarding data is only temporary staging and is not an active subscription

## API Base URL

```bash
http://localhost:3000/api/v1
```

Versioning is enabled globally using NestJS URI versioning, which keeps the API ready for future versions like `v2` and `v3` without restructuring modules.

## Available Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Users

- `GET /api/v1/users` (`ADMIN`, `SUPER_ADMIN`)
- `POST /api/v1/users` (`SUPER_ADMIN`)
- `GET /api/v1/users/:id` (`ADMIN`, `SUPER_ADMIN`)
- `PATCH /api/v1/users/:id` (`SUPER_ADMIN`)
- `DELETE /api/v1/users/:id` (`SUPER_ADMIN`)

## Sample Request Payloads

### Register

```json
{
  "fullName": "Jason Doe",
  "email": "jason@example.com",
  "password": "Password1!",
  "confirmPassword": "Password1!"
}
```

### Login

```json
{
  "email": "jason@example.com",
  "password": "password123",
  "companyId": 1
}
```

`companyId` is optional when the user belongs to exactly one company. If the user belongs to multiple companies, the login response asks the client to choose a company first.

## Project Structure

```text
src/
  common/
    decorators/
    enums/
    guards/
    interfaces/
  modules/
    auth/
    onboarding/
    users/
  prisma/
prisma/
  migrations/
  schema.prisma
```

## Database Environments

Database access is deliberately separated:

| Environment       | Database                     | Configuration source          |
| ----------------- | ---------------------------- | ----------------------------- |
| Local development | Local PostgreSQL             | `.env`                        |
| Render staging    | Neon staging                 | Render environment variables  |
| Production        | Separate production database | Hosting environment variables |

Never put Neon credentials in the local `.env`. Local scripts explicitly load `.env`; deploy scripts do not load any env file.

## Local Setup

1. Install PostgreSQL and create the local database:

```bash
createdb -U postgres gr8bookslite_dev
```

2. Create `.env`, then install dependencies:

```bash
cp .env.example .env
npm install
```

3. Set both local database URLs in `.env`:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gr8bookslite_dev?schema=public"
DIRECT_URL="postgresql://postgres:your_password@localhost:5432/gr8bookslite_dev?schema=public"
```

4. Apply migrations and start the API:

```bash
npm run db:migrate:local
npm run dev
```

`npm run dev` regenerates the Prisma client and starts NestJS in watch mode. The local wrapper requires `.env`, makes its values override exported shell variables, and rejects non-local database hosts. Seeds and maintenance scripts also refuse to modify a non-local database.

## Prisma Workflow

For the beginner-friendly Prisma command flow used in this repo, read:

- [docs/PRISMA_WORKFLOW.md](docs/PRISMA_WORKFLOW.md)

## Useful Commands

```bash
# run backend in watch mode
npm run dev

# run backend in debug watch mode
npm run dev:debug

# regenerate and validate Prisma locally
npm run db:generate:local
npm run db:validate:local

# format prisma schema
npm run db:format

# create and apply a migration locally
npm run db:migrate:local -- --name your_migration_name

# create a migration without applying it
npm run db:migrate:create:local -- --name your_migration_name

# inspect, reset, seed, or open the local database
npm run db:status:local
npm run db:verify:local
npm run db:reset:local
npm run db:seed:local
npm run db:bootstrap-admin:local
npm run db:studio:local

# deploy committed migrations using host-provided environment variables
npm run db:migrate:staging

# build project
npm run build

# type-check project
npm run typecheck

# lint and auto-fix
npm run lint

# run tests
npm run test
```

## Render And Neon Staging

Set `DATABASE_URL` and `DIRECT_URL` in the Render dashboard. Use the Neon pooled URL for `DATABASE_URL` and the Neon direct URL for `DIRECT_URL`. Do not upload `.env` to Render.

Render commands:

```text
Build Command: npm ci --include=dev && npm run build
Pre-Deploy Command: npm run db:migrate:staging && npm run db:verify:staging
Start Command: npm run start:staging
```

`--include=dev` is required because Render staging uses `NODE_ENV=production`, while the Nest CLI and TypeScript build tools are development dependencies. `db:migrate:staging` runs separately before application startup, requires `APP_ENV=staging`, validates the configured database fingerprint, and only applies committed migrations. `db:verify:staging` then checks connectivity, migration status, and the permission architecture. `start:staging` validates the same environment before starting the server and never runs migrations. Schema changes must be created and tested against local PostgreSQL, committed under `prisma/migrations`, and deployed through Render. Do not run `migrate dev`, `db push`, or `migrate reset` against Neon staging.

## Copy Neon Staging Data Locally

Use the Neon direct connection string for the dump. The flags avoid restoring Neon-specific ownership and grants:

```bash
pg_dump --no-owner --no-acl "$NEON_DIRECT_URL" > neon_backup.sql
dropdb -U postgres gr8bookslite_dev
createdb -U postgres gr8bookslite_dev
psql -U postgres -d gr8bookslite_dev < neon_backup.sql
```

Backups can contain sensitive staging data. Store them only temporarily and never commit them. See [docs/agents/LOCAL_DATABASE_SETUP.md](docs/agents/LOCAL_DATABASE_SETUP.md) for the detailed workflow.

## Progress Checklist

- [x] NestJS project setup
- [x] Prisma and PostgreSQL integration
- [x] Neon cloud PostgreSQL setup
- [x] User entity and user module
- [x] Company and membership schema
- [x] JWT authentication
- [x] Role-based access control
- [x] API versioning with `/api/v1`
- [x] Registration flow with email verification
- [x] Initial onboarding backend for plan and billing staging
- [x] Protected user endpoints
- [ ] Company management module
- [ ] Finalize company onboarding and create company-level subscriptions
- [ ] ERP business modules
- [ ] Refresh tokens
- [ ] Audit logs
- [ ] Unit and integration test coverage expansion

## Notes

- Registration creates a user first and verifies email before company setup.
- After onboarding is completed, the registering account should become the first `MembershipRole.ADMIN` member of the created company.
- Users can belong to multiple companies through the `Membership` table.
- Subscription enforcement is company-based, not user-based.
- A temporary onboarding draft may exist before company creation, but it does not grant access and does not replace `CompanySubscription`.
- `SUPER_ADMIN` can bypass normal role restrictions.
- Global validation is enabled and unknown request fields are rejected.
- Controllers are versioned with NestJS built-in URI versioning.
- The app is structured to keep modules reusable as the API grows into future versions.

## Suggested Next Steps

- Add company CRUD endpoints
- Finish onboarding company-details endpoint that creates `Company`, `Membership`, and `CompanySubscription`
- Add company user management so the admin can invite or create users under the company
- Add invitation or membership assignment flow
- Scope user listing by company for admin users
- Add refresh token support
- Add more tests for auth and role guards
