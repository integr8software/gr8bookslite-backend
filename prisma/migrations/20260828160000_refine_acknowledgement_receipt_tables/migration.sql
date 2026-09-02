BEGIN;

ALTER TABLE "acknowledgement_receipts" DROP CONSTRAINT IF EXISTS "acknowledgement_receipts_term_id_fkey";

ALTER TABLE "acknowledgement_receipts"
  ADD COLUMN "payment_id" BIGINT,
  DROP COLUMN IF EXISTS "term_id",
  DROP COLUMN IF EXISTS "address_snapshot",
  DROP COLUMN IF EXISTS "contact_person_snapshot",
  DROP COLUMN IF EXISTS "contact_no_snapshot",
  DROP COLUMN IF EXISTS "business_style",
  DROP COLUMN IF EXISTS "project_code",
  DROP COLUMN IF EXISTS "project_name",
  DROP COLUMN IF EXISTS "project_ref",
  DROP COLUMN IF EXISTS "sales_associate",
  DROP COLUMN IF EXISTS "team_assigned";

CREATE INDEX "acknowledgement_receipts_payment_id_idx" ON "acknowledgement_receipts"("payment_id");

ALTER TABLE "acknowledgement_receipts"
  ADD CONSTRAINT "acknowledgement_receipts_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payment_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "acknowledgement_receipt_details"
  ADD COLUMN "party_code_snapshot" VARCHAR(80),
  ADD COLUMN "party_name_snapshot" VARCHAR(255),
  ADD COLUMN "reference_no" VARCHAR(120),
  ADD COLUMN "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "cwt_code" VARCHAR(80),
  ADD COLUMN "cwt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "total_received" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "acknowledgement_receipt_details" AS detail
SET
  "party_code_snapshot" = receipt."party_code_snapshot",
  "party_name_snapshot" = receipt."party_name_snapshot",
  "reference_no" = receipt."reference_no",
  "vat_percent" = CASE WHEN detail."gross_amount" <> 0 THEN ROUND(detail."vat_amount" / detail."gross_amount" * 100, 4) ELSE 0 END,
  "cwt_code" = detail."ewt_type",
  "cwt_percent" = CASE WHEN detail."gross_amount" <> 0 THEN ROUND(detail."ewt_amount" / detail."gross_amount" * 100, 4) ELSE 0 END,
  "total_received" = GREATEST(detail."gross_amount" - detail."ewt_amount", 0)
FROM "acknowledgement_receipts" AS receipt
WHERE receipt."id" = detail."acknowledgement_receipt_id";

ALTER TABLE "acknowledgement_receipt_details"
  DROP COLUMN IF EXISTS "quantity",
  DROP COLUMN IF EXISTS "amount",
  DROP COLUMN IF EXISTS "discount_percent",
  DROP COLUMN IF EXISTS "vatable",
  DROP COLUMN IF EXISTS "vat_inclusive",
  DROP COLUMN IF EXISTS "with_wvat",
  DROP COLUMN IF EXISTS "wvat_type",
  DROP COLUMN IF EXISTS "with_ewt",
  DROP COLUMN IF EXISTS "ewt_type",
  DROP COLUMN IF EXISTS "wvat_amount",
  DROP COLUMN IF EXISTS "discount_amount";

COMMIT;
