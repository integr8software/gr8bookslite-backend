CREATE TYPE "PermissionTargetType" AS ENUM ('MODULE', 'SUBMODULE');

CREATE TABLE "platform_submodules" (
  "id" SERIAL NOT NULL,
  "module_id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "route" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_submodules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_submodules_code_key"
  ON "platform_submodules"("code");
CREATE UNIQUE INDEX "platform_submodules_id_module_id_key"
  ON "platform_submodules"("id", "module_id");
CREATE INDEX "platform_submodules_module_id_is_active_sort_order_idx"
  ON "platform_submodules"("module_id", "is_active", "sort_order");

ALTER TABLE "platform_submodules"
  ADD CONSTRAINT "platform_submodules_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "permissions"
  ADD COLUMN "target_type" "PermissionTargetType" NOT NULL DEFAULT 'MODULE',
  ADD COLUMN "submodule_id" INTEGER;

ALTER TABLE "permissions"
  ALTER COLUMN "module_id" DROP NOT NULL;

DROP INDEX IF EXISTS "permissions_module_id_code_key";

ALTER TABLE "permissions"
  ADD CONSTRAINT "permissions_submodule_id_fkey"
  FOREIGN KEY ("submodule_id") REFERENCES "platform_submodules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "permissions"
  ADD CONSTRAINT "permissions_submodule_id_module_id_fkey"
  FOREIGN KEY ("submodule_id", "module_id")
  REFERENCES "platform_submodules"("id", "module_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "permissions_submodule_id_is_active_idx"
  ON "permissions"("submodule_id", "is_active");
CREATE INDEX "permissions_target_type_is_active_idx"
  ON "permissions"("target_type", "is_active");

INSERT INTO "platform_submodules" (
  "module_id",
  "code",
  "name",
  "sort_order",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "permission"."module_id",
  "permission"."code",
  "permission"."name",
  ROW_NUMBER() OVER (
    PARTITION BY "permission"."module_id"
    ORDER BY "permission"."name", "permission"."id"
  ) * 10,
  "permission"."is_active",
  "permission"."created_at",
  CURRENT_TIMESTAMP
FROM "permissions" AS "permission"
WHERE "permission"."module_id" IS NOT NULL
ON CONFLICT ("code") DO UPDATE
SET
  "module_id" = EXCLUDED."module_id",
  "name" = EXCLUDED."name",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "permissions" AS "permission"
SET
  "target_type" = 'SUBMODULE',
  "submodule_id" = "submodule"."id",
  "updated_at" = CURRENT_TIMESTAMP
FROM "platform_submodules" AS "submodule"
WHERE "submodule"."code" = "permission"."code";

ALTER TABLE "permissions"
  ADD CONSTRAINT "permissions_target_required_check"
  CHECK (
    (
      "target_type" = 'MODULE'
      AND "module_id" IS NOT NULL
      AND "submodule_id" IS NULL
    )
    OR (
      "target_type" = 'SUBMODULE'
      AND "module_id" IS NOT NULL
      AND "submodule_id" IS NOT NULL
    )
  );

ALTER TABLE "company_role_permissions"
  ADD COLUMN "can_cancel" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_uncancel" BOOLEAN NOT NULL DEFAULT false;

UPDATE "company_role_permissions"
SET "can_cancel" = "can_delete"
WHERE "can_delete" = true;

ALTER TABLE "membership_permissions"
  ADD COLUMN "can_cancel" BOOLEAN,
  ADD COLUMN "can_uncancel" BOOLEAN;

UPDATE "membership_permissions"
SET "can_cancel" = "can_delete"
WHERE "can_delete" IS NOT NULL;
