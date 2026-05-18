/*
  Warnings:

  - You are about to drop the column `billing_cycle` on the `user_onboarding_drafts` table. All the data in the column will be lost.
  - You are about to drop the `tenant_connections` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[company_code]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[external_subscription_id]` on the table `company_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[monthly_external_plan_id]` on the table `subscription_plans` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[yearly_external_plan_id]` on the table `subscription_plans` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CompanyRoleType" AS ENUM ('ADMIN', 'USER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccessScopeLevel" AS ENUM ('COMPANY', 'SATELLITE', 'BRANCH');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('PAYMONGO');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'UNPAID';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'INCOMPLETE_CANCELED';

-- DropForeignKey
ALTER TABLE "tenant_connections" DROP CONSTRAINT "tenant_connections_company_id_fkey";

-- DropIndex
DROP INDEX "memberships_user_id_idx";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "company_code" TEXT,
ADD COLUMN     "legal_name" TEXT;

-- AlterTable
ALTER TABLE "company_subscriptions" ADD COLUMN     "billing_customer_id" INTEGER,
ADD COLUMN     "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_period_start_at" TIMESTAMP(3),
ADD COLUMN     "external_customer_id" TEXT,
ADD COLUMN     "external_payment_method_id" TEXT,
ADD COLUMN     "external_plan_id" TEXT,
ADD COLUMN     "external_subscription_id" TEXT,
ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_message" TEXT,
ADD COLUMN     "latest_invoice_external_id" TEXT,
ADD COLUMN     "latest_payment_intent_id" TEXT,
ADD COLUMN     "next_billing_at" TIMESTAMP(3),
ADD COLUMN     "raw_provider_payload" JSONB;

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "access_scope" "AccessScopeLevel" NOT NULL DEFAULT 'COMPANY',
ADD COLUMN     "company_role_id" INTEGER,
ADD COLUMN     "invited_at" TIMESTAMP(3),
ADD COLUMN     "invited_by_user_id" INTEGER,
ADD COLUMN     "joined_at" TIMESTAMP(3),
ADD COLUMN     "last_accessed_at" TIMESTAMP(3),
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspended_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "billing_metadata" JSONB,
ADD COLUMN     "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PHP',
ADD COLUMN     "monthly_external_plan_id" TEXT,
ADD COLUMN     "yearly_external_plan_id" TEXT,
ALTER COLUMN "monthly_price_in_cents" DROP DEFAULT,
ALTER COLUMN "yearly_price_in_cents" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_onboarding_drafts" DROP COLUMN "billing_cycle",
ADD COLUMN     "billingCycle" "BillingCycle",
ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "tenant_connections";

-- DropEnum
DROP TYPE "TenantStatus";

-- CreateTable
CREATE TABLE "company_roles" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role_type" "CompanyRoleType" NOT NULL DEFAULT 'CUSTOM',
    "scope_level" "AccessScopeLevel" NOT NULL DEFAULT 'COMPANY',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_modules" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope_level" "AccessScopeLevel" NOT NULL DEFAULT 'COMPANY',
    "requires_company_context" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_role_permissions" (
    "id" SERIAL NOT NULL,
    "company_role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_permissions" (
    "id" SERIAL NOT NULL,
    "membership_user_id" INTEGER NOT NULL,
    "membership_company_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "can_view" BOOLEAN,
    "can_create" BOOLEAN,
    "can_update" BOOLEAN,
    "can_delete" BOOLEAN,
    "can_approve" BOOLEAN,
    "can_export" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_modules" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER,
    "actor_user_id" INTEGER,
    "target_user_id" INTEGER,
    "module_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "owner_user_id" INTEGER,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "external_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "metadata" JSONB,
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" SERIAL NOT NULL,
    "company_subscription_id" INTEGER NOT NULL,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "external_invoice_id" TEXT NOT NULL,
    "external_payment_intent_id" TEXT,
    "status" TEXT NOT NULL,
    "billing_reason" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "amount_due_in_cents" INTEGER,
    "amount_paid_in_cents" INTEGER,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "period_start_at" TIMESTAMP(3),
    "period_end_at" TIMESTAMP(3),
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_methods" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "company_subscription_id" INTEGER,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "external_payment_method_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "exp_month" INTEGER,
    "exp_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" BIGSERIAL NOT NULL,
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "is_live_mode" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "processing_status" "WebhookProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processing_attempts" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_roles_company_id_is_active_idx" ON "company_roles"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_company_id_code_key" ON "company_roles"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_modules_code_key" ON "platform_modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_id_is_active_idx" ON "permissions"("module_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_id_code_key" ON "permissions"("module_id", "code");

-- CreateIndex
CREATE INDEX "company_role_permissions_permission_id_idx" ON "company_role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_role_permissions_company_role_id_permission_id_key" ON "company_role_permissions"("company_role_id", "permission_id");

-- CreateIndex
CREATE INDEX "membership_permissions_permission_id_idx" ON "membership_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "membership_permissions_membership_company_id_idx" ON "membership_permissions"("membership_company_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_permissions_membership_user_id_membership_compan_key" ON "membership_permissions"("membership_user_id", "membership_company_id", "permission_id");

-- CreateIndex
CREATE INDEX "company_modules_module_id_idx" ON "company_modules"("module_id");

-- CreateIndex
CREATE INDEX "company_modules_company_id_is_enabled_idx" ON "company_modules"("company_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "company_modules_company_id_module_id_key" ON "company_modules"("company_id", "module_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_external_customer_id_key" ON "billing_customers"("external_customer_id");

-- CreateIndex
CREATE INDEX "billing_customers_owner_user_id_idx" ON "billing_customers"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_company_id_billing_provider_key" ON "billing_customers"("company_id", "billing_provider");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_external_invoice_id_key" ON "subscription_invoices"("external_invoice_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_company_subscription_id_idx" ON "subscription_invoices"("company_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_methods_external_payment_method_id_key" ON "billing_payment_methods"("external_payment_method_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_company_id_idx" ON "billing_payment_methods"("company_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_company_subscription_id_idx" ON "billing_payment_methods"("company_subscription_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_is_default_idx" ON "billing_payment_methods"("is_default");

-- CreateIndex
CREATE INDEX "billing_webhook_events_event_type_idx" ON "billing_webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "billing_webhook_events_processing_status_idx" ON "billing_webhook_events"("processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_billing_provider_event_id_key" ON "billing_webhook_events"("billing_provider", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code");

-- CreateIndex
CREATE UNIQUE INDEX "company_subscriptions_external_subscription_id_key" ON "company_subscriptions"("external_subscription_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_billing_customer_id_idx" ON "company_subscriptions"("billing_customer_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_company_id_status_idx" ON "company_subscriptions"("company_id", "status");

-- CreateIndex
CREATE INDEX "memberships_company_role_id_idx" ON "memberships"("company_role_id");

-- CreateIndex
CREATE INDEX "memberships_status_idx" ON "memberships"("status");

-- CreateIndex
CREATE INDEX "memberships_company_id_status_idx" ON "memberships"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_monthly_external_plan_id_key" ON "subscription_plans"("monthly_external_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_yearly_external_plan_id_key" ON "subscription_plans"("yearly_external_plan_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_membership_user_id_membership_compa_fkey" FOREIGN KEY ("membership_user_id", "membership_company_id") REFERENCES "memberships"("user_id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_company_subscription_id_fkey" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_company_subscription_id_fkey" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
