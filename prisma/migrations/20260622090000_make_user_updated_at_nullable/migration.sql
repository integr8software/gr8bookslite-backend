ALTER TABLE "users" ALTER COLUMN "updated_at" DROP NOT NULL;

UPDATE "users"
SET "updated_at" = NULL
WHERE "updated_at" = "created_at";
