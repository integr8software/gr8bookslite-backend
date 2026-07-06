UPDATE "default_chart_accounts"
SET "account_group" = CASE "account_level"
  WHEN 'MAJOR' THEN 'Major Acct Type'
  WHEN 'SUB1' THEN 'Sub Acct 1'
  WHEN 'SUB2' THEN 'Sub Acct 2'
  WHEN 'SUB3' THEN 'Sub Acct 3'
  WHEN 'SPECIFIC' THEN 'Specific Acct'
  ELSE "account_group"
END
WHERE "account_group" IS NULL
   OR BTRIM("account_group") = '';

UPDATE "chart_accounts"
SET "account_group" = CASE "account_level"
  WHEN 'MAJOR' THEN 'Major Acct Type'
  WHEN 'SUB1' THEN 'Sub Acct 1'
  WHEN 'SUB2' THEN 'Sub Acct 2'
  WHEN 'SUB3' THEN 'Sub Acct 3'
  WHEN 'SPECIFIC' THEN 'Specific Acct'
  ELSE "account_group"
END
WHERE "account_group" IS NULL
   OR BTRIM("account_group") = '';
