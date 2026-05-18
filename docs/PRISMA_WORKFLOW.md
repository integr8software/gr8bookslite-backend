# Prisma Workflow

This is the safest beginner-friendly Prisma workflow for this repo.

## Quick Rule

Use these commands most of the time:

```bash
npm run db:prepare:dev
npm run db:migrate:dev -- --name your_feature_name
npm run typecheck:clean
npm run dev
```

## Recommended Commands

### Start normal backend development

```bash
npm run dev
```

This:

- regenerates Prisma client
- starts NestJS in watch mode

If TypeScript cache gets weird, use:

```bash
npm run dev:clean
```

## When you change `prisma/schema.prisma`

Run this first:

```bash
npm run db:prepare:dev
```

This:

- formats Prisma schema
- validates Prisma schema
- regenerates Prisma client

## Proper flow for a new database feature

Example: adding billing, onboarding fields, or new tables.

1. Edit `prisma/schema.prisma`
2. Run:

```bash
npm run db:prepare:dev
```

3. Create and apply the migration:

```bash
npm run db:migrate:dev -- --name add_billing_module
```

4. Check types:

```bash
npm run typecheck:clean
```

5. Start the backend:

```bash
npm run dev
```

## If you only changed TypeScript code, not the schema

Use:

```bash
npm run typecheck:clean
npm run dev
```

## If Prisma client types look stale

Use:

```bash
npm run db:generate:dev
npm run typecheck:clean
```

## Check migration state

Use:

```bash
npm run db:status:dev
```

## Open Prisma Studio

Use:

```bash
npm run db:studio:dev
```

## If your dev database is disposable and you want a clean rebuild

Use:

```bash
npm run db:rebuild:dev
```

This:

- resets the dev database
- regenerates Prisma client
- reseeds the database

Only use this when it is safe to wipe development data.

## When to use `db push`

```bash
npm run db:push:dev
```

Use `db push` only for quick experiments or temporary local prototyping.

Avoid using `db push` as the normal team workflow because it can create drift between:

- `schema.prisma`
- migration history
- actual database structure

For normal feature work, prefer:

```bash
npm run db:migrate:dev -- --name your_feature_name
```

## Safe Default Workflow

If you are unsure, use this exact order:

```bash
npm run db:prepare:dev
npm run db:migrate:dev -- --name your_feature_name
npm run typecheck:clean
npm run build
npm run dev
```

## If migrations get weird

Symptoms:

- drift detected
- Prisma client types do not match schema
- database columns/tables are missing unexpectedly
- migration fails halfway

Try these checks first:

```bash
npm run db:status:dev
npm run db:generate:dev
npm run typecheck:clean
```

If the dev database is safe to wipe:

```bash
npm run db:rebuild:dev
```

## Team Guidance

- Prefer `migrate dev` over `db push`
- Prefer `typecheck:clean` after Prisma changes
- Prefer `dev:clean` if watch mode behaves strangely
- Keep migration names short and descriptive
- Review generated SQL when the schema change is important
