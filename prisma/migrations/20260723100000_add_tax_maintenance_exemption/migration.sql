ALTER TABLE "tax_maintenance"
  ADD COLUMN "is_exempted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "tax_maintenance"
SET "is_exempted" = true,
    "percentage" = 0
WHERE LOWER("name") IN ('non-vat', 'exempt', 'vat exempt');
