ALTER TYPE "BillingCycle" ADD VALUE IF NOT EXISTS 'QUARTERLY';

CREATE TYPE "BillingIntervalUnit" AS ENUM ('DAY', 'MONTH', 'YEAR');
CREATE TYPE "SubscriptionUsageMetric" AS ENUM ('COMPANY', 'BRANCH', 'SATELLITE', 'USER');

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
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_plan_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_plan_usage_rules" (
  "id" SERIAL NOT NULL,
  "subscription_plan_id" INTEGER NOT NULL,
  "metric" "SubscriptionUsageMetric" NOT NULL,
  "free_count" INTEGER NOT NULL DEFAULT 0,
  "unit_price_in_cents" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_plan_usage_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_plan_discount_tiers" (
  "id" SERIAL NOT NULL,
  "subscription_plan_id" INTEGER NOT NULL,
  "metric" "SubscriptionUsageMetric" NOT NULL,
  "threshold_count" INTEGER NOT NULL,
  "discount_percent" DECIMAL(5,2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_plan_discount_tiers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "company_subscriptions"
ADD COLUMN "subscription_plan_price_id" INTEGER;

INSERT INTO "subscription_plan_prices" (
  "subscription_plan_id",
  "billing_cycle",
  "interval_count",
  "interval_unit",
  "price_in_cents",
  "compare_at_in_cents",
  "external_plan_id",
  "is_active"
)
SELECT
  "id",
  'MONTHLY',
  1,
  'MONTH',
  "monthly_price_in_cents",
  "monthly_compare_at_in_cents",
  "monthly_external_plan_id",
  "is_active"
FROM "subscription_plans";

INSERT INTO "subscription_plan_prices" (
  "subscription_plan_id",
  "billing_cycle",
  "interval_count",
  "interval_unit",
  "price_in_cents",
  "compare_at_in_cents",
  "external_plan_id",
  "is_active"
)
SELECT
  "id",
  'YEARLY',
  1,
  'YEAR',
  "yearly_price_in_cents",
  "yearly_compare_at_in_cents",
  "yearly_external_plan_id",
  "is_active"
FROM "subscription_plans";

UPDATE "company_subscriptions" AS subscription
SET "subscription_plan_price_id" = price."id"
FROM "subscription_plan_prices" AS price
WHERE price."subscription_plan_id" = subscription."subscription_plan_id"
  AND price."billing_cycle" = subscription."billing_cycle";

CREATE UNIQUE INDEX "subscription_plan_prices_subscription_plan_id_billing_cycle_key"
ON "subscription_plan_prices"("subscription_plan_id", "billing_cycle");

CREATE UNIQUE INDEX "subscription_plan_prices_external_plan_id_key"
ON "subscription_plan_prices"("external_plan_id");

CREATE INDEX "subscription_plan_prices_billing_cycle_is_active_idx"
ON "subscription_plan_prices"("billing_cycle", "is_active");

CREATE UNIQUE INDEX "subscription_plan_usage_rules_subscription_plan_id_metric_key"
ON "subscription_plan_usage_rules"("subscription_plan_id", "metric");

CREATE INDEX "subscription_plan_usage_rules_metric_is_active_idx"
ON "subscription_plan_usage_rules"("metric", "is_active");

CREATE UNIQUE INDEX "subscription_plan_discount_tiers_subscription_plan_id_metric_threshold_count_key"
ON "subscription_plan_discount_tiers"("subscription_plan_id", "metric", "threshold_count");

CREATE INDEX "subscription_plan_discount_tiers_metric_threshold_count_is_active_idx"
ON "subscription_plan_discount_tiers"("metric", "threshold_count", "is_active");

CREATE INDEX "company_subscriptions_subscription_plan_price_id_idx"
ON "company_subscriptions"("subscription_plan_price_id");

ALTER TABLE "subscription_plan_prices"
ADD CONSTRAINT "subscription_plan_prices_subscription_plan_id_fkey"
FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_plan_usage_rules"
ADD CONSTRAINT "subscription_plan_usage_rules_subscription_plan_id_fkey"
FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_plan_discount_tiers"
ADD CONSTRAINT "subscription_plan_discount_tiers_subscription_plan_id_fkey"
FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_subscriptions"
ADD CONSTRAINT "company_subscriptions_subscription_plan_price_id_fkey"
FOREIGN KEY ("subscription_plan_price_id") REFERENCES "subscription_plan_prices"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
