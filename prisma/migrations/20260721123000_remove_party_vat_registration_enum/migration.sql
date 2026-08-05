ALTER TABLE "parties"
  ALTER COLUMN "vat_registration_type" TYPE VARCHAR(50)
  USING "vat_registration_type"::text;

DROP TYPE "PartyVatRegistrationType";
