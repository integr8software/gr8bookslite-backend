ALTER TABLE "approver_setup_users" ADD COLUMN "sequence" INTEGER;

WITH numbered_users AS (
    SELECT
        "approver_setup_id",
        "user_id",
        ROW_NUMBER() OVER (
            PARTITION BY "approver_setup_id"
            ORDER BY "user_id" ASC
        ) AS "next_sequence"
    FROM "approver_setup_users"
)
UPDATE "approver_setup_users"
SET "sequence" = "numbered_users"."next_sequence"
FROM "numbered_users"
WHERE "approver_setup_users"."approver_setup_id" = "numbered_users"."approver_setup_id"
  AND "approver_setup_users"."user_id" = "numbered_users"."user_id";

ALTER TABLE "approver_setup_users" ALTER COLUMN "sequence" SET NOT NULL;
ALTER TABLE "approver_setup_users" ALTER COLUMN "sequence" SET DEFAULT 1;

ALTER TABLE "approval_rules" DROP COLUMN "sequence";
