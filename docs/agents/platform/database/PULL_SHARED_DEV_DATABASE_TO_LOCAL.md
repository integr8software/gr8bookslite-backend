# Pull Shared Development Database To Local

Project: Gr8Books Neo Backend

## Purpose

Use this workflow when a developer wants to copy the latest shared development database into their local machine.

This copies:

- database schema
- migrations
- users
- companies
- permissions
- test/demo data

Flow:

```txt
Shared Development Database
(VPS PostgreSQL)

server1.integr8.com.ph
gr8booksneo_shared_dev

        ↓

Local Developer Database

localhost
gr8booksneo_dev
```

---

# When To Use This

Use this when:

- joining the project for the first time
- needing the latest shared test data
- debugging an issue from shared development
- refreshing local demo data

---

# When NOT To Use This

Do NOT use this for normal schema updates.

For schema changes use:

```bash
git pull

npm run db:migrate:local
```

Normal database structure changes should come from Prisma migrations.

---

# Step 1: Dump Shared Development Database

Run from your local machine.

Example: Mac Terminal

```bash
pg_dump \
  -h server1.integr8.com.ph \
  -p 5432 \
  -U gr8books_dev \
  -d gr8booksneo_shared_dev \
  -Fc \
  --no-owner \
  --no-acl \
  -f ~/Desktop/gr8booksneo_shared_dev.dump
```

Enter database password when requested.

This creates:

```txt
~/Desktop/gr8booksneo_shared_dev.dump
```

Verify:

```bash
ls -lh ~/Desktop/gr8booksneo_shared_dev.dump
```

---

# Step 2: Backup Current Local Database (Recommended)

Before replacing local data, create a backup.

```bash
pg_dump \
  -h localhost \
  -p 5432 \
  -U integr8 \
  -d gr8booksneo_dev \
  -Fc \
  --no-owner \
  --no-acl \
  -f ~/Desktop/gr8booksneo_local_backup.dump
```

This allows restoring your previous local state.

---

# Step 3: Clear Local Database

Connect:

```bash
psql \
-h localhost \
-U integr8 \
-d gr8booksneo_dev
```

Inside PostgreSQL:

```sql
DROP SCHEMA public CASCADE;

CREATE SCHEMA public;

ALTER SCHEMA public OWNER TO integr8;

GRANT ALL ON SCHEMA public TO integr8;

\q
```

Your local database is now empty.

---

# Step 4: Restore Shared Database Into Local

Run:

```bash
pg_restore \
  -h localhost \
  -U integr8 \
  -d gr8booksneo_dev \
  --no-owner \
  --no-acl \
  ~/Desktop/gr8booksneo_shared_dev.dump
```

---

# Step 5: Verify Restore

Connect:

```bash
psql \
-h localhost \
-U integr8 \
-d gr8booksneo_dev
```

Check tables:

```sql
\dt
```

Check Prisma migrations:

```sql
SELECT COUNT(*)
FROM "_prisma_migrations";
```

Exit:

```sql
\q
```

---

# Step 6: Run Backend Locally

Make sure `.env` uses local PostgreSQL:

```env
DATABASE_URL="postgresql://integr8@localhost:5432/gr8booksneo_dev?schema=public"

DIRECT_URL="postgresql://integr8@localhost:5432/gr8booksneo_dev?schema=public"
```

Start backend:

```bash
npm run dev
```

---

# Daily Developer Workflow

After this initial sync, normally use:

```bash
git pull

npm install

npm run db:migrate:local

npm run dev
```

---

# Important Rules

## Use Prisma migrations for:

- adding columns
- changing tables
- updating relationships
- permission code changes
- production changes

Example:

```txt
schema.prisma
      ↓
migration.sql
      ↓
shared/staging/production
```

---

## Use pg_dump / pg_restore for:

- cloning databases
- refreshing local data
- backups
- debugging shared issues

---

# Quick Commands

## Pull shared database to local

```bash
pg_dump -h server1.integr8.com.ph -U gr8books_dev -d gr8booksneo_shared_dev -Fc --no-owner --no-acl -f ~/Desktop/gr8booksneo_shared_dev.dump
```

Clear local:

```bash
psql -h localhost -U integr8 -d gr8booksneo_dev
```

Restore:

```bash
pg_restore -h localhost -U integr8 -d gr8booksneo_dev --no-owner --no-acl ~/Desktop/gr8booksneo_shared_dev.dump
```

Done.

Local database now matches shared development.
