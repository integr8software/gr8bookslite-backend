ALTER TYPE "PartyTaxRegistrationType" ADD VALUE IF NOT EXISTS 'ZERO_RATED';
ALTER TYPE "PartyTaxRegistrationType" ADD VALUE IF NOT EXISTS 'CAPITAL_GOODS';
ALTER TYPE "PartyTaxRegistrationType" ADD VALUE IF NOT EXISTS 'OTHER_THAN_CAPITAL_GOODS';
ALTER TYPE "PartyTaxRegistrationType" ADD VALUE IF NOT EXISTS 'SERVICES';

ALTER TABLE "parties" DROP COLUMN IF EXISTS "default_purchase_tax_classification";

DROP TYPE IF EXISTS "PartyPurchaseTaxClassification";
