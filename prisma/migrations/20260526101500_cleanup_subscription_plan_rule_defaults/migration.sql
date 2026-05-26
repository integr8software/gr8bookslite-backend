ALTER TABLE "subscription_plan_prices"
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "subscription_plan_usage_rules"
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "subscription_plan_discount_tiers"
ALTER COLUMN "updated_at" DROP DEFAULT;
