CREATE TABLE "journal_entry_header" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "branch_unit_id" INTEGER NOT NULL,
  "reference_type" VARCHAR(20) NOT NULL,
  "reference_id" BIGINT NOT NULL,
  "reference_no" VARCHAR(120),
  "transaction_date" TIMESTAMP(3) NOT NULL,
  "currency_code" VARCHAR(10) NOT NULL,
  "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
  "particulars" VARCHAR(500),
  "total_debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total_credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'Draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "journal_entry_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_entry_detail" (
  "id" BIGSERIAL NOT NULL,
  "journal_entry_header_id" BIGINT NOT NULL,
  "line_number" INTEGER NOT NULL,
  "account_id" BIGINT NOT NULL,
  "account_code_snapshot" VARCHAR(20) NOT NULL,
  "account_title_snapshot" VARCHAR(250) NOT NULL,
  "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "vat_type" VARCHAR(80),
  "atc_code" VARCHAR(80),
  "party_code_snapshot" VARCHAR(80),
  "party_name_snapshot" VARCHAR(255),
  "responsibility_center_id" BIGINT,
  "responsibility_center_snapshot" VARCHAR(150),
  "ref_no" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "journal_entry_detail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "journal_entry_header_reference_key" ON "journal_entry_header"("company_id", "branch_unit_id", "reference_type", "reference_id");
CREATE INDEX "journal_entry_header_company_id_branch_unit_id_idx" ON "journal_entry_header"("company_id", "branch_unit_id");
CREATE INDEX "journal_entry_header_reference_type_reference_id_idx" ON "journal_entry_header"("reference_type", "reference_id");

CREATE UNIQUE INDEX "journal_entry_detail_journal_entry_header_id_line_number_key" ON "journal_entry_detail"("journal_entry_header_id", "line_number");
CREATE INDEX "journal_entry_detail_journal_entry_header_id_idx" ON "journal_entry_detail"("journal_entry_header_id");
CREATE INDEX "journal_entry_detail_account_id_idx" ON "journal_entry_detail"("account_id");
CREATE INDEX "journal_entry_detail_responsibility_center_id_idx" ON "journal_entry_detail"("responsibility_center_id");

ALTER TABLE "journal_entry_header"
  ADD CONSTRAINT "journal_entry_header_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "journal_entry_header_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "journal_entry_detail"
  ADD CONSTRAINT "journal_entry_detail_journal_entry_header_id_fkey" FOREIGN KEY ("journal_entry_header_id") REFERENCES "journal_entry_header"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "journal_entry_detail_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "journal_entry_detail_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "journal_entry_header" (
  "company_id",
  "branch_unit_id",
  "reference_type",
  "reference_id",
  "reference_no",
  "transaction_date",
  "currency_code",
  "exchange_rate",
  "particulars",
  "total_debit",
  "total_credit",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  journal_entries."company_id",
  journal_entries."branch_unit_id",
  journal_entries."reference_type",
  journal_entries."reference_id",
  MAX(journal_entries."reference_no_snapshot"),
  COALESCE(MAX(accounts_payable_vouchers."document_date")::timestamp, MIN(journal_entries."created_at")),
  MAX(journal_entries."currency_code"),
  COALESCE(MAX(journal_entries."exchange_rate"), 1),
  (ARRAY_AGG(journal_entries."particulars" ORDER BY journal_entries."line_number") FILTER (WHERE journal_entries."particulars" IS NOT NULL))[1],
  COALESCE(SUM(journal_entries."debit"), 0),
  COALESCE(SUM(journal_entries."credit"), 0),
  CASE MAX(accounts_payable_vouchers."status"::text)
    WHEN 'APPROVED' THEN 'For Approval'
    WHEN 'CLOSED' THEN 'Posted'
    WHEN 'DISAPPROVED' THEN 'Disapproved'
    WHEN 'CANCELLED' THEN 'Cancelled'
    ELSE 'Draft'
  END,
  MIN(journal_entries."created_at"),
  MAX(journal_entries."updated_at")
FROM "journal_entries" journal_entries
LEFT JOIN "accounts_payable_vouchers" accounts_payable_vouchers
  ON accounts_payable_vouchers."id" = journal_entries."reference_id"
  AND journal_entries."reference_type" = 'APV'
GROUP BY
  journal_entries."company_id",
  journal_entries."branch_unit_id",
  journal_entries."reference_type",
  journal_entries."reference_id";

INSERT INTO "journal_entry_detail" (
  "journal_entry_header_id",
  "line_number",
  "account_id",
  "account_code_snapshot",
  "account_title_snapshot",
  "debit",
  "credit",
  "vat_type",
  "atc_code",
  "party_code_snapshot",
  "party_name_snapshot",
  "responsibility_center_id",
  "responsibility_center_snapshot",
  "ref_no",
  "created_at",
  "updated_at"
)
SELECT
  journal_entry_header."id",
  journal_entries."line_number",
  journal_entries."account_id",
  journal_entries."account_code_snapshot",
  journal_entries."account_title_snapshot",
  journal_entries."debit",
  journal_entries."credit",
  journal_entries."vat_type",
  journal_entries."atc_code",
  journal_entries."party_code_snapshot",
  journal_entries."party_name_snapshot",
  journal_entries."responsibility_center_id",
  journal_entries."responsibility_center_snapshot",
  journal_entries."ref_no",
  journal_entries."created_at",
  journal_entries."updated_at"
FROM "journal_entries" journal_entries
INNER JOIN "journal_entry_header" journal_entry_header
  ON journal_entry_header."company_id" = journal_entries."company_id"
  AND journal_entry_header."branch_unit_id" = journal_entries."branch_unit_id"
  AND journal_entry_header."reference_type" = journal_entries."reference_type"
  AND journal_entry_header."reference_id" = journal_entries."reference_id";

DROP TABLE "journal_entries";
