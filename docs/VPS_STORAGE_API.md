# VPS Storage API

The backend uses provider-based storage through `StorageService`.

- `STORAGE_PROVIDER=vps` uploads through the backend's internal VPS Storage API.
- `STORAGE_PROVIDER=supabase` remains available for future production use.

Feature modules must not call Supabase or disk storage directly.

For the current Windows VPS staging setup, the NestJS backend owns both:

```text
/api/v1/*
/storage/*
```

No separate storage PM2 process is required.

## Local

```env
STORAGE_PROVIDER=vps
STORAGE_ENV=local
VPS_STORAGE_API_URL=http://localhost:3002/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://localhost:3002/storage
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_SECRET=<secret>
```

Expected write target on VPS:

```text
I:\Gr8BooksNeo\storage\local
```

## Shared Dev

```env
STORAGE_PROVIDER=vps
STORAGE_ENV=shared-dev
VPS_STORAGE_API_URL=http://localhost:3002/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=https://api.staging.gr8booksneo.integr8.com.ph/storage
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_SECRET=<secret>
```

Expected write target on VPS:

```text
I:\Gr8BooksNeo\storage\shared-dev
```

## Staging

```env
STORAGE_PROVIDER=vps
STORAGE_ENV=staging
VPS_STORAGE_API_URL=http://localhost:3002/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=https://api.staging.gr8booksneo.integr8.com.ph/storage
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_SECRET=<secret>
```

Expected write target on VPS:

```text
I:\Gr8BooksNeo\storage\staging
```

## VPS Receiver

The backend process receiving `/api/v1/storage/internal/*` on the VPS needs:

```env
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_PUBLIC_URL=https://api.staging.gr8booksneo.integr8.com.ph/storage
VPS_STORAGE_SECRET=<same-secret>
```

The backend also serves static files from `VPS_STORAGE_ROOT` at `/storage`.

```text
/storage/shared-dev/avatars/user-4/file.jpg
```

maps to:

```text
I:\Gr8BooksNeo\storage\shared-dev\avatars\user-4\file.jpg
```

## Internal Endpoints

Upload:

```http
POST /api/v1/storage/internal/upload
Authorization: Bearer <VPS_STORAGE_SECRET>
Content-Type: multipart/form-data
```

Fields:

```text
file
storageEnv=local|shared-dev|staging
folder=company-logos|avatars|attachments|exports
```

Delete:

```http
DELETE /api/v1/storage/internal/file
Authorization: Bearer <VPS_STORAGE_SECRET>
Content-Type: application/json
```

Body:

```json
{
  "relativePath": "shared-dev/avatars/file.png"
}
```

## Stored Paths

The database stores relative paths and public URLs only. Physical paths such as
`I:\Gr8BooksNeo\storage\...` must never be stored.

Examples:

```text
local/avatars/user-4/file.png
shared-dev/company-logos/company-12/file.png
staging/attachments/file.pdf
```

## Verification

1. Configure the caller env with `STORAGE_PROVIDER=vps`.
2. Configure the VPS receiver env with the same `VPS_STORAGE_SECRET`.
3. Ensure IIS routes all API host traffic to the backend:
   `http://localhost:3002/{R:1}`.
4. Upload an avatar or company logo.
5. Confirm the file appears under the matching VPS folder.
6. Open the returned `publicUrl` in a browser.
