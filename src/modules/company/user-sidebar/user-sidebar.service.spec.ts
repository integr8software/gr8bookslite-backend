import { BadRequestException } from '@nestjs/common';
import { UserSidebarService } from './user-sidebar.service';

describe('UserSidebarService tree validation', () => {
  const service = new UserSidebarService({} as never, {} as never);
  const link = (key: string, moduleId: number) => ({
    key,
    label: key,
    itemType: 'LINK' as const,
    moduleId,
    children: [],
  });
  const validate = (items: unknown[]) => (service as unknown as { validateTree(value: unknown[]): void }).validateTree(items);

  it('accepts a root-level link', () => {
    expect(() => validate([link('root-link', 1)])).not.toThrow();
  });

  it('rejects a fourth visible level', () => {
    const value = [
      {
        key: 'section',
        label: 'Section',
        itemType: 'SECTION',
        children: [
          {
            key: 'folder-1',
            label: 'Folder',
            itemType: 'CONTAINER',
            children: [
              {
                key: 'folder-2',
                label: 'Folder',
                itemType: 'CONTAINER',
                children: [link('too-deep', 1)],
              },
            ],
          },
        ],
      },
    ];
    expect(() => validate(value)).toThrow(BadRequestException);
  });

  it('rejects duplicate modules and children below links', () => {
    expect(() => validate([link('first', 1), link('second', 1)])).toThrow(BadRequestException);
    expect(() => validate([{ ...link('parent-link', 2), children: [link('child', 3)] }])).toThrow(BadRequestException);
  });

  it('rejects a non-allowlisted icon', () => {
    expect(() => validate([{ ...link('icon', 1), iconName: 'ArbitraryImport' }])).toThrow(BadRequestException);
  });

  it('accepts supported customization icons', () => {
    expect(() =>
      validate([
        { ...link('profile', 1), iconName: 'profile' },
        { ...link('slice', 2), iconName: 'slice' },
        { ...link('weight', 3), iconName: 'weight' },
        { ...link('weight-tilde', 4), iconName: 'weightTilde' },
      ]),
    ).not.toThrow();
  });

  it('derives user sidebar preference deltas from the plan default tree', () => {
    const preferences = (
      service as unknown as {
        derivePreferenceDeltas: (defaultItems: unknown[], submittedItems: unknown[]) => unknown[];
      }
    ).derivePreferenceDeltas(
      [
        {
          key: 'accounting-financial-maintenance',
          label: 'Financial Maintenance',
          itemType: 'SECTION',
          sortOrder: 0,
          children: [
            {
              key: 'accounting-term-management',
              label: 'Term Management',
              itemType: 'LINK',
              moduleId: 7,
              sortOrder: 0,
              children: [],
            },
            {
              key: 'accounting-chart-of-accounts',
              label: 'Chart of Accounts',
              itemType: 'LINK',
              moduleId: 8,
              sortOrder: 1,
              children: [],
            },
          ],
        },
      ],
      [
        {
          key: 'accounting-financial-maintenance',
          label: 'Financial Maintenance',
          itemType: 'SECTION',
          isCollapsed: true,
          children: [
            {
              key: 'accounting-chart-of-accounts',
              label: 'Chart of Accounts',
              itemType: 'LINK',
              moduleId: 8,
              children: [],
            },
          ],
        },
      ],
    );

    expect(preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemKey: 'accounting-financial-maintenance',
          isCollapsed: true,
        }),
        expect.objectContaining({
          itemKey: 'accounting-chart-of-accounts',
          hasParentOverride: false,
          sortOrder: 0,
        }),
        expect.objectContaining({
          itemKey: 'accounting-term-management',
          isHidden: true,
        }),
      ]),
    );
  });

  it('stores parent override deltas when moving plan sidebar items into a different group', () => {
    const preferences = (
      service as unknown as {
        derivePreferenceDeltas: (defaultItems: unknown[], submittedItems: unknown[]) => unknown[];
      }
    ).derivePreferenceDeltas(
      [
        {
          key: 'section-a',
          label: 'Section A',
          itemType: 'SECTION',
          children: [link('module-a', 1)],
        },
        {
          key: 'section-b',
          label: 'Section B',
          itemType: 'SECTION',
          children: [],
        },
      ],
      [
        {
          key: 'section-a',
          label: 'Section A',
          itemType: 'SECTION',
          children: [],
        },
        {
          key: 'section-b',
          label: 'Section B',
          itemType: 'SECTION',
          children: [link('module-a', 1)],
        },
      ],
    );

    expect(preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemKey: 'module-a',
          parentItemKey: 'section-b',
          hasParentOverride: true,
          sortOrder: 0,
        }),
      ]),
    );
  });

  it('rejects changing the module behind a default sidebar item', () => {
    expect(() =>
      (
        service as unknown as {
          derivePreferenceDeltas: (defaultItems: unknown[], submittedItems: unknown[]) => unknown[];
        }
      ).derivePreferenceDeltas([link('module-a', 1)], [link('module-a', 2)]),
    ).toThrow(BadRequestException);
  });
});
