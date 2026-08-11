ALTER TABLE "approver_setups" ADD COLUMN "level_name" TEXT;

UPDATE "approver_setups"
SET "level_name" = CASE
    WHEN "level" IS NOT NULL THEN 'Level ' || "level"::text
    ELSE 'Approval Level'
END;

ALTER TABLE "approver_setups" ALTER COLUMN "level_name" SET NOT NULL;
ALTER TABLE "approver_setups" DROP COLUMN "approval_requirement";
