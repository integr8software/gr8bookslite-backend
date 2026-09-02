ALTER TABLE "journal_entry_detail"
ADD COLUMN "particulars" VARCHAR(500);

UPDATE "journal_entry_detail" detail
SET "particulars" = header."particulars"
FROM "journal_entry_header" header
WHERE detail."company_id" = header."company_id"
  AND detail."jeno" = header."jeno"
  AND detail."particulars" IS NULL
  AND header."particulars" IS NOT NULL;
