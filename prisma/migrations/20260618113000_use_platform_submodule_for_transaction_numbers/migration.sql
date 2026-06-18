ALTER TABLE "transaction_number_sequences"
ADD COLUMN "platform_submodule_id" INTEGER;

UPDATE "transaction_number_sequences" AS sequence
SET "platform_submodule_id" = permission."submodule_id"
FROM "permissions" AS permission
WHERE permission."id" = sequence."permission_id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "transaction_number_sequences"
    WHERE "platform_submodule_id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot migrate transaction number sequences without a platform submodule.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "transaction_number_sequences"
    GROUP BY "platform_submodule_id", "branch_unit_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot migrate duplicate transaction number sequences for the same platform submodule and branch.';
  END IF;
END
$$;

ALTER TABLE "transaction_number_sequences"
DROP CONSTRAINT "transaction_number_sequences_permission_id_fkey";

DROP INDEX "transaction_number_sequences_permission_id_branch_unit_id_key";
DROP INDEX "transaction_number_sequences_permission_id_idx";

ALTER TABLE "transaction_number_sequences"
ALTER COLUMN "platform_submodule_id" SET NOT NULL,
DROP COLUMN "permission_id";

CREATE UNIQUE INDEX
"transaction_number_sequences_platform_submodule_id_branch_unit_id_key"
ON "transaction_number_sequences"("platform_submodule_id", "branch_unit_id");

CREATE INDEX
"transaction_number_sequences_platform_submodule_id_idx"
ON "transaction_number_sequences"("platform_submodule_id");

ALTER TABLE "transaction_number_sequences"
ADD CONSTRAINT "transaction_number_sequences_platform_submodule_id_fkey"
FOREIGN KEY ("platform_submodule_id")
REFERENCES "platform_submodules"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
