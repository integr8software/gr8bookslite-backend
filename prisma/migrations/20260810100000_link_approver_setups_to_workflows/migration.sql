ALTER TABLE "approver_setups" ADD COLUMN "workflow_id" UUID;
ALTER TABLE "approver_setups" ADD COLUMN "approval_requirement" TEXT NOT NULL DEFAULT 'any';
ALTER TABLE "approver_setup_users" ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 1;

INSERT INTO "approver_setups" (
    "id",
    "company_id",
    "workflow_id",
    "approver_condition",
    "approval_requirement",
    "type",
    "status",
    "level",
    "module_scope",
    "valid_until",
    "created_at",
    "updated_at"
)
SELECT
    "approval_workflow_stages"."id",
    "approval_workflows"."company_id",
    "approval_workflows"."id",
    "approval_workflow_stages"."name",
    "approval_workflow_stages"."requirement",
    'Workflow',
    "approval_workflows"."status",
    "approval_workflow_stages"."sequence",
    "approval_workflows"."module_code",
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "approval_workflow_stages"
INNER JOIN "approval_workflows"
    ON "approval_workflows"."id" = "approval_workflow_stages"."workflow_id"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "approver_setup_users" (
    "approver_setup_id",
    "user_id",
    "sequence"
)
SELECT
    "stage_id",
    "user_id",
    "sequence"
FROM "approval_workflow_stage_approvers"
ON CONFLICT ("approver_setup_id", "user_id") DO UPDATE
SET "sequence" = EXCLUDED."sequence";

ALTER TABLE "approval_routing_rule_stages" ADD COLUMN "approver_setup_id" UUID;

UPDATE "approval_routing_rule_stages"
SET "approver_setup_id" = "stage_id";

ALTER TABLE "approval_routing_rule_stages" ALTER COLUMN "approver_setup_id" SET NOT NULL;

ALTER TABLE "approval_routing_rule_stages" DROP CONSTRAINT "approval_routing_rule_stages_pkey";
ALTER TABLE "approval_routing_rule_stages" DROP CONSTRAINT "approval_routing_rule_stages_stage_id_fkey";
DROP INDEX IF EXISTS "approval_routing_rule_stages_stage_id_idx";

ALTER TABLE "approval_routing_rule_stages" DROP COLUMN "stage_id";

ALTER TABLE "approval_routing_rule_stages"
    ADD CONSTRAINT "approval_routing_rule_stages_pkey" PRIMARY KEY ("routing_rule_id", "approver_setup_id");

CREATE INDEX "approval_routing_rule_stages_approver_setup_id_idx"
    ON "approval_routing_rule_stages"("approver_setup_id");

CREATE INDEX "approver_setups_workflow_id_idx"
    ON "approver_setups"("workflow_id");

ALTER TABLE "approver_setups"
    ADD CONSTRAINT "approver_setups_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "approval_workflows"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_routing_rule_stages"
    ADD CONSTRAINT "approval_routing_rule_stages_approver_setup_id_fkey"
    FOREIGN KEY ("approver_setup_id") REFERENCES "approver_setups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "approval_workflow_stage_approvers";
DROP TABLE "approval_workflow_stages";
