CREATE TYPE "SubscriptionPlanStatus" AS ENUM (
    'ACTIVE',
    'DRAFT',
    'INACTIVE'
);

ALTER TABLE "subscription_plans"
ADD COLUMN "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "subscription_plans"
SET "status" = CASE
    WHEN "is_active" = true THEN 'ACTIVE'::"SubscriptionPlanStatus"
    ELSE 'INACTIVE'::"SubscriptionPlanStatus"
END;
