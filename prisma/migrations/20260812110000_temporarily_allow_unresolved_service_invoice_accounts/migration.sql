ALTER TABLE "service_invoices"
ALTER COLUMN "receivable_account_id" DROP NOT NULL;

ALTER TABLE "journal_entry_detail"
ALTER COLUMN "account_id" DROP NOT NULL;
