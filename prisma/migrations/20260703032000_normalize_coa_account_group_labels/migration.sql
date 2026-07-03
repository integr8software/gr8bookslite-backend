UPDATE "default_chart_accounts"
SET "account_group" = CASE "account_group"
  WHEN 'Major Acct Type' THEN 'Major Account'
  WHEN 'Sub Acct 1' THEN 'Sub Account 1'
  WHEN 'Sub Acct 2' THEN 'Sub Account 2'
  WHEN 'Sub Acct 3' THEN 'Sub Account 3'
  WHEN 'Specific Acct' THEN 'Specific Account'
  ELSE "account_group"
END
WHERE "account_group" IN (
  'Major Acct Type',
  'Sub Acct 1',
  'Sub Acct 2',
  'Sub Acct 3',
  'Specific Acct'
);

UPDATE "chart_accounts"
SET "account_group" = CASE "account_group"
  WHEN 'Major Acct Type' THEN 'Major Account'
  WHEN 'Sub Acct 1' THEN 'Sub Account 1'
  WHEN 'Sub Acct 2' THEN 'Sub Account 2'
  WHEN 'Sub Acct 3' THEN 'Sub Account 3'
  WHEN 'Specific Acct' THEN 'Specific Account'
  ELSE "account_group"
END
WHERE "account_group" IN (
  'Major Acct Type',
  'Sub Acct 1',
  'Sub Acct 2',
  'Sub Acct 3',
  'Specific Acct'
);
