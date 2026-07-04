# Codex Task: Implement Option 2 - VPS Storage API Provider

We are choosing Option 2: VPS Storage API.

Goal:
Make local/shared/staging upload files to our VPS storage through HTTP API, similar to Supabase.

Do NOT use direct filesystem storage from developer machines.

Current problem:
POST /api/backend/users/me/avatar returns 502 because the app is trying to use VPS storage, but the VPS upload API/provider is incomplete or not properly wired.

Current VPS static storage works:
http://gr8booksneo-storage.integr8.com.ph/shared-dev/test.txt

Storage root on VPS:
I:\Gr8BooksNeo\storage

Folders:
I:\Gr8BooksNeo\storage\local
I:\Gr8BooksNeo\storage\shared-dev
I:\Gr8BooksNeo\storage\staging

Public URL:
http://gr8booksneo-storage.integr8.com.ph

---

# Required Architecture

Use provider-based storage:

src/storage/
storage.module.ts
storage.service.ts
storage.types.ts
providers/
vps-storage.provider.ts
supabase-storage.provider.ts
internal/
vps-storage-internal.controller.ts
vps-storage-internal.service.ts

If some files already exist, refactor them cleanly.

---

# Environment

Local .env:

STORAGE_PROVIDER=vps
STORAGE_ENV=local
VPS_STORAGE_API_URL=http://gr8booksneo-storage.integr8.com.ph/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
VPS_STORAGE_SECRET=<secret>

Shared dev .env.shared-dev:

STORAGE_PROVIDER=vps
STORAGE_ENV=shared-dev
VPS_STORAGE_API_URL=http://gr8booksneo-storage.integr8.com.ph/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
VPS_STORAGE_SECRET=<secret>

Staging later on VPS:

STORAGE_PROVIDER=vps
STORAGE_ENV=staging
VPS_STORAGE_API_URL=http://gr8booksneo-storage.integr8.com.ph/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
VPS_STORAGE_SECRET=<secret>

VPS backend receiver env:

VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_PUBLIC_URL=http://gr8booksneo-storage.integr8.com.ph
VPS_STORAGE_SECRET=<same-secret>

Keep Supabase provider available for future production, but do not use it for local/shared/staging.

---

# VPS Provider Behavior

The normal backend provider must NOT write directly to disk.

When STORAGE_PROVIDER=vps, it should call:

POST {VPS_STORAGE_API_URL}/upload

Headers:
Authorization: Bearer ${VPS_STORAGE_SECRET}

Multipart form-data:
file
storageEnv
folder

storageEnv values:
local
shared-dev
staging

folder values:
company-logos
avatars
attachments
exports

Return:
relativePath
publicUrl
fileName
mimeType
size

Delete should call:

DELETE {VPS_STORAGE_API_URL}/file

Headers:
Authorization: Bearer ${VPS_STORAGE_SECRET}

JSON body:
{
"relativePath": "shared-dev/company-logos/file.png"
}

---

# Internal VPS Storage API

Create internal endpoints:

POST /api/v1/storage/internal/upload
DELETE /api/v1/storage/internal/file

These endpoints are the receiver that runs on the VPS backend.

They must:

- validate Authorization Bearer token
- require VPS_STORAGE_ROOT
- require VPS_STORAGE_PUBLIC_URL
- validate storageEnv
- validate folder
- sanitize filename
- prevent path traversal
- create missing folders
- write file under VPS_STORAGE_ROOT/storageEnv/folder
- delete only inside VPS_STORAGE_ROOT
- never expose physical disk paths

Upload example:

storageEnv=shared-dev
folder=avatars
file=jason.png

Save to:
I:\Gr8BooksNeo\storage\shared-dev\avatars\<generated-file>.png

Return:
{
"relativePath": "shared-dev/avatars/<generated-file>.png",
"publicUrl": "http://gr8booksneo-storage.integr8.com.ph/shared-dev/avatars/<generated-file>.png",
"fileName": "<generated-file>.png",
"mimeType": "image/png",
"size": 12345
}

---

# Existing Uploads To Refactor

Find current upload logic for:

- user avatar upload: POST /api/users/me/avatar
- company logo upload
- onboarding company logo upload

Refactor them to use StorageService only.

Do not call Supabase directly from feature modules anymore.

StorageService chooses provider based on STORAGE_PROVIDER.

---

# Important Rules

1. Do not remove Supabase support.
2. Do not use direct filesystem provider for local/shared/staging active path.
3. Do not store absolute paths in DB.
4. Store relativePath/publicUrl as current schema expects.
5. Preserve existing response shape so frontend does not break.
6. Add clear error logging when VPS upload fails, including upstream status code/body.
7. Do not make unrelated changes.

---

# Testing

Local:

1. Set STORAGE_PROVIDER=vps
2. Start local backend
3. Upload avatar
4. Expected:
   - no 502
   - file appears on VPS under I:\Gr8BooksNeo\storage\local\avatars
   - publicUrl opens in browser

Shared dev:

1. Set STORAGE_ENV=shared-dev
2. Upload avatar/logo
3. Expected:
   - file appears in I:\Gr8BooksNeo\storage\shared-dev\...

Staging later:

1. Set STORAGE_ENV=staging
2. Expected:
   - file appears in I:\Gr8BooksNeo\storage\staging\...

Supabase:

1. STORAGE_PROVIDER=supabase should still work.

After implementation, list changed files and how to test.
