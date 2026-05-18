ALTER TABLE "companies"
ADD COLUMN "logo_storage_path" TEXT,
ADD COLUMN "logo_public_url" TEXT;

ALTER TABLE "user_onboarding_drafts"
ADD COLUMN "logo_storage_path" TEXT,
ADD COLUMN "logo_public_url" TEXT;
