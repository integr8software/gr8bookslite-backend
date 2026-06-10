INSERT INTO "platform_modules" ("code", "name", "sort_order", "is_active", "updated_at")
VALUES
  ('dashboard', 'Dashboard', 10, true, CURRENT_TIMESTAMP),
  ('maintenance', 'Maintenance', 20, true, CURRENT_TIMESTAMP),
  ('cash-receipt', 'Cash Receipt', 30, true, CURRENT_TIMESTAMP),
  ('cash-disbursement', 'Cash Disbursement', 40, true, CURRENT_TIMESTAMP),
  ('accounts-payable', 'Accounts Payable', 50, true, CURRENT_TIMESTAMP),
  ('general-journal', 'General Journal', 60, true, CURRENT_TIMESTAMP),
  ('sales', 'Sales', 70, true, CURRENT_TIMESTAMP),
  ('inventory', 'Inventory', 80, true, CURRENT_TIMESTAMP),
  ('purchasing', 'Purchasing', 90, true, CURRENT_TIMESTAMP),
  ('others', 'Others', 100, true, CURRENT_TIMESTAMP),
  ('reporting-analytics', 'Reporting & Analytics', 110, true, CURRENT_TIMESTAMP),
  ('system-administration', 'System Administration', 120, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

WITH "catalog" ("module_code", "code", "name", "route", "sort_order") AS (
  VALUES
    ('dashboard', 'dashboard-overview', 'Dashboard Overview', '/dashboard', 10),
    ('maintenance', 'maintenance-charts-of-accounts', 'Chart of Accounts', '/maintenance/charts-of-accounts', 10),
    ('maintenance', 'maintenance-party-management', 'Party Management', '/maintenance/party-management', 20),
    ('maintenance', 'maintenance-items', 'Items', '/maintenance/item-management/items', 30),
    ('maintenance', 'maintenance-item-category', 'Item Category', '/maintenance/item-management/item-category', 40),
    ('maintenance', 'maintenance-item-type', 'Item Type', '/maintenance/item-management/item-type', 50),
    ('maintenance', 'maintenance-warehouse-management', 'Warehouse Management', '/maintenance/warehouse-management', 60),
    ('maintenance', 'maintenance-discount-management', 'Discount Management', '/maintenance/discount-management', 70),
    ('maintenance', 'maintenance-term-management', 'Term Management', '/maintenance/term-management', 80),
    ('maintenance', 'maintenance-transaction-type', 'Transaction Type', '/maintenance/transaction-type', 90),
    ('maintenance', 'maintenance-responsibility-center', 'Responsibility Center', '/maintenance/responsibility-center', 100),
    ('maintenance', 'maintenance-form-signatory', 'Form Signatory', '/maintenance/form-signatory', 110),
    ('cash-receipt', 'cash-receipt-official-receipt', 'Official Receipt', '/cash-receipt/official-receipt', 10),
    ('cash-receipt', 'cash-receipt-collection-receipt', 'Collection Receipt', '/cash-receipt/collection-receipt', 20),
    ('cash-receipt', 'cash-receipt-acknowledgement-receipt', 'Acknowledgement Receipt', '/cash-receipt/acknowledgement-receipt', 30),
    ('cash-receipt', 'cash-receipt-provisional-receipt', 'Provisional Receipt', '/cash-receipt/provisional-receipt', 40),
    ('cash-receipt', 'cash-receipt-bank-reconciliation', 'Bank Reconciliation', '/cash-receipt/bank-reconciliation', 50),
    ('cash-receipt', 'cash-receipt-product-distribution-center-warehouse', 'Product Distribution Center Warehouse', '/cash-receipt/product-distribution-center-warehouse', 60),
    ('cash-disbursement', 'cash-disbursement-disbursement-voucher', 'Disbursement Voucher', '/cash-disbursement/disbursement-voucher', 10),
    ('cash-disbursement', 'cash-disbursement-cash-advance', 'Cash Advance', '/cash-disbursement/cash-advance', 20),
    ('cash-disbursement', 'cash-disbursement-cash-advance-multiple-entry', 'Cash Advance Multiple Entry', '/cash-disbursement/cash-advance-multiple-entry', 30),
    ('cash-disbursement', 'cash-disbursement-petty-cash-voucher', 'Petty Cash Voucher', '/cash-disbursement/petty-cash-voucher', 40),
    ('cash-disbursement', 'cash-disbursement-petty-cash-fund', 'Petty Cash Fund', '/cash-disbursement/petty-cash-fund', 50),
    ('cash-disbursement', 'PCFR', 'Petty Cash Fund Replenishment', '/cash-disbursement/petty-cash-fund-replenishment', 60),
    ('cash-disbursement', 'cash-disbursement-petty-cash-advance', 'Petty Cash Advance', '/cash-disbursement/petty-cash-advance', 70),
    ('cash-disbursement', 'cash-disbursement-petty-cash-advance-replenishment', 'Petty Cash Advance Replenishment', '/cash-disbursement/petty-cash-advance-replenishment', 80),
    ('cash-disbursement', 'cash-disbursement-request-for-payment', 'Request For Payment', '/cash-disbursement/request-for-payment', 90),
    ('cash-disbursement', 'cash-disbursement-advances-to-supplier', 'Advances To Supplier', '/cash-disbursement/advances-to-supplier', 100),
    ('accounts-payable', 'accounts-payable-accounts-payable-voucher', 'Accounts Payable Voucher', '/accounts-payable/accounts-payable-voucher', 10),
    ('general-journal', 'general-journal-journal-voucher', 'Journal Voucher', '/general-journal/journal-voucher', 10),
    ('sales', 'sales-debit-memo', 'Debit Memo', '/sales/debit-memo', 10),
    ('sales', 'sales-credit-memo', 'Credit Memo', '/sales/credit-memo', 20),
    ('sales', 'sales-sales-quotation', 'Sales Quotation', '/sales/sales-quotation', 30),
    ('sales', 'sales-sales-order', 'Sales Order', '/sales/sales-order', 40),
    ('sales', 'sales-sales-invoice', 'Sales Invoice', '/sales/sales-invoice', 50),
    ('sales', 'sales-billing', 'Billing', '/sales/billing', 60),
    ('sales', 'sales-billing-statement', 'Billing Statement', '/sales/billing-statement', 70),
    ('sales', 'sales-billing-invoice', 'Billing Invoice', '/sales/billing-invoice', 80),
    ('sales', 'sales-service-invoice', 'Service Invoice', '/sales/service-invoice', 90),
    ('sales', 'sales-cash-sales-invoice', 'Cash Sales Invoice', '/sales/cash-sales-invoice', 100),
    ('sales', 'sales-sales-journal', 'Sales Journal', '/sales/sales-journal', 110),
    ('sales', 'sales-statement-of-account', 'Statement of Account', '/sales/statement-of-account', 120),
    ('inventory', 'inventory-receiving-report', 'Receiving Report', '/inventory/receiving-report', 10),
    ('inventory', 'inventory-goods-receipt', 'Goods Receipt', '/inventory/goods-receipt', 20),
    ('inventory', 'inventory-inventory-account', 'Inventory Account', '/inventory/inventory-account', 30),
    ('inventory', 'inventory-material-request', 'Material Request', '/inventory/material-request', 40),
    ('inventory', 'inventory-pick-list', 'Pick List', '/inventory/pick-list', 50),
    ('inventory', 'inventory-goods-issue', 'Goods Issue', '/inventory/goods-issue', 60),
    ('inventory', 'inventory-delivery-receipt', 'Delivery Receipt', '/inventory/delivery-receipt', 70),
    ('purchasing', 'purchasing-purchase-request', 'Purchase Request', '/purchasing/purchase-request', 10),
    ('purchasing', 'purchasing-canvass-form', 'Canvass Form', '/purchasing/canvass-form', 20),
    ('purchasing', 'purchasing-purchase-order', 'Purchase Order', '/purchasing/purchase-order', 30),
    ('purchasing', 'purchasing-purchase-journal', 'Purchase Journal', '/purchasing/purchase-journal', 40),
    ('others', 'others-fixed-asset', 'Fixed Asset', '/others/fixed-asset', 10),
    ('reporting-analytics', 'reports-maintenance', 'Report Maintenance', '/reports/maintenance', 10),
    ('reporting-analytics', 'reports-financial', 'Financial Reports', '/reports/financial', 20),
    ('reporting-analytics', 'reports-inventory', 'Inventory Reports', '/reports/inventory', 30),
    ('reporting-analytics', 'reports-bir', 'BIR Reports', '/reports/bir', 40),
    ('system-administration', 'maintenance-users', 'Users', '/system-administration/user-management/users', 10),
    ('system-administration', 'maintenance-user-role', 'User Role', '/system-administration/user-management/user-role', 20),
    ('system-administration', 'maintenance-approval', 'Approval Management', '/system-administration/approval-management', 30),
    ('system-administration', 'maintenance-audit', 'Audit Trail', '/system-administration/audit-trail', 40),
    ('system-administration', 'transaction-number-setup', 'Transaction Number Setup', '/system-administration/transaction-number-setup', 50),
    ('system-administration', 'system-administration-multi-currency-setup', 'Multi-Currency Setup', '/system-administration/multi-currency-setup', 60),
    ('system-administration', 'maintenance-mail', 'Mail Maintenance', '/system-administration/mail-maintenance', 70)
)
INSERT INTO "platform_submodules" (
  "module_id",
  "code",
  "name",
  "route",
  "sort_order",
  "is_active",
  "updated_at"
)
SELECT
  "module"."id",
  "catalog"."code",
  "catalog"."name",
  "catalog"."route",
  "catalog"."sort_order",
  true,
  CURRENT_TIMESTAMP
FROM "catalog"
JOIN "platform_modules" AS "module"
  ON "module"."code" = "catalog"."module_code"
ON CONFLICT ("code") DO UPDATE
SET
  "module_id" = EXCLUDED."module_id",
  "name" = EXCLUDED."name",
  "route" = EXCLUDED."route",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "permissions" (
  "target_type",
  "module_id",
  "submodule_id",
  "code",
  "name",
  "scope_level",
  "requires_company_context",
  "is_active",
  "updated_at"
)
SELECT
  'SUBMODULE'::"PermissionTargetType",
  "submodule"."module_id",
  "submodule"."id",
  "submodule"."code",
  "submodule"."name",
  'BRANCH'::"AccessScopeLevel",
  true,
  true,
  CURRENT_TIMESTAMP
FROM "platform_submodules" AS "submodule"
WHERE "submodule"."is_active" = true
ON CONFLICT ("code") DO UPDATE
SET
  "target_type" = EXCLUDED."target_type",
  "module_id" = EXCLUDED."module_id",
  "submodule_id" = EXCLUDED."submodule_id",
  "name" = EXCLUDED."name",
  "scope_level" = EXCLUDED."scope_level",
  "requires_company_context" = EXCLUDED."requires_company_context",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;
