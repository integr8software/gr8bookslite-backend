-- Tax Maintenance is now a global reference catalog under Tax. Company-specific
-- accounting choices are stored separately in company_account_mappings.

-- CreateEnum
CREATE TYPE "PartyTaxRegistrationType" AS ENUM (
    'VAT_REGISTERED',
    'NON_VAT',
    'VAT_EXEMPT'
);

CREATE TYPE "PartyPurchaseTaxClassification" AS ENUM (
    'CAPITAL_GOODS',
    'OTHER_THAN_CAPITAL_GOODS',
    'SERVICES'
);

CREATE TYPE "TaxSystem" AS ENUM (
    'VAT',
    'GST',
    'SALES_TAX',
    'WITHHOLDING',
    'PERCENTAGE_TAX',
    'OTHER'
);

CREATE TYPE "TaxTreatment" AS ENUM (
    'STANDARD',
    'REDUCED',
    'ZERO_RATED',
    'EXEMPT',
    'OUT_OF_SCOPE'
);

CREATE TYPE "TaxTransactionScope" AS ENUM (
    'SALE',
    'PURCHASE',
    'BOTH'
);

CREATE TYPE "TaxCalculationMethod" AS ENUM (
    'EXCLUSIVE',
    'INCLUSIVE'
);

CREATE TYPE "TaxPostingEvent" AS ENUM (
    'RECOGNITION',
    'SETTLEMENT',
    'REFUND',
    'REVERSAL',
    'ADJUSTMENT'
);

CREATE TYPE "TaxEntrySide" AS ENUM (
    'DEBIT',
    'CREDIT'
);

CREATE TYPE "TaxAmountSource" AS ENUM (
    'TAX_AMOUNT',
    'RECOVERABLE_AMOUNT',
    'WITHHELD_AMOUNT'
);

CREATE TYPE "TaxTransactionLineType" AS ENUM (
    'ORIGINAL',
    'REVERSAL',
    'REFUND',
    'ADJUSTMENT'
);

-- CreateTable
CREATE TABLE "company_account_mappings" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "module_code" VARCHAR(20) NOT NULL,
    "account_role" VARCHAR(100) NOT NULL,
    "chart_account_id" BIGINT NOT NULL,
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_account_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_account_mappings_company_module_role_key"
    ON "company_account_mappings"("company_id", "module_code", "account_role");

CREATE INDEX "company_account_mappings_chart_account_id_idx"
    ON "company_account_mappings"("chart_account_id");

ALTER TABLE "company_account_mappings"
    ADD CONSTRAINT "company_account_mappings_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_account_mappings"
    ADD CONSTRAINT "company_account_mappings_chart_account_id_fkey"
    FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Split the former free-text party VAT field into registration and purchasing
-- classifications before converting it to an enum.
ALTER TABLE "parties"
    ADD COLUMN "default_purchase_tax_classification" "PartyPurchaseTaxClassification";

UPDATE "parties"
SET "default_purchase_tax_classification" = CASE
    WHEN UPPER(REPLACE(COALESCE("vat_registration_type", ''), ' ', '_')) = 'CAPITAL_GOODS'
        THEN 'CAPITAL_GOODS'::"PartyPurchaseTaxClassification"
    WHEN UPPER(REPLACE(COALESCE("vat_registration_type", ''), ' ', '_')) = 'OTHER_THAN_CAPITAL_GOODS'
        THEN 'OTHER_THAN_CAPITAL_GOODS'::"PartyPurchaseTaxClassification"
    WHEN UPPER(REPLACE(COALESCE("vat_registration_type", ''), ' ', '_')) = 'SERVICES'
        THEN 'SERVICES'::"PartyPurchaseTaxClassification"
    ELSE NULL
END;

ALTER TABLE "parties"
    ALTER COLUMN "vat_registration_type" TYPE "PartyTaxRegistrationType"
    USING CASE
        WHEN UPPER(REPLACE(COALESCE("vat_registration_type", ''), ' ', '_')) IN ('NON-VAT', 'NON_VAT')
            THEN 'NON_VAT'::"PartyTaxRegistrationType"
        WHEN UPPER(REPLACE(COALESCE("vat_registration_type", ''), ' ', '_')) IN ('EXEMPT', 'VAT_EXEMPT')
            THEN 'VAT_EXEMPT'::"PartyTaxRegistrationType"
        WHEN "vat_registration_type" IS NULL OR TRIM("vat_registration_type") = ''
            THEN NULL
        ELSE 'VAT_REGISTERED'::"PartyTaxRegistrationType"
    END;

