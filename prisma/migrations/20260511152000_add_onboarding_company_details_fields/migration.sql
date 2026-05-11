CREATE TYPE "TaxpayerType" AS ENUM ('INDIVIDUAL', 'NON_INDIVIDUAL');

ALTER TABLE "companies"
ADD COLUMN "taxpayer_type" "TaxpayerType",
ADD COLUMN "owner_last_name" TEXT,
ADD COLUMN "owner_first_name" TEXT,
ADD COLUMN "owner_middle_name" TEXT,
ADD COLUMN "organization_type" TEXT,
ADD COLUMN "organization_type_other" TEXT,
ADD COLUMN "logo_file_name" TEXT,
ADD COLUMN "logo_mime_type" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "tin" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "contact_number" TEXT,
ADD COLUMN "report_start_date" TIMESTAMP(3),
ADD COLUMN "report_end_date" TIMESTAMP(3);

ALTER TABLE "user_onboarding_drafts"
ADD COLUMN "taxpayer_type" "TaxpayerType",
ADD COLUMN "owner_last_name" TEXT,
ADD COLUMN "owner_first_name" TEXT,
ADD COLUMN "owner_middle_name" TEXT,
ADD COLUMN "company_name" TEXT,
ADD COLUMN "organization_type" TEXT,
ADD COLUMN "organization_type_other" TEXT,
ADD COLUMN "logo_file_name" TEXT,
ADD COLUMN "logo_mime_type" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "tin" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "contact_number" TEXT,
ADD COLUMN "report_start_date" TIMESTAMP(3),
ADD COLUMN "report_end_date" TIMESTAMP(3),
ADD COLUMN "company_details_completed_at" TIMESTAMP(3);
