CREATE TYPE "SubscriptionPlanScope" AS ENUM ('ONBOARDING', 'ADDITIONAL_COMPANY');

ALTER TABLE "subscription_plans"
ADD COLUMN "scope" "SubscriptionPlanScope" NOT NULL DEFAULT 'ONBOARDING';

CREATE INDEX "subscription_plans_scope_is_active_idx"
ON "subscription_plans"("scope", "is_active");
