-- AlterTable
ALTER TABLE "approver_setups" ADD COLUMN "company_id" INTEGER;

-- Backfill existing local rows to their first approver's company when possible.
UPDATE "approver_setups" AS "setup"
SET "company_id" = "membership"."company_id"
FROM "approver_setup_users" AS "setup_user"
JOIN "memberships" AS "membership" ON "membership"."user_id" = "setup_user"."user_id"
WHERE "setup"."id" = "setup_user"."approver_setup_id"
  AND "setup"."company_id" IS NULL;

-- Remove rows that cannot be associated with a company.
DELETE FROM "approver_setups"
WHERE "company_id" IS NULL;

-- AlterTable
ALTER TABLE "approver_setups" ALTER COLUMN "company_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "approver_setups_company_id_idx" ON "approver_setups"("company_id");

-- AddForeignKey
ALTER TABLE "approver_setups" ADD CONSTRAINT "approver_setups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
