ALTER TABLE "accounts_payable_voucher_details"
  DROP CONSTRAINT IF EXISTS "accounts_payable_voucher_details_voucher_id_fkey";

ALTER TABLE "accounts_payable_vouchers"
  RENAME COLUMN "id" TO "apv_id";

ALTER TABLE "accounts_payable_voucher_details"
  RENAME COLUMN "voucher_id" TO "apv_id";

ALTER INDEX IF EXISTS "ap_voucher_details_voucher_line_key"
  RENAME TO "ap_voucher_details_apv_line_key";

ALTER TABLE "accounts_payable_voucher_details"
  ADD CONSTRAINT "accounts_payable_voucher_details_apv_id_fkey" FOREIGN KEY ("apv_id") REFERENCES "accounts_payable_vouchers"("apv_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journal_entry_header"
  ADD COLUMN "jeno" BIGINT;

WITH numbered_headers AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "company_id" ORDER BY "id")::BIGINT AS "next_jeno"
  FROM "journal_entry_header"
)
UPDATE "journal_entry_header"
SET "jeno" = numbered_headers."next_jeno"
FROM numbered_headers
WHERE "journal_entry_header"."id" = numbered_headers."id";

ALTER TABLE "journal_entry_header"
  ALTER COLUMN "jeno" SET NOT NULL;

CREATE UNIQUE INDEX "journal_entry_header_company_jeno_key"
  ON "journal_entry_header"("company_id", "jeno");

ALTER TABLE "journal_entry_detail"
  ADD COLUMN "company_id" INTEGER,
  ADD COLUMN "jeno" BIGINT;

UPDATE "journal_entry_detail"
SET
  "company_id" = "journal_entry_header"."company_id",
  "jeno" = "journal_entry_header"."jeno"
FROM "journal_entry_header"
WHERE "journal_entry_detail"."journal_entry_header_id" = "journal_entry_header"."id";

ALTER TABLE "journal_entry_detail"
  ALTER COLUMN "company_id" SET NOT NULL,
  ALTER COLUMN "jeno" SET NOT NULL;

ALTER TABLE "journal_entry_detail"
  DROP CONSTRAINT IF EXISTS "journal_entry_detail_journal_entry_header_id_fkey";

DROP INDEX IF EXISTS "journal_entry_detail_journal_entry_header_id_idx";
DROP INDEX IF EXISTS "journal_entry_detail_journal_entry_header_id_line_number_key";

ALTER TABLE "journal_entry_detail"
  DROP COLUMN "journal_entry_header_id";

CREATE INDEX "journal_entry_detail_company_jeno_idx"
  ON "journal_entry_detail"("company_id", "jeno");

CREATE UNIQUE INDEX "journal_entry_detail_company_jeno_line_key"
  ON "journal_entry_detail"("company_id", "jeno", "line_number");

ALTER TABLE "journal_entry_detail"
  ADD CONSTRAINT "journal_entry_detail_company_id_jeno_fkey" FOREIGN KEY ("company_id", "jeno") REFERENCES "journal_entry_header"("company_id", "jeno") ON DELETE CASCADE ON UPDATE CASCADE;
