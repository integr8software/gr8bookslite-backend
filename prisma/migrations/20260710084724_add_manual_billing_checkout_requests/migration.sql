-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "BillingPaymentPurpose" AS ENUM ('ONBOARDING', 'RENEWAL', 'ADDITIONAL_COMPANY');

-- CreateEnum
CREATE TYPE "BillingPaymentAttemptStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingApplicationStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'EXPIRED', 'UNCOLLECTIBLE');

-- Alter default after adding the lifecycle value.
ALTER TABLE "billing_webhook_events" ALTER COLUMN "processing_status" SET DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE "company_subscriptions" ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "billing_mode" "BillingMode" NOT NULL DEFAULT 'AUTO';

-- AlterTable
ALTER TABLE "billing_webhook_events" ADD COLUMN "processing_started_at" TIMESTAMP(3),
ADD COLUMN "next_retry_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscription_invoices" ALTER COLUMN "company_subscription_id" DROP NOT NULL,
ALTER COLUMN "external_invoice_id" DROP NOT NULL,
ALTER COLUMN "status" TYPE "SubscriptionInvoiceStatus" USING (
    CASE lower("status")
        WHEN 'draft' THEN 'DRAFT'
        WHEN 'open' THEN 'OPEN'
        WHEN 'paid' THEN 'PAID'
        WHEN 'void' THEN 'VOID'
        WHEN 'voided' THEN 'VOID'
        WHEN 'expired' THEN 'EXPIRED'
        WHEN 'uncollectible' THEN 'UNCOLLECTIBLE'
        ELSE 'OPEN'
    END
)::"SubscriptionInvoiceStatus",
ALTER COLUMN "status" SET DEFAULT 'OPEN',
ADD COLUMN "company_id" INTEGER,
ADD COLUMN "owner_user_id" INTEGER,
ADD COLUMN "onboarding_draft_id" INTEGER,
ADD COLUMN "subscription_plan_id" INTEGER,
ADD COLUMN "subscription_plan_price_id" INTEGER,
ADD COLUMN "purpose" "BillingPaymentPurpose",
ADD COLUMN "billing_mode" "BillingMode",
ADD COLUMN "invoice_number" TEXT,
ADD COLUMN "plan_code" TEXT,
ADD COLUMN "plan_name" TEXT,
ADD COLUMN "billing_cycle" "BillingCycle",
ADD COLUMN "description" TEXT,
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "unit_amount_in_cents" INTEGER,
ADD COLUMN "subtotal_in_cents" INTEGER,
ADD COLUMN "discount_in_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_in_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "total_amount_in_cents" INTEGER,
ADD COLUMN "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "billing_payment_attempts" (
    "id" SERIAL NOT NULL,
    "subscription_invoice_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "owner_user_id" INTEGER,
    "company_subscription_id" INTEGER,
    "subscription_plan_id" INTEGER NOT NULL,
    "subscription_plan_price_id" INTEGER,
    "purpose" "BillingPaymentPurpose" NOT NULL,
    "billing_mode" "BillingMode" NOT NULL DEFAULT 'MANUAL',
    "status" "BillingPaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "application_status" "BillingApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "billing_provider" "BillingProvider" NOT NULL DEFAULT 'PAYMONGO',
    "attempt_number" INTEGER NOT NULL,
    "external_checkout_session_id" TEXT,
    "external_payment_intent_id" TEXT,
    "external_payment_id" TEXT,
    "payment_method_type" TEXT,
    "amount_in_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "success_url" TEXT NOT NULL,
    "cancel_url" TEXT NOT NULL,
    "metadata" JSONB,
    "raw_provider_payload" JSONB,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "application_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_application_attempt_at" TIMESTAMP(3),
    "application_error" TEXT,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_invoice_number_key" ON "subscription_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_subscription_invoice_id_attempt_number_key" ON "billing_payment_attempts"("subscription_invoice_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_provider_checkout_session_key" ON "billing_payment_attempts"("billing_provider", "external_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_provider_payment_intent_key" ON "billing_payment_attempts"("billing_provider", "external_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_attempts_provider_payment_key" ON "billing_payment_attempts"("billing_provider", "external_payment_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_company_id_idx" ON "subscription_invoices"("company_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_owner_user_id_idx" ON "subscription_invoices"("owner_user_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_onboarding_draft_id_idx" ON "subscription_invoices"("onboarding_draft_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_plan_id_idx" ON "subscription_invoices"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_plan_price_id_idx" ON "subscription_invoices"("subscription_plan_price_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_purpose_idx" ON "subscription_invoices"("purpose");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_subscription_invoice_id_idx" ON "billing_payment_attempts"("subscription_invoice_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_company_id_idx" ON "billing_payment_attempts"("company_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_owner_user_id_idx" ON "billing_payment_attempts"("owner_user_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_company_subscription_id_idx" ON "billing_payment_attempts"("company_subscription_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_subscription_plan_id_idx" ON "billing_payment_attempts"("subscription_plan_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_subscription_plan_price_id_idx" ON "billing_payment_attempts"("subscription_plan_price_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_status_idx" ON "billing_payment_attempts"("status");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_application_status_idx" ON "billing_payment_attempts"("application_status");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_purpose_idx" ON "billing_payment_attempts"("purpose");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_created_at_idx" ON "billing_payment_attempts"("created_at");

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_subscription_invoice_id_fkey" FOREIGN KEY ("subscription_invoice_id") REFERENCES "subscription_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_company_subscription_id_fkey" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_subscription_plan_price_id_fkey" FOREIGN KEY ("subscription_plan_price_id") REFERENCES "subscription_plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
