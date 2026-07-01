ALTER TABLE "bank_accounts"
  ADD COLUMN "account_type" VARCHAR(50),
  ADD COLUMN "series_start" VARCHAR(50),
  ADD COLUMN "series_end" VARCHAR(50),
  ADD COLUMN "series_digits" INTEGER,
  ADD COLUMN "currency_exchange_rate" DECIMAL(18, 2),
  ADD COLUMN "created_by_user_id" INTEGER,
  ADD COLUMN "updated_by_user_id" INTEGER;

CREATE INDEX "bank_accounts_company_bank_branch_number_idx"
  ON "bank_accounts"("company_id", "bank_name", "branch", "account_number");
