CREATE TABLE "approval_transactions" (
    "id" UUID NOT NULL,
    "company_id" INTEGER NOT NULL,
    "module_scope" TEXT NOT NULL,
    "reference_no" TEXT NOT NULL,
    "rule_id" UUID NOT NULL,
    "amount" DECIMAL(18, 2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'For Approval',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_transaction_approvers" (
    "transaction_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "approval_transaction_approvers_pkey" PRIMARY KEY ("transaction_id", "user_id")
);

CREATE UNIQUE INDEX "approval_transactions_company_id_module_scope_reference_no_key"
    ON "approval_transactions"("company_id", "module_scope", "reference_no");
CREATE INDEX "approval_transactions_company_id_idx" ON "approval_transactions"("company_id");
CREATE INDEX "approval_transactions_module_scope_idx" ON "approval_transactions"("module_scope");
CREATE INDEX "approval_transactions_rule_id_idx" ON "approval_transactions"("rule_id");
CREATE INDEX "approval_transactions_status_idx" ON "approval_transactions"("status");

CREATE INDEX "approval_transaction_approvers_user_id_idx" ON "approval_transaction_approvers"("user_id");
CREATE INDEX "approval_transaction_approvers_sequence_idx" ON "approval_transaction_approvers"("sequence");
CREATE INDEX "approval_transaction_approvers_status_idx" ON "approval_transaction_approvers"("status");

ALTER TABLE "approval_transactions"
    ADD CONSTRAINT "approval_transactions_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_transactions"
    ADD CONSTRAINT "approval_transactions_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "approval_rules"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_transaction_approvers"
    ADD CONSTRAINT "approval_transaction_approvers_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "approval_transactions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_transaction_approvers"
    ADD CONSTRAINT "approval_transaction_approvers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
