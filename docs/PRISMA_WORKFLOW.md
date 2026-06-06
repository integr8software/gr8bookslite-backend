# Prisma Workflow

Local development uses local PostgreSQL through `.env`. Render staging uses Neon through environment variables configured in Render. Production must use a separate production database.

## Local Commands

All commands ending in `:local` explicitly load `.env`.

| Command | Purpose |
| --- | --- |
| `npm run db:generate:local` | Generate Prisma Client |
| `npm run db:validate:local` | Validate Prisma schema and configuration |
| `npm run db:format` | Format Prisma schema using local configuration |
| `npm run db:migrate:local -- --name <name>` | Create and apply a local migration |
| `npm run db:migrate:create:local -- --name <name>` | Create a local migration without applying it |
| `npm run db:status:local` | Check local migration status |
| `npm run db:reset:local` | Wipe and rebuild the local database |
| `npm run db:seed:local` | Run Prisma's registered seed against the local database |
| `npm run db:studio:local` | Open Prisma Studio against the local database |
| `npm run db:prepare:local` | Format, validate, and generate locally |
| `npm run db:rebuild:local` | Reset, generate, and seed locally |

`db:reset:local` and `db:rebuild:local` destroy local data. There is intentionally no `db push` script because normal schema changes must be represented by migrations.

The local environment wrapper rejects non-local `DATABASE_URL` and `DIRECT_URL` hosts. Seeds and maintenance scripts also assert that `DATABASE_URL` points to `localhost`, `127.0.0.1`, or `::1` before modifying data.

The seed always upserts subscription plans. It seeds a superadmin only when both `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` are set; leaving both empty safely skips that account.

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
npm run typecheck:clean
npm run build
npm run dev
```

5. Commit the schema and migration together. Render applies that committed migration to Neon staging during startup.

## Staging And Production

The deploy command does not load `.env`:

```bash
npm run db:migrate:deploy
```

It relies on `DATABASE_URL` and `DIRECT_URL` supplied by the hosting platform. Render staging must point to Neon staging; production must point to a separate production database.

Render configuration:

```text
Build Command: npm install && npm run build
Start Command: npm run db:migrate:deploy && npm run start:prod
```

Never run `migrate dev`, `migrate reset`, or `db push` against staging or production.
