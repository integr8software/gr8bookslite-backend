# Database Workflow Refactor Implementation Plan

Project: Gr8Books Neo Backend

## Purpose

Refactor the current database environment workflow to make it:

- safer
- easier for team development
- staging/production ready
- protected from accidental database damage

This refactor should NOT redesign the database schema.

Current stack:

- NestJS
- Prisma ORM
- PostgreSQL
- DBeaver
- Local PostgreSQL
- VPS PostgreSQL shared development
- Neon PostgreSQL staging

---

# Current Architecture

Current flow:

```
LOCAL
.env
PostgreSQL localhost
gr8booksneo_dev

        ↓

SHARED DEVELOPMENT
.env.shared-dev
server1.integr8.com.ph
gr8booksneo_shared_dev

        ↓

STAGING
Cloud PostgreSQL (Neon)

        ↓

PRODUCTION
Future production database
```

---

# Current Problems

## Problem 1: Environment Safety

Local is protected:

```
scripts/run-with-env.cjs
```

prevents:

- remote database usage
- accidental reset
- wrong DATABASE_URL

However:

Shared dev
Staging
Production

do not have the same protection.

Example risk:

```
npm run db:migrate:deploy
```

depends only on DATABASE_URL.

Wrong environment variables can migrate the wrong database.

---

# Target Architecture

Create environment-aware database protection.

New structure:

```
scripts/

env/
 ├── database-guard.cjs
 ├── env-loader.cjs
 └── environment-rules.cjs
```

Every database command must verify:

- APP_ENV
- DATABASE_URL hostname
- database name
- allowed operations

---

# Phase 1: Add Environment Identity

Add required variable:

Local:

.env

```
APP_ENV=local
```

Shared:

.env.shared-dev

```
APP_ENV=shared-dev
```

Staging:

```
APP_ENV=staging
```

Production:

```
APP_ENV=production
```

Application should fail startup if APP_ENV is missing.

---

# Phase 2: Create Database Guard

Implement database guard rules.

Rules:

## LOCAL

Allowed hosts:

```
localhost
127.0.0.1
::1
```

Allowed database:

```
gr8booksneo_dev
```

Allowed commands:

YES:

```
migrate dev
migrate reset
seed
studio
generate
```

NO:

Remote database.

---

## SHARED DEVELOPMENT

Allowed host:

```
server1.integr8.com.ph
```

Allowed database:

```
gr8booksneo_shared_dev
```

Allowed:

```
prisma migrate deploy
prisma generate
prisma studio
```

Forbidden:

```
prisma migrate dev
prisma migrate reset
prisma db push
```

---

## STAGING

Allowed:

```
prisma migrate deploy
status
verify
```

Forbidden:

```
reset
db push
migrate dev
```

---

## PRODUCTION

Allowed:

```
migrate deploy
status
verify
```

Required:

manual confirmation token.

Example:

```
CONFIRM_PRODUCTION_MIGRATION=true
```

Forbidden always:

```
migrate reset
db push
migrate dev
```

---

# Phase 3: Refactor Package Scripts

Replace unclear scripts.

Remove:

```
db:migrate:deploy
```

because target environment is unclear.

Create:

## Development

```
npm run dev:local

npm run dev:shared
```

---

## Migration

Local:

```
npm run db:migrate:create:local

npm run db:migrate:local
```

Purpose:

create migration files.

Uses:

```
prisma migrate dev
```

---

Shared:

```
npm run db:migrate:shared
```

Uses:

```
prisma migrate deploy
```

---

Staging:

```
npm run db:migrate:staging
```

Uses:

```
prisma migrate deploy
```

---

Production:

```
npm run db:migrate:production
```

Uses:

```
prisma migrate deploy
```

Requires confirmation.

---

# Phase 4: Separate Migration From Application Startup

Current:

```
deploy
 |
 migrate database
 |
 start server
```

Change to:

```
DEPLOY PIPELINE

1. Backup database

2. Run migration

3. Verify migration

4. Start application
```

Application startup should never automatically migrate database.

---

# Phase 5: Add Database Verification

Create:

```
npm run db:verify:local

npm run db:verify:shared

npm run db:verify:staging

npm run db:verify:production
```

Verify:

- database reachable
- correct environment
- migrations valid
- permission catalog valid

