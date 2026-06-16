UPDATE "chart_accounts"
SET
  "account_group" = CASE "account_level"
    WHEN 'MAJOR' THEN 'Major Acct Type'
    WHEN 'SUB1' THEN 'Sub Acct 1'
    WHEN 'SUB2' THEN 'Sub Acct 2'
    WHEN 'SUB3' THEN 'Sub Acct 3'
    WHEN 'SPECIFIC' THEN 'Specific Acct'
    ELSE "account_group"
  END,
  "report_alias" = CASE
    WHEN "account_type" IN ('REVENUE', 'EXPENSE') THEN 'Income Statement'
    ELSE 'Balance Sheet'
  END
WHERE "deleted_at" IS NULL;