-- Add the final global tax-definition fields directly. Transitional effective
-- period and rate-version fields are intentionally omitted.
ALTER TABLE "tax_maintenance"
    ADD COLUMN "code" VARCHAR(40),
    ADD COLUMN "jurisdiction_code" VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    ADD COLUMN "tax_system" "TaxSystem" NOT NULL DEFAULT 'VAT',
    ADD COLUMN "treatment" "TaxTreatment" NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN "transaction_scope" "TaxTransactionScope" NOT NULL DEFAULT 'BOTH',
    ADD COLUMN "calculation_method" "TaxCalculationMethod" NOT NULL DEFAULT 'EXCLUSIVE',
    ADD COLUMN "recoverable" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "source_template_code" VARCHAR(60),
    ADD COLUMN "source_template_version" INTEGER;

UPDATE "tax_maintenance"
SET "code" = CASE LOWER("name")
        WHEN 'vat exclusive' THEN 'PH-VAT-12-EXCL'
        WHEN 'vat inclusive' THEN 'PH-VAT-12-INCL'
        WHEN 'zero rated' THEN 'PH-VAT-ZERO'
        WHEN 'vat exempt' THEN 'PH-VAT-EXEMPT'
        WHEN 'non-vat' THEN 'PH-PT-3'
        ELSE 'LEGACY-' || "id"::text
    END,
    "jurisdiction_code" = CASE
        WHEN LOWER("name") IN (
            'vat exclusive',
            'vat inclusive',
            'zero rated',
            'vat exempt',
            'non-vat'
        ) THEN 'PH'
        ELSE 'GLOBAL'
    END,
    "tax_system" = CASE
        WHEN LOWER("name") = 'non-vat' THEN 'PERCENTAGE_TAX'::"TaxSystem"
        ELSE 'VAT'::"TaxSystem"
    END,
    "treatment" = CASE
        WHEN LOWER("name") IN ('exempt', 'vat exempt') THEN 'EXEMPT'::"TaxTreatment"
        WHEN LOWER("name") = 'non-vat' THEN 'STANDARD'::"TaxTreatment"
        WHEN "percentage" = 0 THEN 'ZERO_RATED'::"TaxTreatment"
        ELSE 'STANDARD'::"TaxTreatment"
    END,
    "percentage" = CASE
        WHEN LOWER("name") = 'non-vat' THEN 3
        WHEN LOWER("name") IN ('zero rated', 'exempt', 'vat exempt') THEN 0
        ELSE "percentage"
    END,
    "transaction_scope" = CASE
        WHEN LOWER("name") = 'non-vat' THEN 'SALE'::"TaxTransactionScope"
        ELSE 'BOTH'::"TaxTransactionScope"
    END,
    "calculation_method" = CASE
        WHEN LOWER("name") = 'vat inclusive' THEN 'INCLUSIVE'::"TaxCalculationMethod"
        ELSE 'EXCLUSIVE'::"TaxCalculationMethod"
    END,
    "recoverable" = CASE
        WHEN LOWER("name") IN ('non-vat', 'exempt', 'vat exempt') THEN false
        ELSE true
    END,
    "source_template_code" = CASE
        WHEN LOWER("name") IN (
            'vat exclusive',
            'vat inclusive',
            'zero rated',
            'vat exempt',
            'non-vat'
        ) THEN 'PH-DEFAULT'
        ELSE NULL
    END,
    "source_template_version" = CASE
        WHEN LOWER("name") IN (
            'vat exclusive',
            'vat inclusive',
            'zero rated',
            'vat exempt',
            'non-vat'
        ) THEN 1
        ELSE NULL
    END;

-- Capture each company's legacy account selections before duplicate tax
-- definitions are consolidated into the global catalog.
CREATE TEMP TABLE "tax_company_account_mapping_legacy" AS
SELECT DISTINCT ON (tax."company_id", legacy_mapping."account_role")
    tax."company_id",
    legacy_mapping."account_role",
    legacy_mapping."chart_account_id"
