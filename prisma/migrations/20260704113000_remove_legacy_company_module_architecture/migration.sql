-- Phase 15: retire legacy company-specific module entitlement storage.
-- Runtime entitlements are now derived only from subscription plans and module systems.

DROP TABLE IF EXISTS "company_module_exceptions";

DROP TABLE IF EXISTS "company_modules";

DROP TYPE IF EXISTS "CompanyModuleExceptionReason";

DROP TYPE IF EXISTS "CompanyModuleExceptionEffect";
