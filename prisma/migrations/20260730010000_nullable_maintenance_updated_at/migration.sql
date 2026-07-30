-- Maintenance updated timestamps are intentionally nullable until a real edit occurs.
ALTER TABLE "taxes" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "form_signatory_setups" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "form_signatory_rows" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "chart_accounts" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "company_account_mappings" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "default_accounts" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "bank_accounts" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "services_maintenance" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "terms" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "item_attributes" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "item_attribute_values" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "item_categories" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "warehouses" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "warehouse_access" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "unit_of_measurements" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "payment_types" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "discounts" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "responsibility_centers" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "responsibility_center_classifications" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "responsibility_center_types" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "parties" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "party_entity_types" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "tax_posting_rules" ALTER COLUMN "updated_at" DROP DEFAULT, ALTER COLUMN "updated_at" DROP NOT NULL;

CREATE OR REPLACE FUNCTION set_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "taxes_set_updated_at" ON "taxes";
CREATE TRIGGER "taxes_set_updated_at" BEFORE UPDATE ON "taxes" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "form_signatory_setups_set_updated_at" ON "form_signatory_setups";
CREATE TRIGGER "form_signatory_setups_set_updated_at" BEFORE UPDATE ON "form_signatory_setups" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "form_signatory_rows_set_updated_at" ON "form_signatory_rows";
CREATE TRIGGER "form_signatory_rows_set_updated_at" BEFORE UPDATE ON "form_signatory_rows" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "chart_accounts_set_updated_at" ON "chart_accounts";
CREATE TRIGGER "chart_accounts_set_updated_at" BEFORE UPDATE ON "chart_accounts" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "company_account_mappings_set_updated_at" ON "company_account_mappings";
CREATE TRIGGER "company_account_mappings_set_updated_at" BEFORE UPDATE ON "company_account_mappings" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "default_accounts_set_updated_at" ON "default_accounts";
CREATE TRIGGER "default_accounts_set_updated_at" BEFORE UPDATE ON "default_accounts" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "bank_accounts_set_updated_at" ON "bank_accounts";
CREATE TRIGGER "bank_accounts_set_updated_at" BEFORE UPDATE ON "bank_accounts" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "services_maintenance_set_updated_at" ON "services_maintenance";
CREATE TRIGGER "services_maintenance_set_updated_at" BEFORE UPDATE ON "services_maintenance" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "terms_set_updated_at" ON "terms";
CREATE TRIGGER "terms_set_updated_at" BEFORE UPDATE ON "terms" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "item_attributes_set_updated_at" ON "item_attributes";
CREATE TRIGGER "item_attributes_set_updated_at" BEFORE UPDATE ON "item_attributes" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "item_attribute_values_set_updated_at" ON "item_attribute_values";
CREATE TRIGGER "item_attribute_values_set_updated_at" BEFORE UPDATE ON "item_attribute_values" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "item_categories_set_updated_at" ON "item_categories";
CREATE TRIGGER "item_categories_set_updated_at" BEFORE UPDATE ON "item_categories" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "warehouses_set_updated_at" ON "warehouses";
CREATE TRIGGER "warehouses_set_updated_at" BEFORE UPDATE ON "warehouses" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "warehouse_access_set_updated_at" ON "warehouse_access";
CREATE TRIGGER "warehouse_access_set_updated_at" BEFORE UPDATE ON "warehouse_access" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "unit_of_measurements_set_updated_at" ON "unit_of_measurements";
CREATE TRIGGER "unit_of_measurements_set_updated_at" BEFORE UPDATE ON "unit_of_measurements" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "payment_types_set_updated_at" ON "payment_types";
CREATE TRIGGER "payment_types_set_updated_at" BEFORE UPDATE ON "payment_types" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "discounts_set_updated_at" ON "discounts";
CREATE TRIGGER "discounts_set_updated_at" BEFORE UPDATE ON "discounts" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "responsibility_centers_set_updated_at" ON "responsibility_centers";
CREATE TRIGGER "responsibility_centers_set_updated_at" BEFORE UPDATE ON "responsibility_centers" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "responsibility_center_classifications_set_updated_at" ON "responsibility_center_classifications";
CREATE TRIGGER "responsibility_center_classifications_set_updated_at" BEFORE UPDATE ON "responsibility_center_classifications" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "responsibility_center_types_set_updated_at" ON "responsibility_center_types";
CREATE TRIGGER "responsibility_center_types_set_updated_at" BEFORE UPDATE ON "responsibility_center_types" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "parties_set_updated_at" ON "parties";
CREATE TRIGGER "parties_set_updated_at" BEFORE UPDATE ON "parties" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "party_entity_types_set_updated_at" ON "party_entity_types";
CREATE TRIGGER "party_entity_types_set_updated_at" BEFORE UPDATE ON "party_entity_types" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

DROP TRIGGER IF EXISTS "tax_posting_rules_set_updated_at" ON "tax_posting_rules";
CREATE TRIGGER "tax_posting_rules_set_updated_at" BEFORE UPDATE ON "tax_posting_rules" FOR EACH ROW EXECUTE FUNCTION set_maintenance_updated_at();

-- AlterTable
ALTER TABLE "taxes" RENAME CONSTRAINT "alphanumeric_tax_codes_pkey" TO "taxes_pkey";

-- RenameIndex
ALTER INDEX "alphanumeric_tax_codes_official_atc_code_idx" RENAME TO "taxes_official_atc_code_idx";

-- RenameIndex
ALTER INDEX "alphanumeric_tax_codes_source_key_key" RENAME TO "taxes_source_key_key";

-- RenameIndex
ALTER INDEX "alphanumeric_tax_codes_tax_code_idx" RENAME TO "taxes_tax_code_idx";

-- RenameIndex
ALTER INDEX "alphanumeric_tax_codes_tax_type_idx" RENAME TO "taxes_tax_type_idx";

-- RenameIndex
ALTER INDEX "alphanumeric_tax_codes_transaction_type_idx" RENAME TO "taxes_transaction_type_idx";
