# VPS Storage API

The backend uses provider-based storage through `StorageService`.

- `STORAGE_PROVIDER=vps` uploads through the VPS Storage API.
- `STORAGE_PROVIDER=supabase` remains available for future production use.

Feature modules must not call Supabase or disk storage directly.

## Local

```env
STORAGE_PROVIDER=vps
STORAGE_ENV=local
VPS_STORAGE_API_URL=http://gr8booksneo-storage.integr8.com.ph/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
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
VPS_STORAGE_API_URL=http://gr8booksneo-storage.integr8.com.ph/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
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
VPS_STORAGE_API_URL=http://gr8booksneo-storage.integr8.com.ph/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
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
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
VPS_STORAGE_SECRET=<same-secret>
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
3. Ensure IIS routes `/api/v1/storage/internal/*` to the backend receiver.
4. Upload an avatar or company logo.
5. Confirm the file appears under the matching VPS folder.
6. Open the returned `publicUrl` in a browser.
