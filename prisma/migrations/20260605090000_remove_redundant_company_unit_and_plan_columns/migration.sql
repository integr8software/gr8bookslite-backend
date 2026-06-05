ALTER TABLE "company_units"
  DROP COLUMN IF EXISTS "display_name";

ALTER TABLE "subscription_plans"
  DROP COLUMN IF EXISTS "monthly_price_in_cents",
  DROP COLUMN IF EXISTS "yearly_price_in_cents",
  DROP COLUMN IF EXISTS "monthly_compare_at_in_cents",
  DROP COLUMN IF EXISTS "yearly_compare_at_in_cents",
  DROP COLUMN IF EXISTS "monthly_external_plan_id",
  DROP COLUMN IF EXISTS "yearly_external_plan_id";
