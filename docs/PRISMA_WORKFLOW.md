# Prisma Workflow

Local development uses local PostgreSQL through `.env`. Render staging uses Neon through environment variables configured in Render. Production must use a separate production database.

## Local Commands

All commands ending in `:local` explicitly load `.env`.

| Command                                            | Purpose                                          |
| -------------------------------------------------- | ------------------------------------------------ |
| `npm run db:generate:local`                        | Generate Prisma Client                           |
| `npm run db:validate:local`                        | Validate Prisma schema and configuration         |
| `npm run db:format`                                | Format Prisma schema using local configuration   |
| `npm run db:migrate:local -- --name <name>`        | Create and apply a local migration               |
| `npm run db:migrate:create:local -- --name <name>` | Create a local migration without applying it     |
| `npm run db:status:local`                          | Check local migration status                     |
| `npm run db:verify-migrations:local`               | Verify applied migration checksums               |
| `npm run db:verify:local`                          | Verify status, history, and permission catalog   |
| `npm run db:reset:local`                           | Wipe and rebuild the local database              |
| `npm run db:seed:local`                            | Run local reference data and fixtures            |
| `npm run db:seed:reference:local`                  | Upsert local reference data                      |
| `npm run db:seed:fixtures:local`                   | Create local-only development fixtures           |
| `npm run db:bootstrap-admin:local`                 | Create or update the configured local superadmin |
| `npm run db:studio:local`                          | Open Prisma Studio against the local database    |
| `npm run db:prepare:local`                         | Format, validate, and generate locally           |
| `npm run db:rebuild:local`                         | Reset, generate, and seed locally                |

`db:reset:local` and `db:rebuild:local` destroy local data. There is intentionally no `db push` script because normal schema changes must be represented by migrations.

The local environment wrapper rejects non-local `DATABASE_URL` and `DIRECT_URL` hosts. Seeds and maintenance scripts also assert that `DATABASE_URL` points to `localhost`, `127.0.0.1`, or `::1` before modifying data.

The registered Prisma seed runs local reference data and local fixtures.
Superadmin bootstrap is separate and runs only through
`npm run db:bootstrap-admin:local`.

Reference seeds currently upsert subscription plan configuration. Platform
modules, submodules, and permissions remain migration-owned so a seed cannot
silently rewrite the permission catalog. Reference seeds are available for all
environments:

```bash
npm run db:seed:reference:local
npm run db:seed:reference:shared
npm run db:seed:reference:staging
npm run db:seed:reference:production
```

Production reference seeding requires
`CONFIRM_PRODUCTION_REFERENCE_SEED=true`.

The local user-owned-data cleanup deletes database records only by default. Remote storage deletion requires the explicit `--delete-storage` flag and should be used only after confirming the configured Supabase project is safe.

## Schema Change Workflow

1. Edit `prisma/schema.prisma`.
2. Prepare and validate locally:

```bash
npm run db:prepare:local
```

3. Create and apply a migration to local PostgreSQL:

```bash
npm run db:migrate:local -- --name add_billing_module
```

4. Review the generated SQL under `prisma/migrations`, then verify:

```bash
npm run db:verify:local
npm run typecheck:clean
npm run build
npm run dev
```

5. Commit the schema and migration together. Never edit that migration after it
   has been applied. Correct later mistakes with a new forward migration.

6. Apply reviewed, committed migrations to shared development:

```bash
npm run db:verify-migrations:shared
npm run db:migrate:shared
npm run db:verify:shared
```

See `docs/DAILY_DATABASE_WORKFLOW.md` for the complete developer and teammate
workflow.

## Staging And Production

The deploy command does not load `.env`:

```bash
npm run db:migrate:staging
```

It relies on `DATABASE_URL` and `DIRECT_URL` supplied by the hosting platform. Render staging must point to Neon staging; production must point to a separate production database.

Read-only verification commands check database connectivity, Prisma migration
status, applied migration checksums, and the permission architecture:

```bash
npm run db:verify:local
npm run db:verify:shared
npm run db:verify:staging
npm run db:verify:production
```

Render configuration:

```text
Build Command: npm ci --include=dev && npm run build
Pre-Deploy Command: npm run db:migrate:staging && npm run db:verify:staging
Start Command: npm run start:staging
```

Render staging has `NODE_ENV=production`, so `--include=dev` is required to install the Nest CLI and TypeScript build tools. Migrations and read-only database verification must finish successfully in pre-deploy before Render starts the new application revision. Application startup never runs migrations. Never run `migrate dev`, `migrate reset`, or `db push` against staging or production.
