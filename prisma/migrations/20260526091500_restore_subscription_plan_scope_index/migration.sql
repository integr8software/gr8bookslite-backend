CREATE INDEX IF NOT EXISTS "subscription_plans_scope_is_active_idx"
ON "subscription_plans"("scope", "is_active");
