# Database Deployment Workflow

Database migrations and application startup are separate deployment steps.

## Staging

Configure the Render staging service with:

```text
Build Command: npm ci --include=dev && npm run build
Pre-Deploy Command: npm run db:migrate:staging && npm run db:verify:staging
Start Command: npm run start:staging
```

Required environment identity:

```text
APP_ENV=staging
DATABASE_GUARD_HOSTS=<pooled-host>,<direct-host>
DATABASE_GUARD_NAME=<staging-database-name>
```

The pre-deploy command must migrate and verify the database before the new
application revision starts. Verification checks connectivity, migration status,
applied migration checksums, and the permission architecture. The start command validates the staging
database fingerprint but never executes a Prisma migration command.

## Production

Configure production as separate deployment steps:

```text
Build Command: npm ci --include=dev && npm run build
Pre-Deploy Command: npm run db:migrate:production && npm run db:verify:production
Start Command: npm run start:production
```

Required environment identity:

```text
APP_ENV=production
DATABASE_GUARD_HOSTS=<pooled-host>,<direct-host>
DATABASE_GUARD_NAME=<production-database-name>
CONFIRM_PRODUCTION_MIGRATION=true
```

Production migration confirmation must be supplied only to the approved
pre-deploy/release job. The application start command does not require the
confirmation token and does not run migrations.

## Release Order

```text
1. Back up the hosted database.
2. Run the environment-specific migration-history verification command.
3. Run the environment-specific migration command.
4. Run the environment-specific full database verification command.
5. Start or promote the new application revision.
```

The migration-history verification permits pending migrations but fails when an
already-applied migration is modified or missing. The full verification after
deployment requires migration status and application-specific checks to pass.

Database backup automation and application smoke testing are separate future
phases. Until they are implemented, complete those steps using the hosting and
database-provider controls before promoting a release.

An applied migration is immutable. If verification reports a checksum mismatch,
stop the deployment, restore the original migration file, and create a new
forward migration for the correction.

## Prohibited Startup Configuration

Do not chain migration and startup commands:

```text
npm run db:migrate:staging && npm run start:staging
```

Do not configure a hosted start command that invokes Prisma. This avoids
concurrent migration attempts during restarts, scale-outs, and cold starts.
