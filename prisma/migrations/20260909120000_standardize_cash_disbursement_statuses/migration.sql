-- Convert legacy APPROVED statuses to POSTED before removing APPROVED enum values.

ALTER TABLE "accounts_payable_vouchers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "accounts_payable_vouchers" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "accounts_payable_vouchers" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "AccountsPayableVoucherStatus";
CREATE TYPE "AccountsPayableVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "accounts_payable_vouchers" ALTER COLUMN "status" TYPE "AccountsPayableVoucherStatus" USING "status"::"AccountsPayableVoucherStatus";
ALTER TABLE "accounts_payable_vouchers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "cash_advances" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cash_advances" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "cash_advances" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "CashAdvanceStatus";
CREATE TYPE "CashAdvanceStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "cash_advances" ALTER COLUMN "status" TYPE "CashAdvanceStatus" USING "status"::"CashAdvanceStatus";
ALTER TABLE "cash_advances" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "advances_to_suppliers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "advances_to_suppliers" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "advances_to_suppliers" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "AdvanceToSupplierStatus";
CREATE TYPE "AdvanceToSupplierStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "advances_to_suppliers" ALTER COLUMN "status" TYPE "AdvanceToSupplierStatus" USING "status"::"AdvanceToSupplierStatus";
ALTER TABLE "advances_to_suppliers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "cash_vouchers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cash_vouchers" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "cash_vouchers" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "CashVoucherStatus";
CREATE TYPE "CashVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "cash_vouchers" ALTER COLUMN "status" TYPE "CashVoucherStatus" USING "status"::"CashVoucherStatus";
ALTER TABLE "cash_vouchers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "disbursement_vouchers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "disbursement_vouchers" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "disbursement_vouchers" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "DisbursementVoucherStatus";
CREATE TYPE "DisbursementVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "disbursement_vouchers" ALTER COLUMN "status" TYPE "DisbursementVoucherStatus" USING "status"::"DisbursementVoucherStatus";
ALTER TABLE "disbursement_vouchers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "petty_cash_vouchers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "petty_cash_vouchers" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "petty_cash_vouchers" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "PettyCashVoucherStatus";
CREATE TYPE "PettyCashVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "petty_cash_vouchers" ALTER COLUMN "status" TYPE "PettyCashVoucherStatus" USING "status"::"PettyCashVoucherStatus";
ALTER TABLE "petty_cash_vouchers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "petty_cash_funds" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "PettyCashFundStatus";
CREATE TYPE "PettyCashFundStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" TYPE "PettyCashFundStatus" USING "status"::"PettyCashFundStatus";
ALTER TABLE "petty_cash_funds" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "petty_cash_replenishments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "petty_cash_replenishments" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "petty_cash_replenishments" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "PettyCashReplenishmentStatus";
CREATE TYPE "PettyCashReplenishmentStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "petty_cash_replenishments" ALTER COLUMN "status" TYPE "PettyCashReplenishmentStatus" USING "status"::"PettyCashReplenishmentStatus";
ALTER TABLE "petty_cash_replenishments" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "revolving_funds" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "revolving_funds" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "revolving_funds" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "RevolvingFundStatus";
CREATE TYPE "RevolvingFundStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "revolving_funds" ALTER COLUMN "status" TYPE "RevolvingFundStatus" USING "status"::"RevolvingFundStatus";
ALTER TABLE "revolving_funds" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "revolving_fund_replenishments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "revolving_fund_replenishments" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "revolving_fund_replenishments" SET "status" = 'POSTED' WHERE "status" = 'APPROVED';
DROP TYPE "RevolvingFundReplenishmentStatus";
CREATE TYPE "RevolvingFundReplenishmentStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');
ALTER TABLE "revolving_fund_replenishments" ALTER COLUMN "status" TYPE "RevolvingFundReplenishmentStatus" USING "status"::"RevolvingFundReplenishmentStatus";
ALTER TABLE "revolving_fund_replenishments" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
