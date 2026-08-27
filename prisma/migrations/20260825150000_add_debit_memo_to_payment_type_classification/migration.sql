DELETE FROM "payment_types" WHERE "classification"::text IN ('CASH', 'NON_CASH_SETTLEMENT') OR "name" IN ('Cash', 'Non Cash Settlement', 'Non-Cash Settlement');

CREATE TYPE "PaymentTypeClassification_new" AS ENUM (
    'BANK_TRANSFER',
    'CHECK',
    'DIGITAL_WALLET',
    'DEBIT_MEMO'
);

ALTER TABLE "payment_types"
    ALTER COLUMN "classification" TYPE "PaymentTypeClassification_new"
    USING (
        CASE "classification"::text
            WHEN 'CASH' THEN 'BANK_TRANSFER'
            WHEN 'NON_CASH_SETTLEMENT' THEN 'DEBIT_MEMO'
            ELSE "classification"::text
        END
    )::"PaymentTypeClassification_new";

DROP TYPE "PaymentTypeClassification";
ALTER TYPE "PaymentTypeClassification_new" RENAME TO "PaymentTypeClassification";