FROM "tax_maintenance" AS tax
CROSS JOIN LATERAL (
    VALUES
        ('INPUT_TAX_ACCOUNT', tax."input_vat_account_id"),
        ('OUTPUT_VAT_ACCOUNT', tax."output_vat_account_id"),
        ('DEFERRED_VAT_ACCOUNT', tax."deferred_vat_account_id"),
        ('EXPANDED_WITHHOLDING_TAX_ACCOUNT', tax."expanded_withholding_tax_account_id"),
        ('CREDITABLE_WITHHOLDING_TAX_ACCOUNT', tax."creditable_withholding_tax_account_id"),
        ('WITHHOLDING_VATABLE_TAX_ACCOUNT', tax."withholding_vatable_tax_account_id"),
        ('FINAL_WITHHOLDING_TAX_ACCOUNT', tax."final_withholding_tax_account_id")
) AS legacy_mapping("account_role", "chart_account_id")
JOIN "chart_accounts" AS account
  ON account."id" = legacy_mapping."chart_account_id"
 AND account."company_id" = tax."company_id"
WHERE tax."company_id" IS NOT NULL
  AND tax."deleted_at" IS NULL
  AND legacy_mapping."chart_account_id" IS NOT NULL
ORDER BY
    tax."company_id",
    legacy_mapping."account_role",
    tax."updated_at" DESC NULLS LAST,
    tax."id" DESC;

-- Preserve one canonical global definition per code and repoint party
-- references before removing company ownership.
CREATE TEMP TABLE "tax_maintenance_canonical" AS
SELECT DISTINCT ON ("code")
    "id",
    "code"
FROM "tax_maintenance"
WHERE "deleted_at" IS NULL
ORDER BY "code", "id";

UPDATE "parties" AS party
SET "vat_registration_type_id" = canonical."id"
FROM "tax_maintenance" AS old_tax
JOIN "tax_maintenance_canonical" AS canonical
    ON canonical."code" = old_tax."code"
WHERE party."vat_registration_type_id" = old_tax."id"
  AND old_tax."id" <> canonical."id";

DELETE FROM "tax_maintenance" AS tax
WHERE NOT EXISTS (
    SELECT 1
    FROM "tax_maintenance_canonical" AS canonical
    WHERE canonical."id" = tax."id"
);

DROP TABLE "tax_maintenance_canonical";

-- Preserve each company's existing tax posting selections before the legacy
-- account columns are removed from the now-global tax catalog.
INSERT INTO "company_account_mappings" (
    "company_id",
    "module_code",
    "account_role",
    "chart_account_id",
    "created_at",
    "updated_at"
)
SELECT
    legacy_mapping."company_id",
    'TXM',
    legacy_mapping."account_role",
    legacy_mapping."chart_account_id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tax_company_account_mapping_legacy" AS legacy_mapping
ON CONFLICT ("company_id", "module_code", "account_role")
DO NOTHING;

DROP TABLE "tax_company_account_mapping_legacy";

-- Fill roles that had no legacy selection from the matching account in each
-- company's standard chart of accounts.
INSERT INTO "company_account_mappings" (
    "company_id",
    "module_code",
    "account_role",
    "chart_account_id",
    "created_at",
    "updated_at"
)
SELECT
    account."company_id",
    'TXM',
    standard_mapping."account_role",
    account."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    VALUES
        ('INPUT_TAX_ACCOUNT', '2010002011'),
        ('OUTPUT_VAT_ACCOUNT', '2010002005'),
        ('DEFERRED_VAT_ACCOUNT', '2010002004'),
        ('EXPANDED_WITHHOLDING_TAX_ACCOUNT', '2010002002'),
        ('CREDITABLE_WITHHOLDING_TAX_ACCOUNT', '2010002001'),
        ('WITHHOLDING_VATABLE_TAX_ACCOUNT', '2010002009'),
        ('FINAL_WITHHOLDING_TAX_ACCOUNT', '2010002003')
) AS standard_mapping("account_role", "account_code")
JOIN "chart_accounts" AS account
  ON account."account_code" = standard_mapping."account_code"
 AND account."deleted_at" IS NULL
ON CONFLICT ("company_id", "module_code", "account_role")
DO NOTHING;

-- Remove company ownership and per-tax account overrides. Those account
-- selections now belong to company_account_mappings.
ALTER TABLE "tax_maintenance"
    DROP CONSTRAINT IF EXISTS "tax_maintenance_company_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_input_vat_account_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_output_vat_account_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_deferred_vat_account_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_expanded_withholding_tax_account_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_creditable_withholding_tax_account_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_withholding_vatable_tax_account_id_fkey",
    DROP CONSTRAINT IF EXISTS "tax_maintenance_final_withholding_tax_account_id_fkey";

