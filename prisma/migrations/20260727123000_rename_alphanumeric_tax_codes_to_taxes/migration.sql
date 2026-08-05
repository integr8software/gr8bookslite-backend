DROP TABLE IF EXISTS "transaction_tax_lines" CASCADE;
DROP TABLE IF EXISTS "company_tax_configurations" CASCADE;
DROP TABLE IF EXISTS "tax_rate_versions" CASCADE;
DROP TABLE IF EXISTS "tax_maintenance" CASCADE;
DROP TABLE IF EXISTS "tax_posting_rules" CASCADE;

ALTER TABLE IF EXISTS "alphanumeric_tax_codes" RENAME TO "taxes";

CREATE TABLE IF NOT EXISTS "tax_posting_rules" (
  "id" BIGSERIAL PRIMARY KEY,
  "tax_id" INTEGER NOT NULL,
  "transaction_scope" "TaxTransactionScope" NOT NULL,
  "posting_event" "TaxPostingEvent" NOT NULL DEFAULT 'RECOGNITION',
  "account_role" VARCHAR(100) NOT NULL,
  "entry_side" "TaxEntrySide" NOT NULL,
  "amount_source" "TaxAmountSource" NOT NULL DEFAULT 'TAX_AMOUNT',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tax_posting_rules_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "taxes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_posting_rules_tax_scope_event_role_key"
ON "tax_posting_rules"("tax_id", "transaction_scope", "posting_event", "account_role");

CREATE INDEX IF NOT EXISTS "tax_posting_rules_resolution_idx"
ON "tax_posting_rules"("tax_id", "transaction_scope", "posting_event", "is_active");

DROP TYPE IF EXISTS "TaxMaintenanceStatus";
DROP TYPE IF EXISTS "TaxSystem";
DROP TYPE IF EXISTS "TaxTreatment";
DROP TYPE IF EXISTS "TaxCalculationMethod";
DROP TYPE IF EXISTS "TaxTransactionLineType";
