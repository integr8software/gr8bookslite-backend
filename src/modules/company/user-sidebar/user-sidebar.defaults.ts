import type { Prisma } from '@prisma/client';

export const UserSidebarIconNames = [
  'dashboard',
  'maintenance',
  'cashIn',
  'cashOut',
  'payable',
  'journal',
  'sales',
  'inventory',
  'purchasing',
  'asset',
  'settings',
  'subscription',
  'folder',
  'link',
  'profile',
  'users',
  'security',
  'accounting',
  'activity',
  'promotion',
  'bank',
  'billing',
  'branch',
  'calendar',
  'clipboard',
  'coins',
  'creditCard',
  'fileCheck',
  'fileSignature',
  'gauge',
  'package',
  'packageCheck',
  'receipt',
  'scale',
  'slice',
  'tags',
  'target',
  'warehouse',
  'weight',
  'weightTilde',
  'arrowRightLeft',
  'mail',
  'mapPin',
  'ruler',
  'search',
  'shieldCheck',
] as const;

type UserSidebarTransaction = Pick<
  Prisma.TransactionClient,
  'platformModuleSidebar' | 'module' | 'companyModule'
>;

type UserSidebarScope = {
  companyId: number;
  branchUnitId: number;
  userId: number;
};

type DefaultUserSidebarItem =
  | {
      itemType: 'LINK';
      key: string;
      code: string;
      label?: string;
      iconName?: (typeof UserSidebarIconNames)[number];
    }
  | {
      itemType: 'SECTION' | 'CONTAINER';
      key: string;
      label: string;
      iconName: (typeof UserSidebarIconNames)[number];
      children: readonly DefaultUserSidebarItem[];
    };

function defaultLink(
  key: string,
  code: string,
  iconName: (typeof UserSidebarIconNames)[number],
  label?: string,
): DefaultUserSidebarItem {
  return {
    itemType: 'LINK',
    key,
    code,
    iconName,
    ...(label ? { label } : {}),
  };
}