DROP INDEX IF EXISTS "tax_maintenance_company_name_key";
DROP INDEX IF EXISTS "tax_maintenance_company_status_idx";
DROP INDEX IF EXISTS "tax_maintenance_input_vat_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_output_vat_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_deferred_vat_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_expanded_withholding_tax_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_creditable_withholding_tax_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_withholding_vatable_tax_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_final_withholding_tax_account_id_idx";

ALTER TABLE "tax_maintenance"
    ALTER COLUMN "code" SET NOT NULL,
    DROP COLUMN IF EXISTS "company_id",
    DROP COLUMN IF EXISTS "is_exempted",
    DROP COLUMN IF EXISTS "input_vat_account_id",
    DROP COLUMN IF EXISTS "output_vat_account_id",
    DROP COLUMN IF EXISTS "deferred_vat_account_id",
    DROP COLUMN IF EXISTS "expanded_withholding_tax_account_id",
    DROP COLUMN IF EXISTS "creditable_withholding_tax_account_id",
    DROP COLUMN IF EXISTS "withholding_vatable_tax_account_id",
    DROP COLUMN IF EXISTS "final_withholding_tax_account_id";

CREATE UNIQUE INDEX "tax_maintenance_code_key"
    ON "tax_maintenance"("code");

CREATE INDEX "tax_maintenance_status_idx"
    ON "tax_maintenance"("status");

CREATE INDEX "tax_maintenance_jurisdiction_system_idx"
    ON "tax_maintenance"("jurisdiction_code", "tax_system");

CREATE TABLE "tax_rate_versions" (
    "id" BIGSERIAL NOT NULL,
    "tax_definition_id" BIGINT NOT NULL,
    "percentage" DECIMAL(9,6) NOT NULL,
    "calculation_method" "TaxCalculationMethod" NOT NULL,
    "recoverable_percentage" DECIMAL(7,4) NOT NULL DEFAULT 100,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" "TaxMaintenanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rate_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tax_rate_versions_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100),
    CONSTRAINT "tax_rate_versions_recoverable_percentage_check" CHECK ("recoverable_percentage" >= 0 AND "recoverable_percentage" <= 100),
    CONSTRAINT "tax_rate_versions_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE UNIQUE INDEX "tax_rate_versions_definition_effective_from_key"
    ON "tax_rate_versions"("tax_definition_id", "effective_from");

CREATE INDEX "tax_rate_versions_effective_idx"
    ON "tax_rate_versions"("tax_definition_id", "status", "effective_from", "effective_to");

