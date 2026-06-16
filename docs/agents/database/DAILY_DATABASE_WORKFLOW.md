# Daily Database Workflow

Use Prisma migrations and Git to move schema changes between environments.
Database dumps are for backups, restores, and intentional data refreshes only.

## Non-Negotiable Rules

- Create migrations only against the local database.
- Commit `prisma/schema.prisma` and its new migration together.
- Treat a migration as immutable after it has been applied anywhere.
- Correct an applied migration with a new forward migration.
- Use only `prisma migrate deploy` for shared development, staging, and
  production.
- Never run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push`
  against shared development, staging, or production.
- Never replace a hosted database with a local dump as part of normal schema
  promotion.

## Developer Creates A Schema Change

```bash
npm run db:verify:local
npm run db:migrate:local -- --name <migration_name>
npm run db:verify:local
npm run typecheck
npm test -- --runInBand
```

Review the generated SQL before committing it. Commit the schema and migration
directory together, then push them through Git.

Do not edit an old migration to correct a mistake. Update the Prisma schema and
create another migration instead.

## Shared Development Promotion

Only apply migrations that have already been reviewed and committed:

```bash
npm run db:verify-migrations:shared
npm run db:migrate:shared
npm run db:verify:shared
```

The pre-migration checksum audit permits pending migrations but stops if already
applied history was modified. The full post-migration verification requires the
database to be completely up to date.

Create a database backup before a risky or destructive migration. Do not run the
shared migration while another developer is changing the same database.

## Teammate Pulls New Migrations

```bash
git pull
npm ci
npm run db:migrate:local
npm run db:verify:local
npm run typecheck
npm test
npm run dev
```

Use `npm ci` after pulling when `package.json` or `package-lock.json` changed,
so local dependencies match the committed lockfile exactly. `db:migrate:local`
generates Prisma Client after applying migrations, so a separate
`db:generate:local` is usually unnecessary.

For a shorter everyday confidence check after pulling migrations, run:

```bash
npm run db:migrate:local && npm run db:verify:local && npm run typecheck
```

If migration-history verification reports a modified applied migration, stop.
Restore the committed migration to its original SQL and create a new forward
migration for the intended change.

## Database Dumps

`pg_dump` and `pg_restore` do not promote schema changes. Use them only for:

- backups and restores,
- first-time shared development setup,
- intentional demo-data refreshes,
- cloning a database locally for debugging.

Pulling shared development data into local is allowed when sensitive data is
handled correctly and the developer accepts losing local data.

Replacing shared development data from a local dump is a manual maintenance
operation, not a daily workflow. It requires the shared environment owner's
approval, a verified backup, a maintenance window, and post-restore
`npm run db:verify:shared`. Never use this process for staging or production.
