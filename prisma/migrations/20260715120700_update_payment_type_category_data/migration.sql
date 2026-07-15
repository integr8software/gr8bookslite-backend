UPDATE "payment_types" p
SET "name" = 'Internal Bank Transfer',
    "description" = 'Transfer between bank accounts within the same company.'
WHERE p."name" = 'Bank Transfer within Company'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('Internal Bank Transfer')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types" p
SET "name" = 'Intercompany Bank Transfer',
    "description" = 'Transfer from a company bank account to another company.'
WHERE p."name" = 'Bank Transfer for Another Company'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('Intercompany Bank Transfer')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types" p
SET "name" = 'PESONet',
    "description" = 'Electronic fund transfer through PESONet.'
WHERE p."name" = 'PesoNet'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('PESONet')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types" p
SET "name" = 'E-Wallet',
    "description" = 'Digital wallet payment through an e-wallet provider.'
WHERE lower(p."name") IN ('ewallet', 'e-wallet')
  AND p."name" <> 'E-Wallet'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_types" existing
    WHERE existing."company_id" = p."company_id"
      AND lower(existing."name") = lower('E-Wallet')
      AND existing."id" <> p."id"
      AND existing."deleted_at" IS NULL
  );

UPDATE "payment_types"
SET "classification" = 'BANK_TRANSFER'
WHERE "name" IN (
  'Internal Bank Transfer',
  'Intercompany Bank Transfer',
  'InstaPay',
  'PESONet',
  'Bank Transfer within Company',
  'Bank Transfer for Another Company',
  'PesoNet'
);

UPDATE "payment_types"
SET "classification" = 'CASH'
WHERE "name" = 'Cash';

UPDATE "payment_types"
SET "classification" = 'CHECK'
WHERE "name" IN ('Check', 'Manager''s Check');

UPDATE "payment_types"
SET "classification" = 'DIGITAL_WALLET'
WHERE lower("name") IN ('ewallet', 'e-wallet');

UPDATE "payment_types"
SET "classification" = 'NON_CASH_SETTLEMENT'
WHERE "name" = 'Debit Memo';
