CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TABLE "company_subscriptions"
ADD COLUMN "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

CREATE TABLE "user_onboarding_drafts" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "subscription_plan_id" INTEGER,
  "billing_cycle" "BillingCycle",
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
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_onboarding_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_onboarding_drafts_user_id_key"
ON "user_onboarding_drafts"("user_id");

CREATE INDEX "user_onboarding_drafts_subscription_plan_id_idx"
ON "user_onboarding_drafts"("subscription_plan_id");

CREATE INDEX "user_onboarding_drafts_billing_completed_at_idx"
ON "user_onboarding_drafts"("billing_completed_at");

ALTER TABLE "user_onboarding_drafts"
ADD CONSTRAINT "user_onboarding_drafts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_onboarding_drafts"
ADD CONSTRAINT "user_onboarding_drafts_subscription_plan_id_fkey"
FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