---

# Phase 6: Refactor Seed Strategy

Current seed mixes:

- reference data
- admin setup
- local test data

Split:

```
prisma/

scripts/

seed-reference.ts

seed-local-fixtures.ts

bootstrap-admin.ts
```

---

## Reference Seed

Contains:

- modules
- submodules
- permissions
- subscription plans

Can run on:

local
shared
staging
production

---

## Fixture Seed

Contains:

- fake users
- fake companies
- test transactions

Only:

local

---

# Phase 7: Permission Architecture Cleanup

Current target convention:

## Modules

Keep descriptive.

Example:

```
cash-disbursement
accounts-payable
general-ledger
```

---

## Submodules

Use short business codes.

Example:

```
Chart Of Accounts

COA


Petty Cash Fund Replenishment

PCFR


Accounts Payable Voucher

APV
```

Do not include module prefix.

Wrong:

```
CDPCFR
```

Correct:

```
PCFR
```

because parent module already provides context.

---

# Permission Actions

Final supported actions:

```
view
create
update
cancel
uncancel
export
```

Remove legacy:

```
delete
approve
```

Migration strategy:

Do NOT break existing data.

Create forward migrations.

Example:

```
DELETE -> CANCEL
```

Then remove legacy after compatibility period.

---

# Phase 8: Migration Rules

# Daily Team Workflow: Local, Shared Dev, and Teammate Updates

This is the main workflow after this refactor.

The goal is:

- local changes are tested safely on the developer machine first,
- database structure changes are shared through Prisma migrations and Git,
- shared development is updated using committed migrations,
- teammates update their local databases from the same committed migrations.

Do **not** use `pg_dump` for daily schema changes.

Use `pg_dump` only for:

- first-time shared dev setup,
- full demo-data refresh,
- cloning a database for debugging,
- backup or restore.

---

## A. Developer Pushes Local Schema Changes To Shared Dev

Use this when a developer changes `prisma/schema.prisma`.

### Step 1: Create and test migration locally

```bash
npm run db:migrate:local -- --name <migration_name>
```

Example:

```bash
npm run db:migrate:local -- --name add_customer_code
```

This creates a new migration file in:

```txt
prisma/migrations/
```

and applies it only to the local database.

### Step 2: Test the backend locally

```bash
npm run dev
```

### Step 3: Commit schema and migration files

```bash
git add prisma/schema.prisma prisma/migrations

git commit -m "add customer code migration"

git push
```

### Step 4: Apply committed migrations to shared dev

```bash
npm run db:migrate:shared
```

### Step 5: Start backend using shared dev database

```bash
npm run dev:shared
```

---

## B. Teammate Updates Their Local Database From Latest Changes

Use this when a teammate pulls changes from Git.

### Step 1: Pull latest code

```bash
git pull
```

### Step 2: Install new packages if package files changed

```bash
npm install
```

### Step 3: Apply migrations to their own local database

```bash
npm run db:migrate:local
```

### Step 4: Regenerate Prisma Client if needed

```bash
npm run db:generate:local
```

### Step 5: Start local backend

```bash
npm run dev
```

---

## C. Pull Shared Dev Data Into Local Machine

Use this only when a developer wants their local database to copy the current shared development data.

This will replace local data.

### Step 1: Dump shared dev database

```bash
pg_dump \
  -h server1.integr8.com.ph \
  -p 5432 \
  -U gr8books_dev \
  -d gr8booksneo_shared_dev \
  -Fc \
  --no-owner \
  --no-acl \
  -f ~/Desktop/gr8booksneo_shared_dev.dump
```

### Step 2: Clear local database schema

```bash
psql -h localhost -U integr8 -d gr8booksneo_dev
```

Inside `psql`:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO integr8;
GRANT ALL ON SCHEMA public TO integr8;
\q
```

### Step 3: Restore shared dev dump into local database

```bash
pg_restore \
  -h localhost \
  -U integr8 \
  -d gr8booksneo_dev \
  --no-owner \
  --no-acl \
  ~/Desktop/gr8booksneo_shared_dev.dump
