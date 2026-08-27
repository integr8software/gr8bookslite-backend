CREATE TYPE "BankAccountType" AS ENUM (
    'CHECKING',
    'SAVINGS',
    'CURRENT',
    'TIME_DEPOSIT',
    'CREDIT_CARD'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "bank_accounts"
        WHERE "account_type" IS NOT NULL
          AND UPPER(REPLACE(TRIM("account_type"), '_', ' ')) NOT IN (
              'CHECKING',
              'SAVINGS',
              'CURRENT',
              'TIME DEPOSIT',
              'CREDIT CARD'
          )
    ) THEN
        RAISE EXCEPTION 'Cannot convert bank_accounts.account_type: unsupported values exist';
    END IF;
END $$;

ALTER TABLE "bank_accounts"
ALTER COLUMN "account_type" TYPE "BankAccountType"
USING (
    CASE UPPER(REPLACE(TRIM("account_type"), '_', ' '))
        WHEN 'CHECKING' THEN 'CHECKING'
        WHEN 'SAVINGS' THEN 'SAVINGS'
        WHEN 'CURRENT' THEN 'CURRENT'
        WHEN 'TIME DEPOSIT' THEN 'TIME_DEPOSIT'
        WHEN 'CREDIT CARD' THEN 'CREDIT_CARD'
        ELSE NULL
    END
)::"BankAccountType";
