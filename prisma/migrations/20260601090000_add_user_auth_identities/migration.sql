CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE');

CREATE TABLE "user_auth_identities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_auth_identities_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_auth_identities" (
    "user_id",
    "provider",
    "provider_user_id",
    "email",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    'PASSWORD'::"AuthProvider",
    NULL,
    "email",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users";

CREATE UNIQUE INDEX "user_auth_identities_provider_provider_user_id_key" ON "user_auth_identities"("provider", "provider_user_id");
CREATE UNIQUE INDEX "user_auth_identities_user_id_provider_key" ON "user_auth_identities"("user_id", "provider");
CREATE INDEX "user_auth_identities_email_idx" ON "user_auth_identities"("email");

ALTER TABLE "user_auth_identities"
ADD CONSTRAINT "user_auth_identities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
