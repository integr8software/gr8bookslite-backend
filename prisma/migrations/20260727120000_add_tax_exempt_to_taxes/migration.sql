ALTER TABLE "alphanumeric_tax_codes"
ADD COLUMN IF NOT EXISTS "tax_exempt" BOOLEAN NOT NULL DEFAULT false;
