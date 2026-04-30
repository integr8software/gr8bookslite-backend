-- Standardize physical primary keys to `id` while keeping the database
-- naming style SQL-friendly: lowercase plural tables and snake_case columns.

-- Sequences
ALTER SEQUENCE "users_user_id_seq" RENAME TO "users_id_seq";
ALTER SEQUENCE "companies_company_id_seq" RENAME TO "companies_id_seq";
ALTER SEQUENCE "subscription_plans_subscription_plan_id_seq" RENAME TO "subscription_plans_id_seq";
ALTER SEQUENCE "company_subscriptions_company_subscription_id_seq" RENAME TO "company_subscriptions_id_seq";
ALTER SEQUENCE "email_verification_codes_email_verification_code_id_seq" RENAME TO "email_verification_codes_id_seq";

-- Primary key columns
ALTER TABLE "users" RENAME COLUMN "user_id" TO "id";
ALTER TABLE "companies" RENAME COLUMN "company_id" TO "id";
ALTER TABLE "subscription_plans" RENAME COLUMN "subscription_plan_id" TO "id";
ALTER TABLE "company_subscriptions" RENAME COLUMN "company_subscription_id" TO "id";
ALTER TABLE "email_verification_codes" RENAME COLUMN "email_verification_code_id" TO "id";

-- Foreign key constraints that reference renamed parent primary keys
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_user_id_fkey";
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_company_id_fkey";
ALTER TABLE "tenant_connections" DROP CONSTRAINT "tenant_connections_company_id_fkey";
ALTER TABLE "company_subscriptions" DROP CONSTRAINT "company_subscriptions_company_id_fkey";
ALTER TABLE "company_subscriptions" DROP CONSTRAINT "company_subscriptions_subscription_plan_id_fkey";
ALTER TABLE "email_verification_codes" DROP CONSTRAINT "email_verification_codes_user_id_fkey";

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_connections"
  ADD CONSTRAINT "tenant_connections_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_subscriptions"
  ADD CONSTRAINT "company_subscriptions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_subscriptions"
  ADD CONSTRAINT "company_subscriptions_subscription_plan_id_fkey"
  FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_verification_codes"
  ADD CONSTRAINT "email_verification_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
