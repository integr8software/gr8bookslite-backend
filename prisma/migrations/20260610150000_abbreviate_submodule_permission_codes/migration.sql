CREATE TEMPORARY TABLE "permission_abbreviations" (
  "name" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO "permission_abbreviations" ("name", "code")
VALUES
  ('Dashboard Overview', 'DO'),
  ('Chart of Accounts', 'COA'),
  ('Party Management', 'PM'),
  ('Items', 'I'),
  ('Item Category', 'IC'),
  ('Item Type', 'IT'),
  ('Warehouse Management', 'WM'),
  ('Discount Management', 'DSM'),
  ('Term Management', 'TM'),
  ('Transaction Type', 'TT'),
  ('Responsibility Center', 'RC'),
  ('Form Signatory', 'FS'),
  ('Official Receipt', 'OR'),
  ('Collection Receipt', 'CR'),
  ('Acknowledgement Receipt', 'AR'),
  ('Provisional Receipt', 'PVR'),
  ('Bank Reconciliation', 'BR'),
  ('Product Distribution Center Warehouse', 'PDCW'),
  ('Disbursement Voucher', 'DV'),
  ('Cash Advance', 'CA'),
  ('Cash Advance Multiple Entry', 'CAME'),
  ('Petty Cash Voucher', 'PCV'),
  ('Petty Cash Fund', 'PCF'),
  ('Petty Cash Fund Replenishment', 'PCFR'),
  ('Petty Cash Advance', 'PCA'),
  ('Petty Cash Advance Replenishment', 'PCAR'),
  ('Request For Payment', 'RFP'),
  ('Advances To Supplier', 'ATS'),
  ('Accounts Payable Voucher', 'APV'),
  ('Journal Voucher', 'JV'),
  ('Debit Memo', 'DM'),
  ('Credit Memo', 'CM'),
  ('Sales Quotation', 'SQ'),
  ('Sales Order', 'SO'),
  ('Sales Invoice', 'SI'),
  ('Billing', 'B'),
  ('Billing Statement', 'BS'),
  ('Billing Invoice', 'BI'),
  ('Service Invoice', 'SVI'),
  ('Cash Sales Invoice', 'CSI'),
  ('Sales Journal', 'SJ'),
  ('Statement of Account', 'SOA'),
  ('Receiving Report', 'RR'),
  ('Goods Receipt', 'GR'),
  ('Inventory Account', 'IA'),
  ('Material Request', 'MR'),
  ('Pick List', 'PL'),
  ('Goods Issue', 'GI'),
  ('Delivery Receipt', 'DR'),
  ('Purchase Request', 'PR'),
  ('Canvass Form', 'CF'),
  ('Purchase Order', 'PO'),
  ('Purchase Journal', 'PJ'),
  ('Fixed Asset', 'FA'),
  ('Report Maintenance', 'RM'),
  ('Financial Reports', 'FR'),
  ('Inventory Reports', 'IR'),
  ('BIR Reports', 'BIRR'),
  ('Users', 'U'),
  ('User Role', 'UR'),
  ('Approval Management', 'AM'),
  ('Audit Trail', 'AT'),
  ('Transaction Number Setup', 'TNS'),
  ('Multi-Currency Setup', 'MCS'),
  ('Mail Maintenance', 'MM');

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM "permission_abbreviations"
  ) <> 65 THEN
    RAISE EXCEPTION 'Expected exactly 65 permission abbreviations.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "platform_submodules" AS "submodule"
    LEFT JOIN "permission_abbreviations" AS "mapping"
      ON "mapping"."name" = "submodule"."name"
    WHERE "submodule"."is_active" = true
      AND "mapping"."code" IS NULL
  ) THEN
    RAISE EXCEPTION 'Every active submodule must have an abbreviation.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "permissions" AS "permission"
    LEFT JOIN "permission_abbreviations" AS "mapping"
      ON "mapping"."name" = "permission"."name"
    WHERE "permission"."is_active" = true
      AND "mapping"."code" IS NULL
  ) THEN
    RAISE EXCEPTION 'Every active permission must have an abbreviation.';
  END IF;
END $$;

UPDATE "platform_submodules" AS "submodule"
SET
  "code" = '__ABBR_SUBMODULE_' || "submodule"."id",
  "updated_at" = CURRENT_TIMESTAMP
FROM "permission_abbreviations" AS "mapping"
WHERE "mapping"."name" = "submodule"."name"
  AND "submodule"."is_active" = true;

UPDATE "permissions" AS "permission"
SET
  "code" = '__ABBR_PERMISSION_' || "permission"."id",
  "updated_at" = CURRENT_TIMESTAMP
FROM "permission_abbreviations" AS "mapping"
WHERE "mapping"."name" = "permission"."name"
  AND "permission"."is_active" = true;

UPDATE "platform_submodules" AS "submodule"
SET
  "code" = "mapping"."code",
  "updated_at" = CURRENT_TIMESTAMP
FROM "permission_abbreviations" AS "mapping"
WHERE "mapping"."name" = "submodule"."name"
  AND "submodule"."is_active" = true;

UPDATE "permissions" AS "permission"
SET
  "code" = "mapping"."code",
  "updated_at" = CURRENT_TIMESTAMP
FROM "permission_abbreviations" AS "mapping"
WHERE "mapping"."name" = "permission"."name"
  AND "permission"."is_active" = true;

UPDATE "platform_modules"
SET
  "code" = 'cash-disbursement',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'CD';
