CREATE TABLE "approval_rules" (
    "id" UUID NOT NULL,
    "company_id" INTEGER NOT NULL,
    "approver_setup_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "rule_type" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "amount_rule" TEXT NOT NULL,
    "amount" TEXT NOT NULL DEFAULT '',
    "approval_path" JSONB NOT NULL DEFAULT '[]',
    "module_scope" TEXT NOT NULL,
    "module_name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "description" TEXT NOT NULL DEFAULT '',
    "workflow_features" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

INSERT INTO "approval_rules" (
    "id",
    "company_id",
    "approver_setup_id",
    "sequence",
    "rule_type",
    "route_name",
    "amount_rule",
    "amount",
    "approval_path",
    "module_scope",
    "module_name",
    "status",
    "description",
    "workflow_features",
    "created_at",
    "updated_at"
)
SELECT
    "approval_routing_rules"."id",
    "approval_workflows"."company_id",
    COALESCE(
        (
            SELECT "approval_routing_rule_stages"."approver_setup_id"
            FROM "approval_routing_rule_stages"
            WHERE "approval_routing_rule_stages"."routing_rule_id" = "approval_routing_rules"."id"
            ORDER BY "approval_routing_rule_stages"."sequence" ASC
            LIMIT 1
        ),
        (
            SELECT "approver_setups"."id"
            FROM "approver_setups"
            WHERE "approver_setups"."workflow_id" = "approval_workflows"."id"
            ORDER BY "approver_setups"."level" ASC NULLS LAST, "approver_setups"."created_at" ASC
            LIMIT 1
        )
    ),
    "approval_routing_rules"."sequence",
    "approval_routing_rules"."basis",
    "approval_routing_rules"."name",
    "approval_routing_rules"."amount_operator",
    "approval_routing_rules"."amount_value",
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'approverSetupId', "approval_routing_rule_stages"."approver_setup_id",
                    'sequence', "approval_routing_rule_stages"."sequence"
                )
                ORDER BY "approval_routing_rule_stages"."sequence" ASC
            )
            FROM "approval_routing_rule_stages"
            WHERE "approval_routing_rule_stages"."routing_rule_id" = "approval_routing_rules"."id"
        ),
        '[]'::jsonb
    ),
    "approval_workflows"."module_code",
    "approval_workflows"."module_name",
    "approval_workflows"."status",
    "approval_workflows"."description",
    "approval_workflows"."workflow_features",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "approval_routing_rules"
INNER JOIN "approval_workflows"
    ON "approval_workflows"."id" = "approval_routing_rules"."workflow_id"
WHERE COALESCE(
    (
        SELECT "approval_routing_rule_stages"."approver_setup_id"
        FROM "approval_routing_rule_stages"
        WHERE "approval_routing_rule_stages"."routing_rule_id" = "approval_routing_rules"."id"
        ORDER BY "approval_routing_rule_stages"."sequence" ASC
        LIMIT 1
    ),
    (
        SELECT "approver_setups"."id"
        FROM "approver_setups"
        WHERE "approver_setups"."workflow_id" = "approval_workflows"."id"
        ORDER BY "approver_setups"."level" ASC NULLS LAST, "approver_setups"."created_at" ASC
        LIMIT 1
    )
) IS NOT NULL;

ALTER TABLE "approver_setup_users" ADD COLUMN "module_scope" TEXT NOT NULL DEFAULT '';

UPDATE "approver_setup_users"
SET "module_scope" = COALESCE("approver_setups"."module_scope", '')
FROM "approver_setups"
WHERE "approver_setup_users"."approver_setup_id" = "approver_setups"."id";

CREATE INDEX "approval_rules_approver_setup_id_idx" ON "approval_rules"("approver_setup_id");
CREATE INDEX "approval_rules_company_id_idx" ON "approval_rules"("company_id");
CREATE INDEX "approval_rules_module_scope_idx" ON "approval_rules"("module_scope");
CREATE INDEX "approval_rules_status_idx" ON "approval_rules"("status");

ALTER TABLE "approval_rules"
    ADD CONSTRAINT "approval_rules_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_rules"
    ADD CONSTRAINT "approval_rules_approver_setup_id_fkey"
    FOREIGN KEY ("approver_setup_id") REFERENCES "approver_setups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approver_setups" DROP CONSTRAINT "approver_setups_workflow_id_fkey";
DROP INDEX IF EXISTS "approver_setups_workflow_id_idx";
ALTER TABLE "approver_setups" DROP COLUMN "workflow_id";

ALTER TABLE "approval_routing_rule_stages" DROP CONSTRAINT "approval_routing_rule_stages_approver_setup_id_fkey";
ALTER TABLE "approval_routing_rule_stages" DROP CONSTRAINT "approval_routing_rule_stages_routing_rule_id_fkey";
DROP TABLE "approval_routing_rule_stages";
DROP TABLE "approval_routing_rules";
DROP TABLE "approval_workflows";
