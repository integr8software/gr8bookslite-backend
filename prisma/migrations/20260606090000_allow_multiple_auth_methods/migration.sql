ALTER TABLE "users"
ALTER COLUMN "password_hash" DROP NOT NULL;

UPDATE "users" AS "user"
SET "password_hash" = NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "user_auth_identities" AS "identity"
  WHERE "identity"."user_id" = "user"."id"
    AND "identity"."provider" = 'PASSWORD'::"AuthProvider"
);

DELETE FROM "user_auth_identities"
WHERE "provider" = 'PASSWORD'::"AuthProvider";

ALTER TYPE "AuthProvider" RENAME TO "AuthProvider_old";
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

ALTER TABLE "user_auth_identities"
ALTER COLUMN "provider" TYPE "AuthProvider"
USING ("provider"::text::"AuthProvider");

DROP TYPE "AuthProvider_old";

CREATE TABLE "auth_session_handoffs" (
  "id" SERIAL NOT NULL,
  "code_hash" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_session_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_session_handoffs_code_hash_key"
ON "auth_session_handoffs"("code_hash");

CREATE INDEX "auth_session_handoffs_expires_at_idx"
ON "auth_session_handoffs"("expires_at");
