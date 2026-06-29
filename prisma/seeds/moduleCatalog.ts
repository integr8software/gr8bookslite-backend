import { ModuleCategory } from '@prisma/client';

export type ModuleCatalogEntry = {
  code: string;
  name: string;
  route: string;
  icon?: string;
  type?: string[];
  category?: ModuleCategory;
};

const Dashboard = ['dashboard'];
const Maintenance = ['maintenance'];
const MaintenanceRegistry = ['maintenance', 'registry'];
const TransactionRegistry = ['transaction', 'registry'];

export const ModuleCatalog: ModuleCatalogEntry[] = [
  { code: 'DO', name: 'Dashboard', route: '/dashboard', icon: 'dashboard', type: Dashboard },
  { code: 'COA', name: 'Chart of Accounts', route: '/maintenance/charts-of-accounts', icon: 'scale', type: Maintenance },
  { code: 'BM', name: 'Bank Masterfile', route: '/maintenance/bank-masterfile', icon: 'bank', type: Maintenance },
  { code: 'PM', name: 'Party Management', route: '/maintenance/party-management', icon: 'users', type: MaintenanceRegistry },
  { code: 'I', name: 'Items', route: '/maintenance/item-management/items', icon: 'package', type: MaintenanceRegistry },
  { code: 'IB', name: 'Item Bundles', route: '/maintenance/item-management/item-bundles', icon: 'packageCheck', type: Maintenance },
  { code: 'IC', name: 'Item Category', route: '/maintenance/item-management/item-category', icon: 'tags', type: Maintenance },
  { code: 'IA2', name: 'Item Attributes', route: '/maintenance/item-management/item-attributes', icon: 'clipboard', type: Maintenance },
  { code: 'UOM', name: 'Unit of Measurement', route: '/maintenance/item-management/unit-of-measurement', icon: 'ruler', type: Maintenance },
  { code: 'IPR', name: 'Item Promotions', route: '/maintenance/item-management/item-promotions', icon: 'promotion', type: Maintenance },
  { code: 'PLS', name: 'Price Lists', route: '/maintenance/item-management/price-lists', icon: 'tags', type: Maintenance },
  { code: 'WM', name: 'Warehouse', route: '/maintenance/warehouse-management', icon: 'warehouse', type: Maintenance },
  { code: 'WA', name: 'Warehouse Access', route: '/maintenance/warehouse-management/access', icon: 'shieldCheck', type: Maintenance },
  { code: 'WSL', name: 'Storage Locations', route: '/maintenance/warehouse-management/storage-locations', icon: 'mapPin', type: Maintenance },
  { code: 'WT', name: 'Warehouse Transfer', route: '/maintenance/warehouse-management/transfers', icon: 'arrowRightLeft', type: Maintenance },
  { code: 'WSI', name: 'Warehouse Stock Inquiry', route: '/maintenance/warehouse-management/stock-inquiry', icon: 'search', type: Maintenance },
  { code: 'DSM', name: 'Discount Management', route: '/maintenance/discount-management', icon: 'promotion', type: Maintenance },
  { code: 'TM', name: 'Term Management', route: '/maintenance/term-management', icon: 'calendar', type: Maintenance },
  { code: 'TT', name: 'Transaction Type', route: '/maintenance/transaction-type', icon: 'receipt', type: Maintenance },
  { code: 'PT', name: 'Payment Type', route: '/maintenance/payment-type', icon: 'creditCard', type: Maintenance },
  { code: 'RC', name: 'Responsibility Center', route: '/maintenance/responsibility-center', icon: 'target', type: Maintenance },
  { code: 'OR', name: 'Official Receipt', route: '/cash-receipt/official-receipt', icon: 'cashIn', type: TransactionRegistry },
  { code: 'CR', name: 'Collection Receipt', route: '/cash-receipt/collection-receipt', icon: 'cashIn', type: TransactionRegistry },
  { code: 'AR', name: 'Acknowledgement Receipt', route: '/cash-receipt/acknowledgement-receipt', icon: 'cashIn', type: TransactionRegistry },
  { code: 'PVR', name: 'Provisional Receipt', route: '/cash-receipt/provisional-receipt', icon: 'cashIn', type: TransactionRegistry },
  { code: 'BR', name: 'Bank Reconciliation', route: '/cash-receipt/bank-reconciliation', icon: 'cashIn', type: TransactionRegistry },
  { code: 'PDCW', name: 'Product Distribution Center Warehouse', route: '/cash-receipt/product-distribution-center-warehouse', icon: 'cashIn', type: TransactionRegistry },
  { code: 'DV', name: 'Disbursement Voucher', route: '/cash-disbursement/disbursement-voucher', icon: 'cashOut', type: TransactionRegistry },
  { code: 'CA', name: 'Cash Advance', route: '/cash-disbursement/cash-advance', icon: 'cashOut', type: TransactionRegistry },
  { code: 'CAME', name: 'Cash Advance Multiple Entry', route: '/cash-disbursement/cash-advance-multiple-entry', icon: 'cashOut', type: TransactionRegistry },
  { code: 'PCV', name: 'Petty Cash Voucher', route: '/cash-disbursement/petty-cash-voucher', icon: 'cashOut', type: TransactionRegistry },
  { code: 'PCF', name: 'Petty Cash Fund', route: '/cash-disbursement/petty-cash-fund', icon: 'cashOut', type: TransactionRegistry },
  { code: 'PCFR', name: 'Petty Cash Fund Replenishment', route: '/cash-disbursement/petty-cash-fund-replenishment', icon: 'cashOut', type: TransactionRegistry },
  { code: 'PCA', name: 'Petty Cash Advance', route: '/cash-disbursement/petty-cash-advance', icon: 'cashOut', type: TransactionRegistry },
  { code: 'PCAR', name: 'Petty Cash Advance Replenishment', route: '/cash-disbursement/petty-cash-advance-replenishment', icon: 'cashOut', type: TransactionRegistry },
  { code: 'RF', name: 'Revolving Fund', route: '/cash-disbursement/revolving-fund', icon: 'cashOut', type: TransactionRegistry },
  { code: 'RFP', name: 'Request For Payment', route: '/cash-disbursement/request-for-payment', icon: 'cashOut', type: TransactionRegistry },
  { code: 'ATS', name: 'Advances To Supplier', route: '/cash-disbursement/advances-to-supplier', icon: 'cashOut', type: TransactionRegistry },
  { code: 'APV', name: 'Accounts Payable Voucher', route: '/accounts-payable/accounts-payable-voucher', icon: 'payable', type: TransactionRegistry },
  { code: 'JV', name: 'Journal Voucher', route: '/general-journal/journal-voucher', icon: 'journal', type: TransactionRegistry },
  { code: 'DM', name: 'Debit Memo', route: '/sales/debit-memo', icon: 'sales', type: TransactionRegistry },
  { code: 'CM', name: 'Credit Memo', route: '/sales/credit-memo', icon: 'sales', type: TransactionRegistry },
  { code: 'SQ', name: 'Sales Quotation', route: '/sales/sales-quotation', icon: 'sales', type: TransactionRegistry },
  { code: 'SO', name: 'Sales Order', route: '/sales/sales-order', icon: 'sales', type: TransactionRegistry },
  { code: 'SI', name: 'Sales Invoice', route: '/sales/sales-invoice', icon: 'sales', type: TransactionRegistry },
  { code: 'B', name: 'Billing', route: '/sales/billing', icon: 'sales', type: TransactionRegistry },
  { code: 'BS', name: 'Billing Statement', route: '/sales/billing-statement', icon: 'sales', type: TransactionRegistry },
  { code: 'BI', name: 'Billing Invoice', route: '/sales/billing-invoice', icon: 'sales', type: TransactionRegistry },
  { code: 'SVI', name: 'Service Invoice', route: '/sales/service-invoice', icon: 'sales', type: TransactionRegistry },
  { code: 'CSI', name: 'Cash Sales Invoice', route: '/sales/cash-sales-invoice', icon: 'sales', type: TransactionRegistry },
  { code: 'SJ', name: 'Sales Journal', route: '/sales/sales-journal', icon: 'sales', type: TransactionRegistry },
  { code: 'SOA', name: 'Statement of Account', route: '/sales/statement-of-account', icon: 'sales', type: TransactionRegistry },
  { code: 'RR', name: 'Receiving Report', route: '/inventory/receiving-report', icon: 'inventory', type: TransactionRegistry },
  { code: 'GR', name: 'Goods Receipt', route: '/inventory/goods-receipt', icon: 'inventory', type: TransactionRegistry },
  { code: 'IA', name: 'Inventory Account', route: '/inventory/inventory-account', icon: 'inventory', type: TransactionRegistry },
  { code: 'MR', name: 'Material Request', route: '/inventory/material-request', icon: 'inventory', type: TransactionRegistry },
  { code: 'PL', name: 'Pick List', route: '/inventory/pick-list', icon: 'inventory', type: TransactionRegistry },
  { code: 'GI', name: 'Goods Issue', route: '/inventory/goods-issue', icon: 'inventory', type: TransactionRegistry },
  { code: 'DR', name: 'Delivery Receipt', route: '/inventory/delivery-receipt', icon: 'inventory', type: TransactionRegistry },
  { code: 'PR', name: 'Purchase Request', route: '/purchasing/purchase-request', icon: 'purchasing', type: TransactionRegistry },
  { code: 'CF', name: 'Canvass Form', route: '/purchasing/canvass-form', icon: 'purchasing', type: TransactionRegistry },
  { code: 'PO', name: 'Purchase Order', route: '/purchasing/purchase-order', icon: 'purchasing', type: TransactionRegistry },
  { code: 'PJ', name: 'Purchase Journal', route: '/purchasing/purchase-journal', icon: 'purchasing', type: TransactionRegistry },
  { code: 'FA', name: 'Fixed Asset', route: '/others/fixed-asset', icon: 'asset', type: TransactionRegistry },
  { code: 'U', name: 'Users', route: '/system-administration/user-management/users', icon: 'users', type: Maintenance },
  { code: 'UR', name: 'User Roles', route: '/system-administration/user-management/user-role', icon: 'users', type: Maintenance },
  { code: 'AM', name: 'Approval Management', route: '/system-administration/approval-management', icon: 'shieldCheck', type: Maintenance },
  { code: 'AT', name: 'Audit Trail', route: '/system-administration/audit-trail', icon: 'activity', type: Maintenance },
  { code: 'TNS', name: 'Transaction Number Setup', route: '/system-administration/transaction-number-setup', icon: 'receipt', type: Maintenance },
  { code: 'MCS', name: 'Multi Currency Setup', route: '/system-administration/multi-currency-setup', icon: 'coins', type: Maintenance },
  { code: 'FS', name: 'Form Signatory', route: '/system-administration/form-signatory', icon: 'fileSignature', type: Maintenance },
  { code: 'MM', name: 'Mail Maintenance', route: '/system-administration/mail-maintenance', icon: 'mail', type: Maintenance },
];

export const AccountingModuleCodes = ModuleCatalog
  .filter((module) => !module.route.startsWith('/inventory') && !module.route.startsWith('/purchasing'))
  .map((module) => module.code);

export const InventoryModuleCodes = ModuleCatalog
  .filter((module) =>
    module.route.startsWith('/inventory') ||
    module.route.startsWith('/purchasing') ||
    module.route.includes('/item-management') ||
    module.route.includes('/warehouse-management') ||
    module.route === '/maintenance/party-management' ||
    module.route === '/cash-receipt/product-distribution-center-warehouse' ||
    module.route.startsWith('/sales/sales-') ||
    module.route === '/sales/cash-sales-invoice' ||
    module.route === '/sales/sales-journal',
  )
  .map((module) => module.code);

export function getModuleCatalogCodeByRoute(route: string) {
  const module = ModuleCatalog.find((entry) => entry.route === route);

  if (!module) {
    throw new Error(`Module catalog entry not found for route: ${route}`);
  }

  return module.code;
}
