# Staging Safe Seed And Storage Deployment

This workflow is for the Windows VPS staging/shared-dev backend deployment.
The backend owns both API routes and static storage serving.

## Environment

Recommended backend environment:

```env
APP_ENV=shared-dev
FRONTEND_URL=https://staging.gr8booksneo.integr8.com.ph
STORAGE_PROVIDER=vps
STORAGE_ENV=shared-dev
VPS_STORAGE_API_URL=http://localhost:3002/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=https://api.staging.gr8booksneo.integr8.com.ph/storage
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_SECRET=<secret>
```

## IIS / ARR

Frontend site:

```txt
Site: gr8booksneo-frontend-staging
Host: staging.gr8booksneo.integr8.com.ph
Rewrite URL: http://localhost:3001/{R:1}
```

API site:

```txt
Site: gr8booksneo-api-staging
Host: api.staging.gr8booksneo.integr8.com.ph
Rewrite URL: http://localhost:3002/{R:1}
```

No separate storage IIS site or storage PM2 process is required for this staging
setup. Static files are served by the backend at `/storage/*`.

ARR setting:

```txt
Reverse rewrite host in response headers = disabled
```

This preserves external redirect hosts for Google OAuth. If ARR rewrites
response headers, a Google redirect such as
`https://accounts.google.com/o/oauth2/v2/auth` can be incorrectly rewritten to
the API host.

## Deploy

Use the staging branch once it is established. Do not deploy arbitrary `develop`
commits to the VPS staging environment.

```cmd
git checkout staging
git pull
npm ci
node scripts/run-with-env.cjs .env prisma migrate deploy
node scripts/run-with-env.cjs .env prisma generate
npm run db:provision:current
npm run db:verify-permissions:current
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

`db:provision:current` provisions infrastructure data only:

- platform modules
- permissions
- module systems
- module system sidebar templates
- missing user sidebar rows for active memberships

It does not run local fixtures, reset the database, delete companies, delete
users, delete memberships, delete branches, or wipe customized sidebars.

## Verification

Expected permission verification:

```txt
modules > 0
permissions > 0
moduleSystemSidebarTemplates > 0
sidebarItems > 0
sidebarLinks > 0
membershipsWithoutSidebar = 0
orphanPermissions = 0
legacyCatalogTablesPresent = false
```

Full Prisma seed must remain blocked in shared-dev:

```cmd
node scripts/run-with-env.cjs .env prisma db seed
```

Expected:

```txt
Operation "prisma:db:seed" is forbidden when APP_ENV=shared-dev.
```

## Storage Checks

Backend static storage maps:

```txt
/storage/shared-dev/avatars/user-4/file.jpg
```

to:

```txt
I:\Gr8BooksNeo\storage\shared-dev\avatars\user-4\file.jpg
```

Direct backend check:

```cmd
curl -I http://localhost:3002/storage/shared-dev/avatars/user-4/<file>.jpg
```

Public check:

```cmd
curl -I https://api.staging.gr8booksneo.integr8.com.ph/storage/shared-dev/avatars/user-4/<file>.jpg
```

Expected:

```txt
HTTP/1.1 200 OK
Content-Type: image/jpeg
```

Google OAuth redirect check:

```cmd
curl -I https://api.staging.gr8booksneo.integr8.com.ph/api/v1/auth/google
```

Expected `Location` starts with:

```txt
https://accounts.google.com/o/oauth2/v2/auth
```
