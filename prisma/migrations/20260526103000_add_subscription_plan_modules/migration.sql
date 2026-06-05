CREATE TABLE "subscription_plan_modules" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "module_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plan_modules_subscription_plan_id_module_key_key"
ON "subscription_plan_modules"("subscription_plan_id", "module_key");

CREATE INDEX "subscription_plan_modules_module_key_is_enabled_idx"
ON "subscription_plan_modules"("module_key", "is_enabled");

ALTER TABLE "subscription_plan_modules"
ADD CONSTRAINT "subscription_plan_modules_subscription_plan_id_fkey"
FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
