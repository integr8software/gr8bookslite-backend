CREATE TABLE "approval_workflows" (
    "id" UUID NOT NULL,
    "company_id" INTEGER NOT NULL,
    "module_code" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "description" TEXT NOT NULL DEFAULT '',
    "workflow_features" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_workflow_stages" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "requirement" TEXT NOT NULL DEFAULT 'any',

    CONSTRAINT "approval_workflow_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_workflow_stage_approvers" (
    "stage_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "approval_workflow_stage_approvers_pkey" PRIMARY KEY ("stage_id","user_id")
);

CREATE TABLE "approval_routing_rules" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "amount_operator" TEXT NOT NULL,
    "amount_value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "approval_routing_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_routing_rule_stages" (
    "routing_rule_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "approval_routing_rule_stages_pkey" PRIMARY KEY ("routing_rule_id","stage_id")
);

CREATE UNIQUE INDEX "approval_workflows_company_id_module_code_key" ON "approval_workflows"("company_id", "module_code");
CREATE INDEX "approval_workflows_company_id_idx" ON "approval_workflows"("company_id");
CREATE INDEX "approval_workflows_module_code_idx" ON "approval_workflows"("module_code");
CREATE INDEX "approval_workflows_status_idx" ON "approval_workflows"("status");

CREATE UNIQUE INDEX "approval_workflow_stages_workflow_id_sequence_key" ON "approval_workflow_stages"("workflow_id", "sequence");
CREATE INDEX "approval_workflow_stages_workflow_id_idx" ON "approval_workflow_stages"("workflow_id");

CREATE INDEX "approval_workflow_stage_approvers_user_id_idx" ON "approval_workflow_stage_approvers"("user_id");

CREATE UNIQUE INDEX "approval_routing_rules_workflow_id_sequence_key" ON "approval_routing_rules"("workflow_id", "sequence");
CREATE INDEX "approval_routing_rules_workflow_id_idx" ON "approval_routing_rules"("workflow_id");

CREATE INDEX "approval_routing_rule_stages_stage_id_idx" ON "approval_routing_rule_stages"("stage_id");

ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_workflow_stages" ADD CONSTRAINT "approval_workflow_stages_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_workflow_stage_approvers" ADD CONSTRAINT "approval_workflow_stage_approvers_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "approval_workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_workflow_stage_approvers" ADD CONSTRAINT "approval_workflow_stage_approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_routing_rules" ADD CONSTRAINT "approval_routing_rules_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_routing_rule_stages" ADD CONSTRAINT "approval_routing_rule_stages_routing_rule_id_fkey" FOREIGN KEY ("routing_rule_id") REFERENCES "approval_routing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_routing_rule_stages" ADD CONSTRAINT "approval_routing_rule_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "approval_workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