const DefaultUserSidebarItems: readonly DefaultUserSidebarItem[] = [
  defaultLink('dashboard', 'DO', 'dashboard'),
  {
    itemType: 'SECTION',
    key: 'financial-maintenance',
    label: 'Financial Maintenance',
    iconName: 'accounting',
    children: [
      defaultLink('financial-maintenance-charts-of-accounts', 'COA', 'scale'),
      defaultLink(
        'financial-maintenance-discount-management',
        'DSM',
        'promotion',
      ),
      defaultLink('financial-maintenance-bank-masterfile', 'BM', 'bank'),
      defaultLink('financial-maintenance-term-management', 'TM', 'calendar'),
      defaultLink('financial-maintenance-transaction-type', 'TT', 'receipt'),
      defaultLink('financial-maintenance-payment-type', 'PT', 'creditCard'),
      defaultLink(
        'financial-maintenance-responsibility-center',
        'RC',
        'target',
      ),
    ],
  },
  defaultLink('party-management', 'PM', 'users'),
  {
    itemType: 'SECTION',
    key: 'item-management',
    label: 'Item Management',
    iconName: 'package',
    children: [
      defaultLink('item-management-items', 'I', 'package'),
      defaultLink('item-management-item-bundles', 'IB', 'packageCheck'),
      defaultLink('item-management-item-category', 'IC', 'tags'),
      defaultLink('item-management-item-attributes', 'IA2', 'clipboard'),
      defaultLink('item-management-unit-of-measurement', 'UOM', 'ruler'),
      defaultLink('item-management-item-promotions', 'IPR', 'promotion'),
      defaultLink('item-management-price-lists', 'PLS', 'tags'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'warehouse-management',
    label: 'Warehouse Management',
    iconName: 'warehouse',
    children: [
      defaultLink(
        'warehouse-management-warehouses',
        'WM',
        'warehouse',
        'Warehouses',
      ),
      defaultLink('warehouse-management-warehouse-access', 'WA', 'shieldCheck'),
      defaultLink('warehouse-management-storage-locations', 'WSL', 'mapPin'),
      defaultLink(
        'warehouse-management-warehouse-transfer',
        'WT',
        'arrowRightLeft',
      ),
      defaultLink(
        'warehouse-management-warehouse-stock-inquiry',
        'WSI',
        'search',
      ),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'cash-receipt',
    label: 'Cash Receipt',
    iconName: 'cashIn',
    children: [
      defaultLink('cash-receipt-official-receipt', 'OR', 'cashIn'),
      defaultLink('cash-receipt-collection-receipt', 'CR', 'cashIn'),
      defaultLink('cash-receipt-acknowledgement-receipt', 'AR', 'cashIn'),
      defaultLink('cash-receipt-provisional-receipt', 'PVR', 'cashIn'),
      defaultLink('cash-receipt-bank-reconciliation', 'BR', 'bank'),
      defaultLink(
        'cash-receipt-product-distribution-center-warehouse',
        'PDCW',
        'warehouse',
      ),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'cash-disbursement',
    label: 'Cash Disbursement',
    iconName: 'cashOut',
    children: [
      defaultLink('cash-disbursement-disbursement-voucher', 'DV', 'fileCheck'),
      defaultLink('cash-disbursement-cash-advance', 'CA', 'cashOut'),
      defaultLink(
        'cash-disbursement-cash-advance-multiple-entry',
        'CAME',
        'cashOut',
      ),
      defaultLink('cash-disbursement-petty-cash-voucher', 'PCV', 'cashOut'),
      defaultLink('cash-disbursement-petty-cash-fund', 'PCF', 'cashOut'),
      defaultLink(
        'cash-disbursement-petty-cash-fund-replenishment',
        'PCFR',
        'cashOut',
      ),
      defaultLink('cash-disbursement-petty-cash-advance', 'PCA', 'cashOut'),
      defaultLink(
        'cash-disbursement-petty-cash-advance-replenishment',
        'PCAR',
        'cashOut',
      ),
      defaultLink('cash-disbursement-revolving-fund', 'RF', 'cashOut'),
      defaultLink('cash-disbursement-request-for-payment', 'RFP', 'fileCheck'),
      defaultLink('cash-disbursement-advances-to-supplier', 'ATS', 'cashOut'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'accounts-payable',
    label: 'Accounts Payable',
    iconName: 'payable',
    children: [
      defaultLink(
        'accounts-payable-accounts-payable-voucher',
        'APV',
        'payable',
      ),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'general-journal',
    label: 'General Journal',
    iconName: 'journal',
    children: [defaultLink('general-journal-journal-voucher', 'JV', 'journal')],
  },
  {
    itemType: 'SECTION',
    key: 'sales',
    label: 'Sales',
    iconName: 'sales',
    children: [
      defaultLink('sales-debit-memo', 'DM', 'sales'),
      defaultLink('sales-credit-memo', 'CM', 'sales'),
      defaultLink('sales-sales-quotation', 'SQ', 'sales'),
      defaultLink('sales-sales-order', 'SO', 'sales'),
      defaultLink('sales-sales-invoice', 'SI', 'sales'),
      defaultLink('sales-billing', 'B', 'billing'),
      defaultLink('sales-billing-statement', 'BS', 'billing'),
      defaultLink('sales-billing-invoice', 'BI', 'billing'),
      defaultLink('sales-service-invoice', 'SVI', 'sales'),
      defaultLink('sales-cash-sales-invoice', 'CSI', 'cashIn'),
      defaultLink('sales-sales-journal', 'SJ', 'journal'),
      defaultLink('sales-statement-of-account', 'SOA', 'receipt'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'inventory',
    label: 'Inventory',
    iconName: 'inventory',
    children: [
      defaultLink('inventory-delivery-receipt', 'DR', 'inventory'),
      defaultLink('inventory-pick-list', 'PL', 'clipboard'),
      defaultLink('inventory-goods-issue', 'GI', 'inventory'),
      defaultLink('inventory-goods-receipt', 'GR', 'inventory'),
      defaultLink('inventory-receiving-report', 'RR', 'fileCheck'),
      defaultLink('inventory-material-request', 'MR', 'clipboard'),
      defaultLink('inventory-inventory-account', 'IA', 'inventory'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'purchasing',
    label: 'Purchasing',
    iconName: 'purchasing',
    children: [
      defaultLink('purchasing-purchase-request', 'PR', 'purchasing'),
      defaultLink('purchasing-purchase-order', 'PO', 'purchasing'),
      defaultLink('purchasing-purchase-journal', 'PJ', 'journal'),
      defaultLink('purchasing-canvass-form', 'CF', 'clipboard'),
    ],
  },
  {
    itemType: 'SECTION',
    key: 'others',
    label: 'Others',
    iconName: 'asset',
    children: [defaultLink('others-fixed-asset', 'FA', 'asset')],
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
          defaultLink('system-administration-users', 'U', 'users'),
          defaultLink(
            'system-administration-user-role',
            'UR',
            'security',
            'User Role',
          ),
        ],
      },
      defaultLink(
        'system-administration-approval-management',
        'AM',
        'shieldCheck',
      ),
      defaultLink('system-administration-audit-trail', 'AT', 'activity'),
      defaultLink(
        'system-administration-transaction-number-setup',
        'TNS',
        'receipt',
      ),
      defaultLink('system-administration-multi-currency-setup', 'MCS', 'coins'),
      defaultLink(
        'system-administration-form-signatory',
        'FS',
        'fileSignature',
      ),
      defaultLink('system-administration-mail-maintenance', 'MM', 'mail'),
    ],
  },
] as const;

const LinkKeyOverrides: Record<string, string> = {
  '/dashboard': 'dashboard-overview',
  '/maintenance/form-signatory': 'system-administration-form-signatory',
  '/system-administration/user-management/users': 'maintenance-users',
  '/system-administration/user-management/user-role': 'maintenance-user-role',
  '/system-administration/approval-management': 'maintenance-approval',
  '/system-administration/audit-trail': 'maintenance-audit',
  '/system-administration/transaction-number-setup': 'transaction-number-setup',
  '/system-administration/mail-maintenance': 'maintenance-mail',
};

export async function materializeDefaultUserSidebar(
  tx: UserSidebarTransaction,
  companyId: number,
  branchUnitId: number,
  userId: number,
  options: { force?: boolean; moduleIds?: Iterable<number> } = {},
) {
  const scope = { companyId, branchUnitId, userId };
  const existing = await tx.platformModuleSidebar.count({ where: scope });
  if (options.force)
    await tx.platformModuleSidebar.deleteMany({ where: scope });
  const permittedModuleIds = options.moduleIds
    ? new Set(options.moduleIds)
    : new Set(
        (
          await tx.companyModule.findMany({
            where: { companyId, isEnabled: true, module: { isActive: true } },
            select: { moduleId: true },
          })
        ).map((item) => item.moduleId),
      );

  const modules = await tx.module.findMany({
    where: {
      isActive: true,
      id: { in: Array.from(permittedModuleIds) },
    },
    orderBy: [{ route: 'asc' }, { code: 'asc' }],
  });
  const existingItems = options.force
    ? []
    : await tx.platformModuleSidebar.findMany({
        where: scope,
        select: { id: true, key: true, moduleId: true, itemType: true },
      });
  const existingModuleIds = new Set(
    existingItems.flatMap((item) => (item.moduleId ? [item.moduleId] : [])),
  );
  const existingKeys = new Set(existingItems.map((item) => item.key));
  const unassigned = new Set(
    modules
      .filter((module) => !existingModuleIds.has(module.id))
      .map((module) => module.id),
  );
  const modulesByCode = new Map(modules.map((module) => [module.code, module]));

  for (const [index, item] of DefaultUserSidebarItems.entries()) {
    await materializeDefaultUserSidebarItem(tx, {
      existingKeys,
      existingModuleIds,
      item,
      modulesByCode,
      parentId: null,
      scope,
      sortOrder: index,
      unassigned,
    });
  }

  if (unassigned.size) {
    await materializeParentlessModules(
      tx,
      scope,
      modules.filter((module) => unassigned.has(module.id)),
      existingKeys,
    );
  }
  return !existing || options.force || unassigned.size > 0;
}

async function materializeParentlessModules(
  tx: UserSidebarTransaction,
  scope: UserSidebarScope,
  modules: Awaited<ReturnType<UserSidebarTransaction['module']['findMany']>>,
  existingKeys: Set<string>,
) {
  for (const [index, module] of modules.entries()) {
    if (!module.route)
      throw new Error(
        `Module ${module.code} has no route and cannot be placed in the default sidebar.`,
      );

    const linkKey =
      LinkKeyOverrides[module.route] ??
      module.route.slice(1).replaceAll('/', '-');
    if (existingKeys.has(linkKey)) continue;

    await tx.platformModuleSidebar.create({
      data: {
        ...scope,
        moduleId: module.id,
        itemType: 'LINK',
        key: linkKey,
        label: module.name,
        description: module.description,
        sortOrder: DefaultUserSidebarItems.length + index,
      },
    });
    existingKeys.add(linkKey);
  }
}

async function materializeDefaultUserSidebarItem(
  tx: UserSidebarTransaction,
  {
    existingKeys,
    existingModuleIds,
    item,
    modulesByCode,
    parentId,
    scope,
    sortOrder,
    unassigned,
  }: {
    existingKeys: Set<string>;
    existingModuleIds: Set<number>;
    item: DefaultUserSidebarItem;
    modulesByCode: Map<
      string,
      Awaited<ReturnType<UserSidebarTransaction['module']['findMany']>>[number]
    >;
    parentId: number | null;
    scope: UserSidebarScope;
    sortOrder: number;
    unassigned: Set<number>;
  },
) {
  if (item.itemType === 'LINK') {
    const module = modulesByCode.get(item.code);
    if (!module || existingModuleIds.has(module.id)) return null;
    if (!module.route)
      throw new Error(
        `Module ${module.code} has no route and cannot be placed in the default sidebar.`,
      );
    if (existingKeys.has(item.key)) return null;

    const link = await tx.platformModuleSidebar.create({
      data: {
        ...scope,
        parentId,
        moduleId: module.id,
        itemType: 'LINK',
        key: item.key,
        label: item.label ?? module.name,
        description: module.description,
        iconName: parentId == null ? item.iconName : null,
        sortOrder,
      },
      select: { id: true },
    });
    existingKeys.add(item.key);
    unassigned.delete(module.id);

    return link.id;
  }

  if (!hasAvailableSidebarChild(item, modulesByCode, existingModuleIds))
    return null;

  const container = existingKeys.has(item.key)
    ? await tx.platformModuleSidebar.findFirstOrThrow({
        where: { ...scope, key: item.key },
        select: { id: true },
      })
    : await tx.platformModuleSidebar.create({
        data: {
          ...scope,
          parentId,
          itemType: item.itemType,
          key: item.key,
          label: item.label,
          iconName: item.iconName,
          sortOrder,
        },
        select: { id: true },
      });
  existingKeys.add(item.key);

  for (const [childIndex, child] of item.children.entries()) {
    await materializeDefaultUserSidebarItem(tx, {
      existingKeys,
      existingModuleIds,
      item: child,
      modulesByCode,
      parentId: container.id,
      scope,
      sortOrder: childIndex,
      unassigned,
    });
  }

  return container.id;
}

function hasAvailableSidebarChild(
  item: DefaultUserSidebarItem,
  modulesByCode: Map<
    string,
    Awaited<ReturnType<UserSidebarTransaction['module']['findMany']>>[number]
  >,
  existingModuleIds: Set<number>,
): boolean {
  if (item.itemType === 'LINK') {
    const module = modulesByCode.get(item.code);

    return Boolean(module && !existingModuleIds.has(module.id));
  }

  return item.children.some((child) =>
    hasAvailableSidebarChild(child, modulesByCode, existingModuleIds),
  );
}
