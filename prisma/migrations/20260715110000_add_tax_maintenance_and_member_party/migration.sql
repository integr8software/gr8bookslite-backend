-- AlterEnum
ALTER TYPE "PartyType" ADD VALUE IF NOT EXISTS 'MEMBER';

-- ReplaceEnum
CREATE TYPE "PaymentTypeClassification_new" AS ENUM (
    'CASH',
    'CHECK',
    'BANK_TRANSFER',
    'DIGITAL_WALLET',
    'NON_CASH_SETTLEMENT'
);

ALTER TABLE "payment_types"
    ALTER COLUMN "classification" TYPE "PaymentTypeClassification_new"
    USING (
        CASE "classification"::text
            WHEN 'WITH_BANK' THEN 'BANK_TRANSFER'
            WHEN 'MULTIPLE_CHECK' THEN 'CHECK'
            WHEN 'ONLINE_PAYMENT' THEN 'DIGITAL_WALLET'
            WHEN 'DEBIT' THEN 'NON_CASH_SETTLEMENT'
            ELSE "classification"::text
        END
    )::"PaymentTypeClassification_new";

DROP TYPE "PaymentTypeClassification";
ALTER TYPE "PaymentTypeClassification_new" RENAME TO "PaymentTypeClassification";

-- CreateEnum
CREATE TYPE "TaxMaintenanceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "tax_maintenance" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "percentage" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "input_vat_account_id" BIGINT,
    "output_vat_account_id" BIGINT,
    "vat_payable_account_id" BIGINT,
    "deferred_input_tax_account_id" BIGINT,
    "deferred_output_vat_account_id" BIGINT,
    "status" "TaxMaintenanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_maintenance_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "parties" ADD COLUMN "vat_registration_type_id" BIGINT,
ADD COLUMN "honorific" VARCHAR(80),
ADD COLUMN "gender" VARCHAR(40),
ADD COLUMN "civil_status" VARCHAR(40),
ADD COLUMN "nationality" VARCHAR(80),
ADD COLUMN IF NOT EXISTS "landline" VARCHAR(40),
ADD COLUMN "member_registration_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payment_types"
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "tax_maintenance_company_name_key" ON "tax_maintenance"("company_id", "name");

-- CreateIndex
CREATE INDEX "tax_maintenance_company_status_idx" ON "tax_maintenance"("company_id", "status");

-- CreateIndex
CREATE INDEX "tax_maintenance_input_vat_account_id_idx" ON "tax_maintenance"("input_vat_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_output_vat_account_id_idx" ON "tax_maintenance"("output_vat_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_vat_payable_account_id_idx" ON "tax_maintenance"("vat_payable_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_deferred_input_tax_account_id_idx" ON "tax_maintenance"("deferred_input_tax_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_deferred_output_vat_account_id_idx" ON "tax_maintenance"("deferred_output_vat_account_id");

-- CreateIndex
CREATE INDEX "parties_vat_registration_type_id_idx" ON "parties"("vat_registration_type_id");

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_input_vat_account_id_fkey" FOREIGN KEY ("input_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_output_vat_account_id_fkey" FOREIGN KEY ("output_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_vat_payable_account_id_fkey" FOREIGN KEY ("vat_payable_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_deferred_input_tax_account_id_fkey" FOREIGN KEY ("deferred_input_tax_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_deferred_output_vat_account_id_fkey" FOREIGN KEY ("deferred_output_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_vat_registration_type_id_fkey" FOREIGN KEY ("vat_registration_type_id") REFERENCES "tax_maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- UpdateData
UPDATE "payment_types" p
SET "name" = 'Internal Bank Transfer',
    "description" = 'Transfer between bank accounts within the same company.'
WHERE p."name" = 'Bank Transfer within Company'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('Internal Bank Transfer')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types" p
SET "name" = 'Intercompany Bank Transfer',
    "description" = 'Transfer from a company bank account to another company.'
WHERE p."name" = 'Bank Transfer for Another Company'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('Intercompany Bank Transfer')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types" p
SET "name" = 'PESONet',
    "description" = 'Electronic fund transfer through PESONet.'
WHERE p."name" = 'PesoNet'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('PESONet')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types" p
SET "name" = 'E-Wallet',
    "description" = 'Digital wallet payment through an e-wallet provider.'
WHERE lower(p."name") IN ('ewallet', 'e-wallet')
  AND p."name" <> 'E-Wallet'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('E-Wallet')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types"
SET "classification" = 'BANK_TRANSFER'
WHERE "name" IN (
  'Internal Bank Transfer',
  'Intercompany Bank Transfer',
  'InstaPay',
  'PESONet',
  'Bank Transfer within Company',
  'Bank Transfer for Another Company',
  'PesoNet'
);

UPDATE "payment_types"
SET "classification" = 'CASH'
WHERE "name" = 'Cash';

UPDATE "payment_types"
SET "classification" = 'CHECK'
WHERE "name" IN ('Check', 'Manager''s Check');

UPDATE "payment_types"
SET "classification" = 'DIGITAL_WALLET'
WHERE lower("name") IN ('ewallet', 'e-wallet');

UPDATE "payment_types"
SET "classification" = 'NON_CASH_SETTLEMENT'
WHERE "name" = 'Debit Memo';

UPDATE "payment_types"
SET "sort_order" = CASE
  WHEN "name" = 'Internal Bank Transfer' THEN 10
  WHEN "name" = 'Intercompany Bank Transfer' THEN 20
  WHEN "name" = 'InstaPay' THEN 30
  WHEN "name" = 'PESONet' THEN 40
  WHEN "name" = 'Cash' THEN 50
  WHEN "name" = 'Check' THEN 60
  WHEN "name" = 'Manager''s Check' THEN 70
  WHEN "name" = 'E-Wallet' THEN 80
  WHEN "name" = 'Debit Memo' THEN 90
  ELSE 1000
END;

WITH ordered_payment_types AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "company_id"
      ORDER BY
        "sort_order" ASC,
        lower("name") ASC,
        "id" ASC
    ) * 10 AS next_sort_order
  FROM "payment_types"
)
UPDATE "payment_types" p
SET "sort_order" = ordered_payment_types.next_sort_order
FROM ordered_payment_types
WHERE p."id" = ordered_payment_types."id";

-- CreateIndex
CREATE INDEX "payment_types_company_sort_order_idx"
  ON "payment_types"("company_id", "sort_order");