ALTER TABLE "tax_rate_versions"
    ADD CONSTRAINT "tax_rate_versions_tax_definition_id_fkey"
    FOREIGN KEY ("tax_definition_id") REFERENCES "tax_maintenance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tax_posting_rules" (
    "id" BIGSERIAL NOT NULL,
    "tax_definition_id" BIGINT NOT NULL,
    "transaction_scope" "TaxTransactionScope" NOT NULL,
    "posting_event" "TaxPostingEvent" NOT NULL DEFAULT 'RECOGNITION',
    "account_role" VARCHAR(100) NOT NULL,
    "entry_side" "TaxEntrySide" NOT NULL,
    "amount_source" "TaxAmountSource" NOT NULL DEFAULT 'TAX_AMOUNT',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_posting_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tax_posting_rules_definition_scope_event_role_key"
    ON "tax_posting_rules"("tax_definition_id", "transaction_scope", "posting_event", "account_role");

CREATE INDEX "tax_posting_rules_resolution_idx"
    ON "tax_posting_rules"("tax_definition_id", "transaction_scope", "posting_event", "is_active");

ALTER TABLE "tax_posting_rules"
    ADD CONSTRAINT "tax_posting_rules_tax_definition_id_fkey"
    FOREIGN KEY ("tax_definition_id") REFERENCES "tax_maintenance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "company_tax_configurations" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "tax_definition_id" BIGINT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default_for_sales" BOOLEAN NOT NULL DEFAULT false,
    "is_default_for_purchases" BOOLEAN NOT NULL DEFAULT false,
    "registration_number" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_tax_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_tax_configurations_company_tax_key"
    ON "company_tax_configurations"("company_id", "tax_definition_id");

CREATE INDEX "company_tax_configurations_enabled_idx"
    ON "company_tax_configurations"("company_id", "is_enabled");

ALTER TABLE "company_tax_configurations"
    ADD CONSTRAINT "company_tax_configurations_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_tax_configurations"
    ADD CONSTRAINT "company_tax_configurations_tax_definition_id_fkey"
    FOREIGN KEY ("tax_definition_id") REFERENCES "tax_maintenance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "transaction_tax_lines" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "source_type" VARCHAR(60) NOT NULL,
    "source_id" VARCHAR(80) NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "line_type" "TaxTransactionLineType" NOT NULL DEFAULT 'ORIGINAL',
    "original_tax_line_id" BIGINT,
    "tax_definition_id" BIGINT NOT NULL,
    "tax_rate_version_id" BIGINT,
    "transaction_scope" "TaxTransactionScope" NOT NULL,
    "posting_event" "TaxPostingEvent" NOT NULL DEFAULT 'RECOGNITION',
    "tax_code_snapshot" VARCHAR(40) NOT NULL,
    "tax_name_snapshot" VARCHAR(120) NOT NULL,
    "jurisdiction_code_snapshot" VARCHAR(20) NOT NULL,
    "percentage_applied" DECIMAL(9,6) NOT NULL,
    "calculation_method_snapshot" "TaxCalculationMethod" NOT NULL,
    "taxable_amount" DECIMAL(19,4) NOT NULL,
    "tax_amount" DECIMAL(19,4) NOT NULL,
    "recoverable_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "posting_account_id" BIGINT NOT NULL,
    "posting_account_code_snapshot" VARCHAR(60) NOT NULL,
    "posting_account_title_snapshot" VARCHAR(160) NOT NULL,
    "posting_account_role" VARCHAR(100) NOT NULL,
    "posting_side" "TaxEntrySide" NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_tax_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transaction_tax_lines_amounts_check" CHECK (
        "taxable_amount" >= 0
        AND "tax_amount" >= 0
        AND "recoverable_amount" >= 0
    )
);

CREATE UNIQUE INDEX "transaction_tax_lines_source_sequence_key"
    ON "transaction_tax_lines"("company_id", "source_type", "source_id", "sequence");

CREATE INDEX "transaction_tax_lines_company_date_idx"
    ON "transaction_tax_lines"("company_id", "transaction_date");

CREATE INDEX "transaction_tax_lines_tax_rate_idx"
    ON "transaction_tax_lines"("tax_definition_id", "tax_rate_version_id");

CREATE INDEX "transaction_tax_lines_original_idx"
    ON "transaction_tax_lines"("original_tax_line_id");

CREATE INDEX "transaction_tax_lines_posting_account_idx"
    ON "transaction_tax_lines"("posting_account_id");

ALTER TABLE "transaction_tax_lines"
    ADD CONSTRAINT "transaction_tax_lines_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_tax_lines"
    ADD CONSTRAINT "transaction_tax_lines_tax_definition_id_fkey"
    FOREIGN KEY ("tax_definition_id") REFERENCES "tax_maintenance"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_tax_lines"
    ADD CONSTRAINT "transaction_tax_lines_tax_rate_version_id_fkey"
    FOREIGN KEY ("tax_rate_version_id") REFERENCES "tax_rate_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_tax_lines"
    ADD CONSTRAINT "transaction_tax_lines_posting_account_id_fkey"
    FOREIGN KEY ("posting_account_id") REFERENCES "chart_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_tax_lines"
    ADD CONSTRAINT "transaction_tax_lines_original_tax_line_id_fkey"
    FOREIGN KEY ("original_tax_line_id") REFERENCES "transaction_tax_lines"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "tax_rate_versions" (
    "tax_definition_id",
    "percentage",
    "calculation_method",
    "recoverable_percentage",
    "effective_from",
    "status",
    "updated_at"
)
SELECT
    tax."id",
    tax."percentage",
    tax."calculation_method",
    CASE WHEN tax."recoverable" THEN 100 ELSE 0 END,
    DATE '1900-01-01',
    tax."status",
    CURRENT_TIMESTAMP
FROM "tax_maintenance" AS tax;

INSERT INTO "tax_posting_rules" (
    "tax_definition_id",
    "transaction_scope",
    "posting_event",
    "account_role",
    "entry_side",
    "amount_source",
    "priority",
    "updated_at"
)
SELECT
    tax."id",
    scope_rule."transaction_scope"::"TaxTransactionScope",
    'RECOGNITION'::"TaxPostingEvent",
    scope_rule."account_role",
    scope_rule."entry_side"::"TaxEntrySide",
    'TAX_AMOUNT'::"TaxAmountSource",
    100,
    CURRENT_TIMESTAMP
