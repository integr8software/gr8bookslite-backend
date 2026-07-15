-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'STANDARD');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CompanyRoleType" AS ENUM ('ADMIN', 'USER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccessScopeLevel" AS ENUM ('COMPANY', 'SATELLITE', 'BRANCH');

-- CreateEnum
CREATE TYPE "SidebarItemType" AS ENUM ('SECTION', 'CONTAINER', 'LINK');

-- CreateEnum
CREATE TYPE "ModuleCategory" AS ENUM ('MASTER', 'WORKSPACE', 'STANDARD');

-- CreateEnum
CREATE TYPE "CompanyUnitType" AS ENUM ('HEAD_OFFICE', 'BRANCH', 'SATELLITE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BillingIntervalUnit" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionUsageMetric" AS ENUM ('COMPANY', 'BRANCH', 'SATELLITE', 'USER');

-- CreateEnum
CREATE TYPE "TaxpayerType" AS ENUM ('INDIVIDUAL', 'NON_INDIVIDUAL');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('PAYMONGO');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "BillingPaymentPurpose" AS ENUM ('ONBOARDING', 'RENEWAL', 'ADDITIONAL_COMPANY');

-- CreateEnum
CREATE TYPE "BillingPaymentAttemptStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingApplicationStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'EXPIRED', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "SubscriptionPlanScope" AS ENUM ('ONBOARDING', 'ADDITIONAL_COMPANY');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('ACTIVE', 'DRAFT', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'INCOMPLETE_CANCELED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('PENDING', 'RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('SIGNUP', 'EMAIL_CHANGE', 'PASSWORD_RESET', 'WORKSPACE_INVITE');

-- CreateEnum
CREATE TYPE "TransactionNumberInputMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "TransactionNumberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ChartAccountLevel" AS ENUM ('MAJOR', 'SUB1', 'SUB2', 'SUB3', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "ChartAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountNature" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ChartAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DefaultAccountUsageType" AS ENUM ('PARENT', 'POSTING', 'SELECTION_GROUP');

-- CreateEnum
CREATE TYPE "DefaultAccountTemplateType" AS ENUM ('EXPENSE', 'COLLECTION', 'FIXED_ASSET');

-- CreateEnum
CREATE TYPE "TermDateMode" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "TermStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaymentTypeClassification" AS ENUM ('CASH', 'WITH_BANK', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'MULTIPLE_CHECK', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ResponsibilityCenterCategory" AS ENUM ('CORPORATE', 'DIVISION', 'DEPARTMENT', 'SECTION', 'TEAM', 'BRANCH', 'BUILDING', 'PROJECT', 'BUSINESS_UNIT', 'REGION', 'SALESMAN', 'WAREHOUSE', 'OUTLET', 'SALES_TERRITORY', 'FLEET');

-- CreateEnum
CREATE TYPE "ResponsibilityCenterFinancialType" AS ENUM ('COST_CENTER', 'PROFIT_CENTER', 'REVENUE_CENTER', 'INVESTMENT_CENTER');

-- CreateEnum
CREATE TYPE "ResponsibilityCenterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartyClassification" AS ENUM ('INDIVIDUAL', 'NON_INDIVIDUAL');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('VENDOR', 'CUSTOMER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartyVatRegistrationType" AS ENUM ('VAT_REGISTERED', 'ZERO_RATED', 'NON_VAT', 'EXEMPT', 'CAPITAL_GOODS', 'OTHER_THAN_CAPITAL_GOODS', 'SERVICES');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "contact_number" TEXT,
    "avatar_file_name" TEXT,
    "avatar_mime_type" TEXT,
    "avatar_storage_path" TEXT,
    "avatar_public_url" TEXT,
    "system_role" "SystemRole" NOT NULL DEFAULT 'STANDARD',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auth_identities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session_handoffs" (
    "id" SERIAL NOT NULL,
    "code_hash" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_session_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "company_code" TEXT,
    "taxpayer_type" "TaxpayerType",
    "owner_last_name" TEXT,
    "owner_first_name" TEXT,
    "owner_middle_name" TEXT,
    "organization_type" TEXT,
    "organization_type_other" TEXT,
    "logo_file_name" TEXT,
    "logo_mime_type" TEXT,
    "logo_storage_path" TEXT,
    "logo_public_url" TEXT,
    "address" TEXT,
    "tin" TEXT,
    "email" TEXT,
    "website" TEXT,
    "contact_number" TEXT,
    "report_start_date" TIMESTAMP(3),
    "report_end_date" TIMESTAMP(3),
    "created_by_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_units" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "parent_unit_id" INTEGER,
    "type" "CompanyUnitType" NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "tin" TEXT,
    "address" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "inherits_company_profile" BOOLEAN NOT NULL DEFAULT false,
    "can_transact_sales" BOOLEAN NOT NULL DEFAULT false,
    "can_hold_inventory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'USER',
    "company_role_id" INTEGER,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "access_scope" "AccessScopeLevel" NOT NULL DEFAULT 'COMPANY',
    "invited_by_user_id" INTEGER,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id","company_id")
);

-- CreateTable
CREATE TABLE "user_table_preferences" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "module_key" VARCHAR(120) NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_table_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_unit_access" (
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "company_role_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_unit_access_pkey" PRIMARY KEY ("user_id","company_id","unit_id")
);

-- CreateTable
CREATE TABLE "company_roles" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "unit_id" INTEGER,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role_type" "CompanyRoleType" NOT NULL DEFAULT 'CUSTOM',
    "scope_level" "AccessScopeLevel" NOT NULL DEFAULT 'COMPANY',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_icon_name" TEXT,
    "category" "ModuleCategory" NOT NULL DEFAULT 'STANDARD',
    "module_types" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_systems" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_system_modules" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_system_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_system_sidebar" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "module_id" INTEGER,
    "item_type" "SidebarItemType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_system_sidebar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_versions" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current_version" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "applied_by" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope_level" "AccessScopeLevel" NOT NULL DEFAULT 'COMPANY',
    "requires_company_context" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_role_permissions" (
    "id" SERIAL NOT NULL,
    "company_role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_cancel" BOOLEAN NOT NULL DEFAULT false,
    "can_uncancel" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_permissions" (
    "id" SERIAL NOT NULL,
    "membership_user_id" INTEGER NOT NULL,
    "membership_company_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "can_view" BOOLEAN,
    "can_create" BOOLEAN,
    "can_update" BOOLEAN,
    "can_cancel" BOOLEAN,
    "can_uncancel" BOOLEAN,
    "can_export" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sidebar_preferences" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_key" VARCHAR(160) NOT NULL,
    "parent_item_key" VARCHAR(160),
    "has_parent_override" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_collapsed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sidebar_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER,
    "actor_user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_municipalities" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "city_municipality_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barangays" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "barangay_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "city_municipality_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barangays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alphanumeric_tax_codes" (
    "id" SERIAL NOT NULL,
    "source_key" VARCHAR(40) NOT NULL,
    "transaction_type" VARCHAR(40) NOT NULL,
    "tax_type" VARCHAR(40) NOT NULL,
    "tax_code" VARCHAR(40) NOT NULL,
    "tax_description" TEXT NOT NULL,
    "tax_rate" DECIMAL(8,4) NOT NULL,
    "tax_alias" VARCHAR(40),
    "atc" VARCHAR(40),
    "official_atc_code" VARCHAR(40),
    "nature_of_income" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alphanumeric_tax_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_signatory_setups" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_signatory_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_signatory_rows" (
    "id" SERIAL NOT NULL,
    "setup_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "signature_name" TEXT,
    "signature_image" TEXT,
    "signature_valid_until" TIMESTAMP(3),
    "is_this_temporary" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_signatory_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_number_sequences" (
    "id" SERIAL NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "input_mode" "TransactionNumberInputMode" NOT NULL DEFAULT 'AUTO',
    "prefix" TEXT NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '',
    "padding" INTEGER NOT NULL DEFAULT 6,
    "starting_number" INTEGER NOT NULL DEFAULT 1,
    "current_number" INTEGER NOT NULL DEFAULT 1,
    "status" "TransactionNumberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_accounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "parent_account_id" BIGINT,
    "account_code" VARCHAR(20) NOT NULL,
    "account_title" VARCHAR(250) NOT NULL,
    "account_level" "ChartAccountLevel" NOT NULL,
    "account_type" "ChartAccountType",
    "account_nature" "AccountNature",
    "account_group" JSONB,
    "statement_section" VARCHAR(250),
    "report_alias" VARCHAR(250),
    "description" VARCHAR(500),
    "is_posting_account" BOOLEAN NOT NULL DEFAULT false,
    "with_subsidiary" BOOLEAN NOT NULL DEFAULT false,
    "contra_account" BOOLEAN NOT NULL DEFAULT false,
    "show_total" BOOLEAN NOT NULL DEFAULT false,
    "order_no" INTEGER,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency_code" VARCHAR(10),
    "who_created" VARCHAR(50),
    "who_modified" VARCHAR(50),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_accounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "type" "DefaultAccountTemplateType" NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "description" VARCHAR(500),
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "expense_coa_id" BIGINT,
    "revenue_coa_id" BIGINT,
    "asset_coa_id" BIGINT,
    "accumulated_depreciation_coa_id" BIGINT,
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "default_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "coa_id" BIGINT NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "branch" VARCHAR(100),
    "account_number" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(250) NOT NULL,
    "account_type" VARCHAR(50),
    "series_start" VARCHAR(50),
    "series_end" VARCHAR(50),
    "series_digits" INTEGER,
    "currency_code" VARCHAR(10),
    "currency_exchange_rate" DECIMAL(18,2),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "date_mode" "TermDateMode" NOT NULL,
    "period" INTEGER NOT NULL,
    "status" "TermStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_types" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "classification" "PaymentTypeClassification" NOT NULL,
    "status" "PaymentTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "chart_account_id" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "type" "DiscountType" NOT NULL,
    "value_type" "DiscountValueType" NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "status" "DiscountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_centers" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "ResponsibilityCenterCategory" NOT NULL,
    "financial_type" "ResponsibilityCenterFinancialType" NOT NULL,
    "manager" VARCHAR(150),
    "parent_id" BIGINT,
    "status" "ResponsibilityCenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" VARCHAR(500),
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibility_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "term_id" BIGINT,
    "party_code_no" VARCHAR(80) NOT NULL,
    "classification" "PartyClassification" NOT NULL,
    "party_types" "PartyType"[],
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "party_name" VARCHAR(255),
    "trade_name" VARCHAR(255),
    "first_name" VARCHAR(120),
    "middle_name" VARCHAR(120),
    "last_name" VARCHAR(120),
    "suffix_name" VARCHAR(40),
    "default_receivable_account_id" BIGINT,
    "customer_advance_account_id" BIGINT,
    "default_payable_account_id" BIGINT,
    "vendor_advance_account_id" BIGINT,
    "employee_advance_account_id" BIGINT,
    "employee_payable_account_id" BIGINT,
    "tin" VARCHAR(20),
    "vat_registration_type" "PartyVatRegistrationType",
    "atc_code" VARCHAR(40),
    "email" VARCHAR(255),
    "contact_no" VARCHAR(40),
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_addresses" (
    "id" BIGSERIAL NOT NULL,
    "party_id" BIGINT NOT NULL,
    "address_name" VARCHAR(120) NOT NULL,
    "address_line_1" VARCHAR(255) NOT NULL,
    "address_line_2" VARCHAR(255) NOT NULL,
    "barangay" VARCHAR(120),
    "barangay_code" VARCHAR(30),
    "city_municipality" VARCHAR(120),
    "city_municipality_code" VARCHAR(30),
    "province" VARCHAR(120),
    "province_code" VARCHAR(30),
    "region" VARCHAR(120),
    "region_code" VARCHAR(30),
    "is_billing" BOOLEAN NOT NULL DEFAULT false,
    "is_building" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_delivery" BOOLEAN NOT NULL DEFAULT false,
    "is_foreign" BOOLEAN NOT NULL DEFAULT false,
    "is_home" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "party_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "billing_metadata" JSONB,
    "scope" "SubscriptionPlanScope" NOT NULL DEFAULT 'ONBOARDING',
    "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "trial_days" INTEGER NOT NULL DEFAULT 15,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_prices" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "interval_unit" "BillingIntervalUnit" NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "compare_at_in_cents" INTEGER,
    "external_plan_id" TEXT,
    "billing_metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_usage_rules" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "metric" "SubscriptionUsageMetric" NOT NULL,
    "free_count" INTEGER NOT NULL DEFAULT 0,
    "unit_price_in_cents" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_usage_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_discount_tiers" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "metric" "SubscriptionUsageMetric" NOT NULL,
    "threshold_count" INTEGER NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_discount_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_modules" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_systems" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "system_id" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_onboarding_drafts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subscription_plan_id" INTEGER,
    "provisioned_company_id" INTEGER,
    "taxpayer_type" "TaxpayerType",
    "owner_last_name" TEXT,
    "owner_first_name" TEXT,
    "owner_middle_name" TEXT,
    "company_name" TEXT,
    "organization_type" TEXT,
    "organization_type_other" TEXT,
    "logo_file_name" TEXT,
    "logo_mime_type" TEXT,
    "logo_storage_path" TEXT,
    "logo_public_url" TEXT,
    "address" TEXT,
    "tin" TEXT,
    "company_email" TEXT,
    "website" TEXT,
    "contact_number" TEXT,
    "report_start_date" TIMESTAMP(3),
    "report_end_date" TIMESTAMP(3),
    "billingCycle" "BillingCycle",
    "cardholder_name" TEXT,
    "billing_email" TEXT,
    "billing_address" TEXT,
    "card_last4" TEXT,
    "card_brand" TEXT,
    "card_expiry_month" INTEGER,
    "card_expiry_year" INTEGER,
    "payment_method_reference" TEXT,
    "plan_selected_at" TIMESTAMP(3),
    "billing_completed_at" TIMESTAMP(3),
    "company_details_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_subscriptions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "subscription_plan_price_id" INTEGER,
    "billing_customer_id" INTEGER,
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "billing_mode" "BillingMode" NOT NULL DEFAULT 'AUTO',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "external_customer_id" TEXT,
    "external_subscription_id" TEXT,
    "external_plan_id" TEXT,
    "external_payment_method_id" TEXT,
    "latest_invoice_external_id" TEXT,
    "latest_payment_intent_id" TEXT,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "current_period_start_at" TIMESTAMP(3),
    "next_billing_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "failure_message" TEXT,
    "raw_provider_payload" JSONB,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_ends_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_attempts" (
    "id" SERIAL NOT NULL,
    "subscription_invoice_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "owner_user_id" INTEGER,
    "company_subscription_id" INTEGER,
    "subscription_plan_id" INTEGER NOT NULL,
    "subscription_plan_price_id" INTEGER,
    "purpose" "BillingPaymentPurpose" NOT NULL,
    "billing_mode" "BillingMode" NOT NULL DEFAULT 'MANUAL',
    "status" "BillingPaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "application_status" "BillingApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "attempt_number" INTEGER NOT NULL,
    "external_checkout_session_id" TEXT,
    "external_payment_intent_id" TEXT,
    "external_payment_id" TEXT,
    "payment_method_type" TEXT,
    "amount_in_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "success_url" TEXT NOT NULL,
    "cancel_url" TEXT NOT NULL,
    "metadata" JSONB,
    "raw_provider_payload" JSONB,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "application_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_application_attempt_at" TIMESTAMP(3),
    "application_error" TEXT,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "owner_user_id" INTEGER,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "external_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "metadata" JSONB,
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" SERIAL NOT NULL,
    "company_subscription_id" INTEGER,
    "company_id" INTEGER,
    "owner_user_id" INTEGER,
    "onboarding_draft_id" INTEGER,
    "subscription_plan_id" INTEGER,
    "subscription_plan_price_id" INTEGER,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "external_invoice_id" TEXT,
    "external_payment_intent_id" TEXT,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "purpose" "BillingPaymentPurpose",
    "billing_mode" "BillingMode",
    "billing_reason" TEXT,
    "invoice_number" TEXT,
    "plan_code" TEXT,
    "plan_name" TEXT,
    "billing_cycle" "BillingCycle",
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount_in_cents" INTEGER,
    "subtotal_in_cents" INTEGER,
    "discount_in_cents" INTEGER NOT NULL DEFAULT 0,
    "tax_in_cents" INTEGER NOT NULL DEFAULT 0,
    "total_amount_in_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "amount_due_in_cents" INTEGER,
    "amount_paid_in_cents" INTEGER,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "period_start_at" TIMESTAMP(3),
    "period_end_at" TIMESTAMP(3),
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_methods" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "company_subscription_id" INTEGER,
    "owner_user_id" INTEGER,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "external_payment_method_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "exp_month" INTEGER,
    "exp_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" BIGSERIAL NOT NULL,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "is_live_mode" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "processing_status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processing_attempts" INTEGER NOT NULL DEFAULT 0,
    "processing_started_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL DEFAULT 'SIGNUP',
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "resend_count" INTEGER NOT NULL DEFAULT 0,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_auth_identities_email_idx" ON "user_auth_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_identities_provider_provider_user_id_key" ON "user_auth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_identities_user_id_provider_key" ON "user_auth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_handoffs_code_hash_key" ON "auth_session_handoffs"("code_hash");

-- CreateIndex
CREATE INDEX "auth_session_handoffs_expires_at_idx" ON "auth_session_handoffs"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code");

-- CreateIndex
CREATE INDEX "companies_created_by_user_id_idx" ON "companies"("created_by_user_id");

-- CreateIndex
CREATE INDEX "company_units_company_id_idx" ON "company_units"("company_id");

-- CreateIndex
CREATE INDEX "company_units_parent_unit_id_idx" ON "company_units"("parent_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_units_company_id_code_key" ON "company_units"("company_id", "code");

-- CreateIndex
CREATE INDEX "memberships_company_id_idx" ON "memberships"("company_id");

-- CreateIndex
CREATE INDEX "memberships_company_role_id_idx" ON "memberships"("company_role_id");

-- CreateIndex
CREATE INDEX "memberships_status_idx" ON "memberships"("status");

-- CreateIndex
CREATE INDEX "memberships_company_id_status_idx" ON "memberships"("company_id", "status");

-- CreateIndex
CREATE INDEX "user_table_preferences_company_id_idx" ON "user_table_preferences"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_table_preferences_user_id_company_id_module_key_key" ON "user_table_preferences"("user_id", "company_id", "module_key");

-- CreateIndex
CREATE INDEX "membership_unit_access_company_id_unit_id_idx" ON "membership_unit_access"("company_id", "unit_id");

-- CreateIndex
CREATE INDEX "membership_unit_access_company_role_id_idx" ON "membership_unit_access"("company_role_id");

-- CreateIndex
CREATE INDEX "company_roles_company_id_is_active_idx" ON "company_roles"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "company_roles_unit_id_idx" ON "company_roles"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_company_id_unit_id_code_key" ON "company_roles"("company_id", "unit_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "module_systems_code_key" ON "module_systems"("code");

-- CreateIndex
CREATE INDEX "module_systems_is_active_sort_order_idx" ON "module_systems"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "module_system_modules_module_id_is_active_idx" ON "module_system_modules"("module_id", "is_active");

-- CreateIndex
CREATE INDEX "module_system_modules_system_id_is_active_sort_order_idx" ON "module_system_modules"("system_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "module_system_modules_system_id_module_id_key" ON "module_system_modules"("system_id", "module_id");

-- CreateIndex
CREATE INDEX "module_system_sidebar_system_id_parent_id_sort_order_idx" ON "module_system_sidebar"("system_id", "parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "module_system_sidebar_module_id_idx" ON "module_system_sidebar"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_system_sidebar_system_id_key_key" ON "module_system_sidebar"("system_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_id_is_active_idx" ON "permissions"("module_id", "is_active");

-- CreateIndex
CREATE INDEX "company_role_permissions_permission_id_idx" ON "company_role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_role_permissions_company_role_id_permission_id_key" ON "company_role_permissions"("company_role_id", "permission_id");

-- CreateIndex
CREATE INDEX "membership_permissions_permission_id_idx" ON "membership_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "membership_permissions_membership_company_id_idx" ON "membership_permissions"("membership_company_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_permissions_membership_user_id_membership_compan_key" ON "membership_permissions"("membership_user_id", "membership_company_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_sidebar_preferences_scope_idx" ON "user_sidebar_preferences"("user_id", "company_id", "branch_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sidebar_preferences_scope_item_uq" ON "user_sidebar_preferences"("company_id", "branch_unit_id", "user_id", "item_key");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "regions_psgc_code_key" ON "regions"("psgc_code");

-- CreateIndex
CREATE UNIQUE INDEX "regions_region_code_key" ON "regions"("region_code");

-- CreateIndex
CREATE INDEX "regions_name_idx" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_psgc_code_key" ON "provinces"("psgc_code");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_province_code_key" ON "provinces"("province_code");

-- CreateIndex
CREATE INDEX "provinces_region_code_idx" ON "provinces"("region_code");

-- CreateIndex
CREATE INDEX "provinces_name_idx" ON "provinces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "city_municipalities_psgc_code_key" ON "city_municipalities"("psgc_code");

-- CreateIndex
CREATE UNIQUE INDEX "city_municipalities_city_municipality_code_key" ON "city_municipalities"("city_municipality_code");

-- CreateIndex
CREATE INDEX "city_municipalities_region_code_idx" ON "city_municipalities"("region_code");

-- CreateIndex
CREATE INDEX "city_municipalities_province_code_idx" ON "city_municipalities"("province_code");

-- CreateIndex
CREATE INDEX "city_municipalities_name_idx" ON "city_municipalities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "barangays_psgc_code_key" ON "barangays"("psgc_code");

-- CreateIndex
CREATE UNIQUE INDEX "barangays_barangay_code_key" ON "barangays"("barangay_code");

-- CreateIndex
CREATE INDEX "barangays_region_code_idx" ON "barangays"("region_code");

-- CreateIndex
CREATE INDEX "barangays_province_code_idx" ON "barangays"("province_code");

-- CreateIndex
CREATE INDEX "barangays_city_municipality_code_idx" ON "barangays"("city_municipality_code");

-- CreateIndex
CREATE INDEX "barangays_name_idx" ON "barangays"("name");

-- CreateIndex
CREATE UNIQUE INDEX "alphanumeric_tax_codes_source_key_key" ON "alphanumeric_tax_codes"("source_key");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_transaction_type_idx" ON "alphanumeric_tax_codes"("transaction_type");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_tax_type_idx" ON "alphanumeric_tax_codes"("tax_type");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_tax_code_idx" ON "alphanumeric_tax_codes"("tax_code");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_official_atc_code_idx" ON "alphanumeric_tax_codes"("official_atc_code");

-- CreateIndex
CREATE INDEX "form_signatory_setups_company_id_idx" ON "form_signatory_setups"("company_id");

-- CreateIndex
CREATE INDEX "form_signatory_setups_unit_id_idx" ON "form_signatory_setups"("unit_id");

-- CreateIndex
CREATE INDEX "form_signatory_setups_module_id_idx" ON "form_signatory_setups"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_signatory_setups_company_id_unit_id_module_id_key" ON "form_signatory_setups"("company_id", "unit_id", "module_id");

-- CreateIndex
CREATE INDEX "form_signatory_rows_setup_id_idx" ON "form_signatory_rows"("setup_id");

-- CreateIndex
CREATE INDEX "transaction_number_sequences_branch_unit_id_idx" ON "transaction_number_sequences"("branch_unit_id");

-- CreateIndex
CREATE INDEX "transaction_number_sequences_module_id_idx" ON "transaction_number_sequences"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_number_sequences_module_id_branch_unit_id_key" ON "transaction_number_sequences"("module_id", "branch_unit_id");

-- CreateIndex
CREATE INDEX "chart_accounts_parent_account_id_idx" ON "chart_accounts"("parent_account_id");

-- CreateIndex
CREATE INDEX "chart_accounts_status_idx" ON "chart_accounts"("status");

-- CreateIndex
CREATE INDEX "chart_accounts_company_status_idx" ON "chart_accounts"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chart_accounts_company_account_code_key" ON "chart_accounts"("company_id", "account_code");

-- CreateIndex
CREATE INDEX "default_accounts_company_status_idx" ON "default_accounts"("company_id", "status");

-- CreateIndex
CREATE INDEX "default_accounts_expense_coa_id_idx" ON "default_accounts"("expense_coa_id");

-- CreateIndex
CREATE INDEX "default_accounts_revenue_coa_id_idx" ON "default_accounts"("revenue_coa_id");

-- CreateIndex
CREATE INDEX "default_accounts_asset_coa_id_idx" ON "default_accounts"("asset_coa_id");

-- CreateIndex
CREATE INDEX "default_accounts_accumulated_depreciation_coa_id_idx" ON "default_accounts"("accumulated_depreciation_coa_id");

-- CreateIndex
CREATE UNIQUE INDEX "default_accounts_company_type_name_key" ON "default_accounts"("company_id", "type", "name");

-- CreateIndex
CREATE INDEX "bank_accounts_coa_id_idx" ON "bank_accounts"("coa_id");

-- CreateIndex
CREATE INDEX "bank_accounts_status_idx" ON "bank_accounts"("status");

-- CreateIndex
CREATE INDEX "bank_accounts_company_status_idx" ON "bank_accounts"("company_id", "status");

-- CreateIndex
CREATE INDEX "bank_accounts_company_bank_branch_number_idx" ON "bank_accounts"("company_id", "bank_name", "branch", "account_number");

-- CreateIndex
CREATE INDEX "terms_company_id_idx" ON "terms"("company_id");

-- CreateIndex
CREATE INDEX "terms_company_status_idx" ON "terms"("company_id", "status");

-- CreateIndex
CREATE INDEX "payment_types_company_id_idx" ON "payment_types"("company_id");

-- CreateIndex
CREATE INDEX "payment_types_company_status_idx" ON "payment_types"("company_id", "status");

-- CreateIndex
CREATE INDEX "payment_types_company_classification_idx" ON "payment_types"("company_id", "classification");

-- CreateIndex
CREATE UNIQUE INDEX "payment_types_company_name_key" ON "payment_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "discounts_chart_account_id_idx" ON "discounts"("chart_account_id");

-- CreateIndex
CREATE INDEX "discounts_company_status_idx" ON "discounts"("company_id", "status");

-- CreateIndex
CREATE INDEX "discounts_company_type_idx" ON "discounts"("company_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_company_name_key" ON "discounts"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_company_chart_account_key" ON "discounts"("company_id", "chart_account_id");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_status_idx" ON "responsibility_centers"("company_id", "status");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_category_idx" ON "responsibility_centers"("company_id", "category");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_financial_type_idx" ON "responsibility_centers"("company_id", "financial_type");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_parent_idx" ON "responsibility_centers"("company_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_centers_company_code_key" ON "responsibility_centers"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_centers_company_name_key" ON "responsibility_centers"("company_id", "name");

-- CreateIndex
CREATE INDEX "parties_company_id_idx" ON "parties"("company_id");

-- CreateIndex
CREATE INDEX "parties_company_status_idx" ON "parties"("company_id", "status");

-- CreateIndex
CREATE INDEX "parties_company_classification_idx" ON "parties"("company_id", "classification");

-- CreateIndex
CREATE INDEX "parties_term_id_idx" ON "parties"("term_id");

-- CreateIndex
CREATE INDEX "parties_default_receivable_account_id_idx" ON "parties"("default_receivable_account_id");

-- CreateIndex
CREATE INDEX "parties_customer_advance_account_id_idx" ON "parties"("customer_advance_account_id");

-- CreateIndex
CREATE INDEX "parties_default_payable_account_id_idx" ON "parties"("default_payable_account_id");

-- CreateIndex
CREATE INDEX "parties_vendor_advance_account_id_idx" ON "parties"("vendor_advance_account_id");

-- CreateIndex
CREATE INDEX "parties_employee_advance_account_id_idx" ON "parties"("employee_advance_account_id");

-- CreateIndex
CREATE INDEX "parties_employee_payable_account_id_idx" ON "parties"("employee_payable_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "parties_company_code_key" ON "parties"("company_id", "party_code_no");

-- CreateIndex
CREATE INDEX "party_addresses_party_id_idx" ON "party_addresses"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_scope_is_active_idx" ON "subscription_plans"("scope", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_prices_external_plan_id_key" ON "subscription_plan_prices"("external_plan_id");

-- CreateIndex
CREATE INDEX "subscription_plan_prices_billing_cycle_is_active_idx" ON "subscription_plan_prices"("billing_cycle", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_prices_subscription_plan_id_billing_cycle_key" ON "subscription_plan_prices"("subscription_plan_id", "billing_cycle");

-- CreateIndex
CREATE INDEX "subscription_plan_usage_rules_metric_is_active_idx" ON "subscription_plan_usage_rules"("metric", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_usage_rules_subscription_plan_id_metric_key" ON "subscription_plan_usage_rules"("subscription_plan_id", "metric");

-- CreateIndex
CREATE INDEX "subscription_plan_discount_tiers_metric_threshold_count_is_acti" ON "subscription_plan_discount_tiers"("metric", "threshold_count", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_discount_tiers_subscription_plan_id_metric_th" ON "subscription_plan_discount_tiers"("subscription_plan_id", "metric", "threshold_count");

-- CreateIndex
CREATE INDEX "subscription_plan_modules_module_id_is_enabled_idx" ON "subscription_plan_modules"("module_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_modules_subscription_plan_id_module_id_key" ON "subscription_plan_modules"("subscription_plan_id", "module_id");

-- CreateIndex
CREATE INDEX "subscription_plan_systems_system_id_is_enabled_idx" ON "subscription_plan_systems"("system_id", "is_enabled");

-- CreateIndex
CREATE INDEX "subscription_plan_systems_subscription_plan_id_is_enabled_idx" ON "subscription_plan_systems"("subscription_plan_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_systems_subscription_plan_id_system_id_key" ON "subscription_plan_systems"("subscription_plan_id", "system_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_drafts_user_id_key" ON "user_onboarding_drafts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_drafts_provisioned_company_id_key" ON "user_onboarding_drafts"("provisioned_company_id");

-- CreateIndex
CREATE INDEX "user_onboarding_drafts_subscription_plan_id_idx" ON "user_onboarding_drafts"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "user_onboarding_drafts_provisioned_company_id_idx" ON "user_onboarding_drafts"("provisioned_company_id");

-- CreateIndex
CREATE INDEX "user_onboarding_drafts_billing_completed_at_idx" ON "user_onboarding_drafts"("billing_completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_subscriptions_external_subscription_id_key" ON "company_subscriptions"("external_subscription_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_company_id_idx" ON "company_subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_subscription_plan_id_idx" ON "company_subscriptions"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_subscription_plan_price_id_idx" ON "company_subscriptions"("subscription_plan_price_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_billing_customer_id_idx" ON "company_subscriptions"("billing_customer_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_status_idx" ON "company_subscriptions"("status");

-- CreateIndex
CREATE INDEX "company_subscriptions_company_id_status_idx" ON "company_subscriptions"("company_id", "status");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_subscription_invoice_id_idx" ON "billing_payment_attempts"("subscription_invoice_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_company_id_idx" ON "billing_payment_attempts"("company_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_owner_user_id_idx" ON "billing_payment_attempts"("owner_user_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_company_subscription_id_idx" ON "billing_payment_attempts"("company_subscription_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_subscription_plan_id_idx" ON "billing_payment_attempts"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_subscription_plan_price_id_idx" ON "billing_payment_attempts"("subscription_plan_price_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_status_idx" ON "billing_payment_attempts"("status");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_application_status_idx" ON "billing_payment_attempts"("application_status");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_purpose_idx" ON "billing_payment_attempts"("purpose");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_created_at_idx" ON "billing_payment_attempts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_subscription_invoice_id_attempt_nu_key" ON "billing_payment_attempts"("subscription_invoice_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_provider_checkout_session_key" ON "billing_payment_attempts"("billing_provider", "external_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_provider_payment_intent_key" ON "billing_payment_attempts"("billing_provider", "external_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_provider_payment_key" ON "billing_payment_attempts"("billing_provider", "external_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_external_customer_id_key" ON "billing_customers"("external_customer_id");

-- CreateIndex
CREATE INDEX "billing_customers_owner_user_id_idx" ON "billing_customers"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_company_id_billing_provider_key" ON "billing_customers"("company_id", "billing_provider");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_external_invoice_id_key" ON "subscription_invoices"("external_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_invoice_number_key" ON "subscription_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "subscription_invoices_company_subscription_id_idx" ON "subscription_invoices"("company_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_company_id_idx" ON "subscription_invoices"("company_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_owner_user_id_idx" ON "subscription_invoices"("owner_user_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_onboarding_draft_id_idx" ON "subscription_invoices"("onboarding_draft_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_plan_id_idx" ON "subscription_invoices"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_plan_price_id_idx" ON "subscription_invoices"("subscription_plan_price_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices"("status");

-- CreateIndex
CREATE INDEX "subscription_invoices_purpose_idx" ON "subscription_invoices"("purpose");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_methods_external_payment_method_id_key" ON "billing_payment_methods"("external_payment_method_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_company_id_idx" ON "billing_payment_methods"("company_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_company_subscription_id_idx" ON "billing_payment_methods"("company_subscription_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_owner_user_id_idx" ON "billing_payment_methods"("owner_user_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_is_default_idx" ON "billing_payment_methods"("is_default");

-- CreateIndex
CREATE INDEX "billing_webhook_events_event_type_idx" ON "billing_webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "billing_webhook_events_processing_status_idx" ON "billing_webhook_events"("processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_billing_provider_event_id_key" ON "billing_webhook_events"("billing_provider", "event_id");

-- CreateIndex
CREATE INDEX "email_verification_codes_user_id_idx" ON "email_verification_codes"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_codes_email_idx" ON "email_verification_codes"("email");

-- CreateIndex
CREATE INDEX "email_verification_codes_purpose_idx" ON "email_verification_codes"("purpose");

-- AddForeignKey
ALTER TABLE "user_auth_identities" ADD CONSTRAINT "user_auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_units" ADD CONSTRAINT "company_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_units" ADD CONSTRAINT "company_units_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "company_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_table_preferences" ADD CONSTRAINT "user_table_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_table_preferences" ADD CONSTRAINT "user_table_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_unit_access" ADD CONSTRAINT "membership_unit_access_user_id_company_id_fkey" FOREIGN KEY ("user_id", "company_id") REFERENCES "memberships"("user_id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_unit_access" ADD CONSTRAINT "membership_unit_access_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_unit_access" ADD CONSTRAINT "membership_unit_access_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_modules" ADD CONSTRAINT "module_system_modules_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "module_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_modules" ADD CONSTRAINT "module_system_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_sidebar" ADD CONSTRAINT "module_system_sidebar_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "module_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_sidebar" ADD CONSTRAINT "module_system_sidebar_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_sidebar" ADD CONSTRAINT "module_system_sidebar_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "module_system_sidebar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_membership_user_id_membership_compa_fkey" FOREIGN KEY ("membership_user_id", "membership_company_id") REFERENCES "memberships"("user_id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sidebar_preferences" ADD CONSTRAINT "user_sidebar_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sidebar_preferences" ADD CONSTRAINT "user_sidebar_preferences_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sidebar_preferences" ADD CONSTRAINT "user_sidebar_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_region_code_fkey" FOREIGN KEY ("region_code") REFERENCES "regions"("region_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_municipalities" ADD CONSTRAINT "city_municipalities_region_code_fkey" FOREIGN KEY ("region_code") REFERENCES "regions"("region_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_municipalities" ADD CONSTRAINT "city_municipalities_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("province_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barangays" ADD CONSTRAINT "barangays_region_code_fkey" FOREIGN KEY ("region_code") REFERENCES "regions"("region_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barangays" ADD CONSTRAINT "barangays_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("province_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barangays" ADD CONSTRAINT "barangays_city_municipality_code_fkey" FOREIGN KEY ("city_municipality_code") REFERENCES "city_municipalities"("city_municipality_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatory_setups" ADD CONSTRAINT "form_signatory_setups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatory_setups" ADD CONSTRAINT "form_signatory_setups_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatory_setups" ADD CONSTRAINT "form_signatory_setups_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatory_rows" ADD CONSTRAINT "form_signatory_rows_setup_id_fkey" FOREIGN KEY ("setup_id") REFERENCES "form_signatory_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_number_sequences" ADD CONSTRAINT "transaction_number_sequences_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_number_sequences" ADD CONSTRAINT "transaction_number_sequences_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_accounts" ADD CONSTRAINT "default_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_accounts" ADD CONSTRAINT "default_accounts_expense_coa_id_fkey" FOREIGN KEY ("expense_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_accounts" ADD CONSTRAINT "default_accounts_revenue_coa_id_fkey" FOREIGN KEY ("revenue_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_accounts" ADD CONSTRAINT "default_accounts_asset_coa_id_fkey" FOREIGN KEY ("asset_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_accounts" ADD CONSTRAINT "default_accounts_accumulated_depreciation_coa_id_fkey" FOREIGN KEY ("accumulated_depreciation_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_coa_id_fkey" FOREIGN KEY ("coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_centers" ADD CONSTRAINT "responsibility_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_centers" ADD CONSTRAINT "responsibility_centers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_default_receivable_account_id_fkey" FOREIGN KEY ("default_receivable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_customer_advance_account_id_fkey" FOREIGN KEY ("customer_advance_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_default_payable_account_id_fkey" FOREIGN KEY ("default_payable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_vendor_advance_account_id_fkey" FOREIGN KEY ("vendor_advance_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_employee_advance_account_id_fkey" FOREIGN KEY ("employee_advance_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_employee_payable_account_id_fkey" FOREIGN KEY ("employee_payable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_addresses" ADD CONSTRAINT "party_addresses_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_prices" ADD CONSTRAINT "subscription_plan_prices_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_usage_rules" ADD CONSTRAINT "subscription_plan_usage_rules_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_discount_tiers" ADD CONSTRAINT "subscription_plan_discount_tiers_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_systems" ADD CONSTRAINT "subscription_plan_systems_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_systems" ADD CONSTRAINT "subscription_plan_systems_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "module_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_onboarding_drafts" ADD CONSTRAINT "user_onboarding_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_onboarding_drafts" ADD CONSTRAINT "user_onboarding_drafts_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_onboarding_drafts" ADD CONSTRAINT "user_onboarding_drafts_provisioned_company_id_fkey" FOREIGN KEY ("provisioned_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_subscription_plan_price_id_fkey" FOREIGN KEY ("subscription_plan_price_id") REFERENCES "subscription_plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_subscription_invoice_id_fkey" FOREIGN KEY ("subscription_invoice_id") REFERENCES "subscription_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_company_subscription_id_fkey" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_subscription_plan_price_id_fkey" FOREIGN KEY ("subscription_plan_price_id") REFERENCES "subscription_plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_company_subscription_id_fkey" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_company_subscription_id_fkey" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

