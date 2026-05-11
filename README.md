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
- Neon-ready PostgreSQL connection setup for team collaboration

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

## Environment Variables

Create a `.env` file based on `.env.example`.

```env
# Runtime
PORT=3000
NODE_ENV="development"

# Neon pooled connection string for the app/runtime
DATABASE_URL="postgresql://<user>:<password>@<endpoint>-pooler.<region>.aws.neon.tech/<database>?sslmode=require&channel_binding=require"

# Direct connection string for Prisma CLI tasks
DIRECT_URL="postgresql://<user>:<password>@<endpoint>.<region>.aws.neon.tech/<database>?sslmode=require&channel_binding=require"

JWT_SECRET="replace-with-a-strong-random-secret"
JWT_EXPIRES_IN_SECONDS=86400
```

### Why Two Database URLs?

- `DATABASE_URL` is used by the running NestJS application
- The Prisma schema reads `DATABASE_URL` for the datasource
- Prisma CLI tasks also load `prisma.config.ts`, which requires `DIRECT_URL`
- With Neon, pooled connections are better for app traffic, while direct connections are safer for schema changes

## Setup

```bash
npm install
```

Then create your local environment file:

```bash
cp .env.example .env
```

## Development

Fastest development flow:

```bash
npm run dev
```

This command:

- regenerates the Prisma client
- starts NestJS in watch mode using `.env`

If you are using Neon for the first time, run your migration before starting the app:

```bash
npm run db:migrate -- --name init
```

## Useful Commands

```bash
# run backend in watch mode
npm run dev

# run backend in debug watch mode
npm run dev:debug

# regenerate prisma client
npm run db:generate

# format prisma schema
npm run db:format

# create and apply a migration
npm run db:migrate -- --name your_migration_name

# push schema changes without migration
npm run db:push

# open prisma studio
npm run db:studio

# build project
npm run build

# type-check project
npm run typecheck

# lint and auto-fix
npm run lint

# run tests
npm run test
```

## Team Database Setup With Neon

Recommended workflow for your team:

- Create one shared Neon project for the backend
- Invite teammates through a Neon organization or project collaborators
- Store only `.env.example` in git, never commit the real `.env`
- Keep Prisma migrations in git so every teammate gets the same schema history
- Use the shared development branch in Neon for normal collaboration
- Create extra Neon branches only for risky experiments or isolated testing

Typical onboarding flow for a teammate:

```bash
# 1. clone the project
# 2. create local env file
cp .env.example .env

# 3. paste the shared Neon connection strings
# 4. install dependencies
npm install

# 5. generate prisma client
npm run db:generate

# 6. apply migrations
npm run db:migrate

# 7. start the backend
npm run dev
```

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