```

---

## D. Push Full Local Data To Shared Dev

Use this only for intentional shared dev refreshes.

This will replace shared development data.

### Step 1: Dump local database

```bash
pg_dump \
  -h localhost \
  -p 5432 \
  -U integr8 \
  -d gr8booksneo_dev \
  -Fc \
  --no-owner \
  --no-acl \
  -f ~/Desktop/gr8booksneo_local.dump
```

### Step 2: Backup shared dev first

```bash
pg_dump \
  -h server1.integr8.com.ph \
  -p 5432 \
  -U gr8books_dev \
  -d gr8booksneo_shared_dev \
  -Fc \
  --no-owner \
  --no-acl \
  -f ~/Desktop/gr8booksneo_shared_before_restore.dump
```

### Step 3: Clear shared dev schema

```bash
psql -h server1.integr8.com.ph -U gr8books_dev -d gr8booksneo_shared_dev
```

Inside `psql`:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO gr8books_dev;
GRANT ALL ON SCHEMA public TO gr8books_dev;
\q
```

### Step 4: Restore local dump into shared dev

```bash
pg_restore \
  -h server1.integr8.com.ph \
  -U gr8books_dev \
  -d gr8booksneo_shared_dev \
  --no-owner \
  --no-acl \
  ~/Desktop/gr8booksneo_local.dump
```

---

## Very Short Command Checklist

### Push local schema changes to shared dev

```bash
npm run db:migrate:local -- --name <migration_name>
npm run dev
git add prisma/schema.prisma prisma/migrations
git commit -m "describe migration"
git push
npm run db:migrate:shared
npm run dev:shared
```

### Teammate updates local from latest migration changes

```bash
git pull
npm install
npm run db:migrate:local
npm run db:generate:local
npm run dev
```

### Pull shared dev data into local

```bash
pg_dump -h server1.integr8.com.ph -U gr8books_dev -d gr8booksneo_shared_dev -Fc --no-owner --no-acl -f ~/Desktop/gr8booksneo_shared_dev.dump
psql -h localhost -U integr8 -d gr8booksneo_dev
# DROP SCHEMA public CASCADE; CREATE SCHEMA public; ALTER SCHEMA public OWNER TO integr8; GRANT ALL ON SCHEMA public TO integr8; \q
pg_restore -h localhost -U integr8 -d gr8booksneo_dev --no-owner --no-acl ~/Desktop/gr8booksneo_shared_dev.dump
```

### Push full local data to shared dev

```bash
pg_dump -h localhost -U integr8 -d gr8booksneo_dev -Fc --no-owner --no-acl -f ~/Desktop/gr8booksneo_local.dump
pg_dump -h server1.integr8.com.ph -U gr8books_dev -d gr8booksneo_shared_dev -Fc --no-owner --no-acl -f ~/Desktop/gr8booksneo_shared_before_restore.dump
psql -h server1.integr8.com.ph -U gr8books_dev -d gr8booksneo_shared_dev
# DROP SCHEMA public CASCADE; CREATE SCHEMA public; ALTER SCHEMA public OWNER TO gr8books_dev; GRANT ALL ON SCHEMA public TO gr8books_dev; \q
pg_restore -h server1.integr8.com.ph -U gr8books_dev -d gr8booksneo_shared_dev --no-owner --no-acl ~/Desktop/gr8booksneo_local.dump
```

---

Follow:

Local:

```
schema.prisma change

↓

npm run db:migrate:local

↓

migration.sql created

↓

commit migration
```

Shared:

```
git pull

↓

npm run db:migrate:shared
```

Staging:

```
npm run db:migrate:staging
```

Production:

```
approval

↓

backup

↓

npm run db:migrate:production
```

---

# Never Do

Never:

```
migrate reset
```

on:

- shared
- staging
- production

Never:

```
db push
```

on:

- shared
- staging
- production

Never:

edit old applied migrations.

Always create new forward migration.

---

# Expected Final Result

After refactor:

✔ local remains flexible

✔ shared dev becomes safe for team

✔ staging behaves like production

✔ production protected

✔ migrations are predictable

✔ local changes can be pushed to shared dev through migrations

✔ teammates can update their local databases from committed migrations

✔ full data copy remains possible through controlled `pg_dump` and `pg_restore`

✔ permission refactors are safe

✔ onboarding new developers is easier

Implement phase by phase.

After each phase:

- list changed files
- explain what changed
- explain how to test
- wait before continuing
