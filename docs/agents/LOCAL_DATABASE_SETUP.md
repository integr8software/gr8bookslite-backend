# Local PostgreSQL Development Setup

Local development must use local PostgreSQL. Render staging uses Neon staging, and production must eventually use a separate production database.

```text
Developer -> local .env -> local PostgreSQL
Render staging -> Render environment variables -> Neon staging
Production -> hosting environment variables -> production database
```

## Install PostgreSQL

Install PostgreSQL and its command-line tools (`psql`, `pg_dump`, `createdb`, and `dropdb`):

- Windows: <https://www.postgresql.org/download/windows/>
- macOS: <https://www.postgresql.org/download/macosx/>
- Linux: <https://www.postgresql.org/download/linux/>

Verify the tools:

```bash
psql --version
pg_dump --version
```

## Create And Configure The Local Database

Create the database:

```bash
createdb -U postgres gr8bookslite_dev
```

Create `.env` from the local-only example:

```bash
cp .env.example .env
```

Set both URLs to local PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gr8bookslite_dev?schema=public"
DIRECT_URL="postgresql://postgres:your_password@localhost:5432/gr8bookslite_dev?schema=public"
```

Do not put Neon staging credentials in `.env`. Local commands explicitly load `.env`, while deploy commands rely on hosting environment variables.

Apply migrations and start development:

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Copy Neon Staging Data To Local

Use the Neon direct connection URL, not the pooled URL. Treat the backup as sensitive and delete it when finished.

```bash
pg_dump --no-owner --no-acl "$NEON_DIRECT_URL" > neon_backup.sql
```

`--no-owner --no-acl` prevents Neon-specific roles and grants from breaking the local restore.

Stop the backend and Prisma Studio, then recreate and restore the local database:

```bash
dropdb -U postgres gr8bookslite_dev
createdb -U postgres gr8bookslite_dev
psql -U postgres -d gr8bookslite_dev < neon_backup.sql
npm run db:studio:local
```

Never commit `.env`, SQL dumps, or custom-format database dumps. The repository ignores `*.sql` and `*.dump`.

## Apply Schema Changes To Staging

Create and test migrations only against local PostgreSQL:

```bash
npm run db:prepare:local
npm run db:migrate:local -- --name your_change
npm run typecheck:clean
npm run build
```

Commit `prisma/schema.prisma` and the generated `prisma/migrations` files. On Render, configure Neon staging URLs as environment variables and use:

```text
Build Command: npm install && npm run build
Start Command: npm run db:migrate:deploy && npm run start:prod
```

`db:migrate:deploy` applies committed migrations using Render's environment variables. Never run `migrate dev`, `migrate reset`, or `db push` against Neon staging.
