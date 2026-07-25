import { ModuleCatalog } from './moduleCatalog';

type ModuleSystemSidebarSeedItem =
  | {
      itemType: 'LINK';
      key: string;
      code: string;
      label?: string;
      iconName?: string;
    }
  | {
      itemType: 'SECTION' | 'CONTAINER';
      key: string;
      label: string;
      iconName: string;
      children: readonly ModuleSystemSidebarSeedItem[];
    };

function link(key: string, code: string, iconName: string, label?: string): ModuleSystemSidebarSeedItem {
  return {
    itemType: 'LINK',
    key,
    code,
    iconName,
    ...(label ? { label } : {}),
  };
}

export const AccountingSidebarTemplate = [
  link('dashboard', 'DO', 'dashboard'),
  {
    itemType: 'SECTION',
    key: 'financial-maintenance',
    label: 'Financial Maintenance',
    iconName: 'accounting',
    children: [
      link('financial-maintenance-charts-of-accounts', 'COA', 'scale'),
      link('financial-maintenance-default-accounts', 'DA', 'fileCog'),
      link('financial-maintenance-bank-masterfile', 'BM', 'bank'),
      link('financial-maintenance-services-maintenance', 'SM', 'receipt'),
      link('financial-maintenance-payment-type', 'PT', 'creditCard'),
      link('financial-maintenance-discount-management', 'DSM', 'promotion'),
      link('financial-maintenance-term-management', 'TM', 'calendar'),
      link('financial-maintenance-responsibility-center', 'RC', 'target'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'cash-receipt',
    label: 'Cash Receipt',
    iconName: 'cashIn',
    children: [
      link('cash-receipt-official-receipt', 'OR', 'cashIn'),
      link('cash-receipt-collection-receipt', 'CR', 'cashIn'),
      link('cash-receipt-acknowledgement-receipt', 'AR', 'cashIn'),
      link('cash-receipt-provisional-receipt', 'PVR', 'cashIn'),
      link('cash-receipt-bank-reconciliation', 'BR', 'bank'),
      link('cash-receipt-post-dated-check-registry', 'PDCW', 'calendar'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'cash-disbursement',
    label: 'Cash Disbursement',
    iconName: 'cashOut',
    children: [
      link('cash-disbursement-disbursement-voucher', 'DV', 'fileCheck'),
      link('cash-disbursement-cash-advance', 'CA', 'cashOut'),
      link('cash-disbursement-cash-advance-multiple-entry', 'CAME', 'cashOut'),
      link('cash-disbursement-petty-cash-voucher', 'PCV', 'cashOut'),
      link('cash-disbursement-petty-cash-fund', 'PCF', 'cashOut'),
      link('cash-disbursement-petty-cash-fund-replenishment', 'PCFR', 'cashOut'),
      link('cash-disbursement-petty-cash-advance', 'PCA', 'cashOut'),
      link('cash-disbursement-petty-cash-advance-replenishment', 'PCAR', 'cashOut'),
      link('cash-disbursement-revolving-fund', 'RF', 'cashOut'),
      link('cash-disbursement-request-for-payment', 'RFP', 'fileCheck'),
      link('cash-disbursement-advances-to-supplier', 'ATS', 'cashOut'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'accounts-payable',
    label: 'Accounts Payable',
    iconName: 'payable',
    children: [link('accounts-payable-accounts-payable-voucher', 'APV', 'payable')],
  },
  {
    itemType: 'SECTION',
    key: 'general-journal',
    label: 'General Journal',
    iconName: 'journal',
    children: [link('general-journal-journal-voucher', 'JV', 'journal')],
  },
  {
    itemType: 'SECTION',
    key: 'others',
    label: 'Others',
    iconName: 'asset',
    children: [link('others-fixed-asset', 'FA', 'asset'), link('others-beginning-balance-uploader', 'BBU', 'journal')],
  },
  {
    itemType: 'SECTION',
    key: 'system-administration',
    label: 'System Administration',
    iconName: 'settings',
    children: [
      {
        itemType: 'CONTAINER',
        key: 'system-administration-user-management',
        label: 'User Management',
        iconName: 'users',
        children: [
          link('system-administration-users', 'U', 'users'),
          link('system-administration-user-role', 'UR', 'security', 'User Role'),
          link('system-administration-approver-setup', 'AS', 'shieldCheck'),
        ],
      },
      link('system-administration-approval-management', 'AM', 'shieldCheck'),
      link('system-administration-audit-trail', 'AT', 'activity'),
      link('system-administration-transaction-number-setup', 'TNS', 'receipt'),
      link('system-administration-multi-currency-setup', 'MCS', 'coins'),
      link('system-administration-form-signatory', 'FS', 'fileSignature'),
      link('system-administration-mail-maintenance', 'MM', 'mail'),
    ],
  },
] as const satisfies readonly ModuleSystemSidebarSeedItem[];

export const AccountingAndInventorySidebarTemplate = [
  AccountingSidebarTemplate[0],
  AccountingSidebarTemplate[1],
  link('party-management', 'PM', 'users'),
  {
    itemType: 'SECTION',
    key: 'item-management',
    label: 'Item Management',
    iconName: 'package',
    children: [
      link('item-management-items', 'I', 'package'),
      link('item-management-item-bundles', 'IB', 'packageCheck'),
      link('item-management-item-category', 'IC', 'tags'),
      link('item-management-item-variations', 'IV', 'clipboard'),
      link('item-management-unit-of-measurement', 'UOM', 'ruler'),
      link('item-management-item-promotions', 'IPR', 'promotion'),
      link('item-management-price-lists', 'PLS', 'tags'),
      link('item-management-inventory-transaction-type', 'TT', 'receipt'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'warehouse-management',
    label: 'Warehouse Management',
    iconName: 'warehouse',
    children: [
      link('warehouse-management-warehouses', 'WM', 'warehouse', 'Warehouses'),
      link('warehouse-management-warehouse-access', 'WA', 'shieldCheck'),
      link('warehouse-management-storage-locations', 'WS', 'mapPin'),
      link('warehouse-management-storage-layout', 'WLY', 'map'),
      link('warehouse-management-item-location-setup', 'WILS', 'packageCheck'),
      link('warehouse-management-capacity-storage-rules', 'WCSR', 'ruler'),
      link('warehouse-management-location-availability', 'WLA', 'activity'),
      link('warehouse-management-stock-by-warehouse', 'WSBW', 'warehouse'),
      link('warehouse-management-stock-by-location', 'WSBL', 'mapPin'),
      link('warehouse-management-stock-movement-history', 'WSMH', 'activity'),
      link('warehouse-management-item-availability', 'WIA', 'search'),
      link('warehouse-management-warehouse-transfer', 'WT', 'arrowRightLeft'),
      link('warehouse-management-location-transfer', 'WLOCT', 'arrowRightLeft'),
      link('warehouse-management-receiving-putaway', 'WRP', 'inventory'),
      link('warehouse-management-picking-dispatch', 'WPD', 'clipboard'),
      link('warehouse-management-stock-count', 'WSC', 'inventory'),
      link('warehouse-management-stock-adjustment', 'WSA', 'receipt'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'delivery-vehicle-management',
    label: 'Delivery Vehicle Management',
    iconName: 'inventory',
    children: [
      link('delivery-vehicle-management-delivery-vehicles', 'DVE', 'inventory'),
      link('delivery-vehicle-management-vehicle-types', 'DVT', 'tags'),
      link('delivery-vehicle-management-vehicle-availability', 'DVA', 'activity'),
      link('delivery-vehicle-management-load-planning', 'DVLP', 'weight'),
      link('delivery-vehicle-management-vehicle-assignment', 'DVAS', 'users'),
      link('delivery-vehicle-management-delivery-trips-and-dispatch', 'DVD', 'arrowRightLeft'),
      link('delivery-vehicle-management-trip-tracking', 'DVTK', 'map'),
      link('delivery-vehicle-management-vehicle-inspections', 'DVIN', 'clipboard'),
      link('delivery-vehicle-management-fuel-and-incidents', 'DVFI', 'receipt'),
      link('delivery-vehicle-management-maintenance-and-repairs', 'DVMR', 'maintenance'),
    ],
  },
  AccountingSidebarTemplate[2],
  AccountingSidebarTemplate[3],
  AccountingSidebarTemplate[4],
  AccountingSidebarTemplate[5],
  {
    itemType: 'SECTION',
    key: 'sales',
    label: 'Sales',
    iconName: 'sales',
    children: [
      link('sales-debit-memo', 'DM', 'sales'),
      link('sales-credit-memo', 'CM', 'sales'),
      link('sales-sales-quotation', 'SQ', 'sales'),
      link('sales-sales-order', 'SO', 'sales'),
      link('sales-sales-invoice', 'SI', 'sales'),
      link('sales-billing', 'B', 'billing'),
      link('sales-billing-statement', 'BS', 'billing'),
      link('sales-billing-invoice', 'BI', 'billing'),
      link('sales-service-invoice', 'SVI', 'sales'),
      link('sales-cash-sales-invoice', 'CSI', 'cashIn'),
      link('sales-sales-journal', 'SJ', 'journal'),
      link('sales-statement-of-account', 'SOA', 'receipt'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'inventory',
    label: 'Inventory',
    iconName: 'inventory',
    children: [
      link('inventory-delivery-receipt', 'DR', 'inventory'),
      link('inventory-pick-list', 'PL', 'clipboard'),
      link('inventory-goods-issue', 'GI', 'inventory'),
      link('inventory-goods-receipt', 'GR', 'inventory'),
      link('inventory-receiving-report', 'RR', 'fileCheck'),
      link('inventory-material-request', 'MR', 'clipboard'),
      link('inventory-inventory-count', 'INC', 'inventory'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'purchasing',
    label: 'Purchasing',
    iconName: 'purchasing',
    children: [
      link('purchasing-purchase-request', 'PR', 'purchasing'),
      link('purchasing-purchase-order', 'PO', 'purchasing'),
      link('purchasing-purchase-journal', 'PJ', 'journal'),
      link('purchasing-canvass-form', 'CF', 'clipboard'),
    ],
  },
  AccountingSidebarTemplate[6],
  AccountingSidebarTemplate[7],
] as const satisfies readonly ModuleSystemSidebarSeedItem[];

export const ModuleSystemCatalog = [
  {
    code: 'ACCOUNTING',
    name: 'Accounting',
    description: 'Accounting modules and workflows.',
    sortOrder: 10,
    moduleCodes: collectModuleCodes(AccountingSidebarTemplate),
    sidebar: AccountingSidebarTemplate,
  },
  {
    code: 'ACCOUNTING_AND_INVENTORY',
    name: 'Accounting and Inventory',
    description: 'Accounting with trading, inventory, sales, and purchasing workflows.',
    sortOrder: 20,
    moduleCodes: ModuleCatalog.map((module) => module.code),
    sidebar: AccountingAndInventorySidebarTemplate,
  },
] as const;

export function collectModuleCodes(items: readonly ModuleSystemSidebarSeedItem[]) {
  const moduleCodes = new Set<string>();
  const visit = (item: ModuleSystemSidebarSeedItem) => {
    if (item.itemType === 'LINK') {
      moduleCodes.add(item.code);
      return;
    }
    item.children.forEach(visit);
  };
  items.forEach(visit);
  return Array.from(moduleCodes);
}

export type { ModuleSystemSidebarSeedItem };
