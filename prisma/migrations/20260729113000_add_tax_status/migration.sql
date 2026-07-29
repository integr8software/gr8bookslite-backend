CREATE TYPE "TaxStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "taxes"
  ADD COLUMN "status" "TaxStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "taxes"
SET "status" = 'INACTIVE'
WHERE UPPER("tax_description") = 'NON-VAT'
   OR UPPER("tax_code") = 'NON-VAT'
   OR UPPER(COALESCE("tax_alias", '')) = 'NON-VAT';

CREATE INDEX "taxes_status_idx" ON "taxes"("status");
