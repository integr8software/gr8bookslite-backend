-- Drop the obsolete old Petty Cash Voucher table. The former Petty Cash Fund
-- table is renamed below and becomes the only Petty Cash Voucher table.
DROP TABLE IF EXISTS "petty_cash_vouchers";

-- Move former Petty Cash Fund records onto the Petty Cash Voucher status enum.
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" TYPE "PettyCashVoucherStatus" USING "status"::"PettyCashVoucherStatus";
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE IF EXISTS "PettyCashFundStatus";

-- Rename the former Petty Cash Fund tables into Petty Cash Voucher tables.
ALTER TABLE "petty_cash_funds" RENAME TO "petty_cash_vouchers";
ALTER TABLE "petty_cash_fund_details" RENAME TO "petty_cash_voucher_details";
ALTER TABLE "petty_cash_voucher_details" RENAME COLUMN "fund_id" TO "voucher_id";

-- Rename primary keys and foreign keys.
ALTER TABLE "petty_cash_vouchers" RENAME CONSTRAINT "petty_cash_funds_pkey" TO "petty_cash_vouchers_pkey";
ALTER TABLE "petty_cash_vouchers" RENAME CONSTRAINT "petty_cash_funds_company_id_fkey" TO "petty_cash_vouchers_company_id_fkey";
ALTER TABLE "petty_cash_vouchers" RENAME CONSTRAINT "petty_cash_funds_branch_unit_id_fkey" TO "petty_cash_vouchers_branch_unit_id_fkey";
ALTER TABLE "petty_cash_vouchers" RENAME CONSTRAINT "petty_cash_funds_party_id_fkey" TO "petty_cash_vouchers_party_id_fkey";
ALTER TABLE "petty_cash_vouchers" RENAME CONSTRAINT "petty_cash_funds_credit_account_id_fkey" TO "petty_cash_vouchers_credit_account_id_fkey";
ALTER TABLE "petty_cash_vouchers" RENAME CONSTRAINT "petty_cash_funds_responsibility_center_id_fkey" TO "petty_cash_vouchers_responsibility_center_id_fkey";

ALTER TABLE "petty_cash_voucher_details" RENAME CONSTRAINT "petty_cash_fund_details_pkey" TO "petty_cash_voucher_details_pkey";
ALTER TABLE "petty_cash_voucher_details" RENAME CONSTRAINT "petty_cash_fund_details_fund_id_fkey" TO "petty_cash_voucher_details_voucher_id_fkey";
ALTER TABLE "petty_cash_voucher_details" RENAME CONSTRAINT "petty_cash_fund_details_company_id_fkey" TO "petty_cash_voucher_details_company_id_fkey";
ALTER TABLE "petty_cash_voucher_details" RENAME CONSTRAINT "petty_cash_fund_details_branch_unit_id_fkey" TO "petty_cash_voucher_details_branch_unit_id_fkey";
ALTER TABLE "petty_cash_voucher_details" RENAME CONSTRAINT "petty_cash_fund_details_party_id_fkey" TO "petty_cash_voucher_details_party_id_fkey";
ALTER TABLE "petty_cash_voucher_details" RENAME CONSTRAINT "petty_cash_fund_details_responsibility_center_id_fkey" TO "petty_cash_voucher_details_responsibility_center_id_fkey";

-- Rename indexes.
ALTER INDEX "petty_cash_funds_company_status_idx" RENAME TO "petty_cash_vouchers_company_status_idx";
ALTER INDEX "petty_cash_funds_company_document_date_idx" RENAME TO "petty_cash_vouchers_company_document_date_idx";
ALTER INDEX "petty_cash_funds_party_id_idx" RENAME TO "petty_cash_vouchers_party_id_idx";
ALTER INDEX "petty_cash_funds_company_transaction_no_key" RENAME TO "petty_cash_vouchers_company_transaction_no_key";

ALTER INDEX "petty_cash_fund_details_company_idx" RENAME TO "petty_cash_voucher_details_company_idx";
ALTER INDEX "petty_cash_fund_details_party_id_idx" RENAME TO "petty_cash_voucher_details_party_id_idx";
ALTER INDEX "petty_cash_fund_details_fund_line_key" RENAME TO "petty_cash_voucher_details_voucher_line_key";