FROM "tax_maintenance" AS tax
CROSS JOIN (
    VALUES
        ('PURCHASE', 'INPUT_TAX_ACCOUNT', 'DEBIT'),
        ('SALE', 'OUTPUT_VAT_ACCOUNT', 'CREDIT')
) AS scope_rule("transaction_scope", "account_role", "entry_side")
WHERE tax."tax_system" IN ('VAT', 'GST', 'SALES_TAX');

INSERT INTO "company_tax_configurations" (
    "company_id",
    "tax_definition_id",
    "is_enabled",
    "updated_at"
)
SELECT
    company."id",
    tax."id",
    true,
    CURRENT_TIMESTAMP
FROM "companies" AS company
CROSS JOIN "tax_maintenance" AS tax;

ALTER TABLE "tax_maintenance"
    ADD CONSTRAINT "tax_maintenance_percentage_check"
        CHECK ("percentage" >= 0 AND "percentage" <= 100),
    ADD CONSTRAINT "tax_maintenance_zero_treatment_check"
        CHECK (
            "treatment" NOT IN ('ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE')
            OR "percentage" = 0
        ),
    ADD CONSTRAINT "tax_maintenance_source_template_version_check"
        CHECK (
            "source_template_version" IS NULL
            OR "source_template_version" > 0
        );

-- Tax is a platform facility, not a customer-selectable sidebar module.
DELETE FROM "module_system_sidebar"
WHERE "module_id" IN (
    SELECT "id"
    FROM "modules"
    WHERE "code" = 'TXM'
);

DELETE FROM "module_system_modules"
WHERE "module_id" IN (
    SELECT "id"
    FROM "modules"
    WHERE "code" = 'TXM'
);

UPDATE "permissions"
SET "is_active" = FALSE,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'TXM';

UPDATE "modules"
SET "is_active" = FALSE,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'TXM';

-- Normalize the tax-related chart account names used by the Tax module.
UPDATE "chart_accounts"
SET "account_title" = CASE "account_code"
        WHEN '2010002001' THEN 'Creditable Withholding Tax'
        WHEN '2010002002' THEN 'Expanded Withholding Tax'
        WHEN '2010002003' THEN 'Final Withholding Tax'
        WHEN '2010002004' THEN 'Deferred Output VAT'
        WHEN '2010002005' THEN 'Output VAT'
        WHEN '2010002009' THEN 'Withholding VAT'
        WHEN '2010002011' THEN 'Input VAT'
    END,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "account_code" IN (
    '2010002001',
    '2010002002',
    '2010002003',
    '2010002004',
    '2010002005',
    '2010002009',
    '2010002011'
);

-- Give global tax definitions a stable display order.
ALTER TABLE "tax_maintenance"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ordered_taxes AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            ORDER BY
                CASE "code"
                    WHEN 'PH-VAT-12-EXCL' THEN 10
                    WHEN 'PH-VAT-12-INCL' THEN 20
                    WHEN 'PH-VAT-ZERO' THEN 30
                    WHEN 'PH-VAT-EXEMPT' THEN 40
                    WHEN 'PH-PT-3' THEN 50
                    WHEN 'PH-NO-TAX' THEN 60
                    ELSE 1000
                END ASC,
                "jurisdiction_code" ASC,
                "tax_system" ASC,
                "name" ASC,
                "id" ASC
        ) * 10 AS "sort_order"
    FROM "tax_maintenance"
    WHERE "deleted_at" IS NULL
)
UPDATE "tax_maintenance" AS tax
SET "sort_order" = ordered_taxes."sort_order"
FROM ordered_taxes
WHERE tax."id" = ordered_taxes."id";

CREATE INDEX "tax_maintenance_sort_order_idx"
ON "tax_maintenance"("sort_order", "id");

-- The party-level Tax definition was only an optional UI preference. Tax
-- registration and purchase classification remain on the party, while actual
-- taxes are selected and snapshotted by transaction modules.
ALTER TABLE "parties"
DROP CONSTRAINT IF EXISTS "parties_vat_registration_type_id_fkey";

DROP INDEX IF EXISTS "parties_vat_registration_type_id_idx";

ALTER TABLE "parties"
DROP COLUMN IF EXISTS "vat_registration_type_id";
