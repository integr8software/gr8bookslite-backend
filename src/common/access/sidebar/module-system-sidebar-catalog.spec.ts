import {
  AccountingAndInventorySidebarTemplate,
  AccountingSidebarTemplate,
  collectModuleCodes,
  type ModuleSystemSidebarSeedItem,
} from '../../../../prisma/seeds/moduleSystemCatalog';

function getApprovalSection(template: readonly ModuleSystemSidebarSeedItem[]) {
  return template.find(
    (item): item is Extract<ModuleSystemSidebarSeedItem, { itemType: 'SECTION' | 'CONTAINER' }> =>
      item.itemType !== 'LINK' && item.key === 'approval-management',
  );
}

describe('module system sidebar catalog', () => {
  it('includes Approval Management in both plan-backed sidebar templates', () => {
    expect(getApprovalSection(AccountingSidebarTemplate)).toBeDefined();
    expect(getApprovalSection(AccountingAndInventorySidebarTemplate)).toBeDefined();
  });

  it('keeps both Approval Management links in the module code catalog', () => {
    for (const template of [AccountingSidebarTemplate, AccountingAndInventorySidebarTemplate]) {
      const approvalSection = getApprovalSection(template);

      expect(approvalSection?.children.map((item) => item.key)).toEqual([
        'system-administration-approval-setup',
        'system-administration-approval-transactions',
      ]);
      expect(collectModuleCodes(template)).toContain('AM');
    }
  });
});
