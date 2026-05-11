ALTER TABLE "subscription_plans"
ADD COLUMN "monthly_price_in_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "yearly_price_in_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "monthly_compare_at_in_cents" INTEGER,
ADD COLUMN "yearly_compare_at_in_cents" INTEGER;
