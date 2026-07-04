-- Drop the redundant module_key dependency. module_id is the canonical module reference.
DROP INDEX IF EXISTS "subscription_plan_modules_module_key_is_enabled_idx";

ALTER TABLE "subscription_plan_modules"
  DROP CONSTRAINT IF EXISTS "subscription_plan_modules_subscription_plan_id_module_key_key";

ALTER TABLE "subscription_plan_modules"
  DROP COLUMN IF EXISTS "module_key";
