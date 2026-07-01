import { BadRequestException } from '@nestjs/common';
import { UserSidebarService } from './user-sidebar.service';

describe('UserSidebarService tree validation', () => {
  const service = new UserSidebarService({} as never);
  const link = (key: string, moduleId: number) => ({
    key,
    label: key,
    itemType: 'LINK' as const,
    moduleId,
    children: [],
  });
  const validate = (items: unknown[]) =>
    (
      service as unknown as { validateTree(value: unknown[]): void }
    ).validateTree(items);

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
    expect(() => validate([link('first', 1), link('second', 1)])).toThrow(
      BadRequestException,
    );
    expect(() =>
      validate([{ ...link('parent-link', 2), children: [link('child', 3)] }]),
    ).toThrow(BadRequestException);
  });

  it('rejects a non-allowlisted icon', () => {
    expect(() =>
      validate([{ ...link('icon', 1), iconName: 'ArbitraryImport' }]),
    ).toThrow(BadRequestException);
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

  it('copies the admin sidebar template and filters links by permissions', async () => {
    const creates: unknown[] = [];
    const tx = {
      membership: {
        findFirst: jest.fn().mockResolvedValue({ userId: 100 }),
      },
      platformModuleSidebar: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            companyId: 20,
            branchUnitId: 10,
            userId: 100,
            parentId: null,
            moduleId: null,
            itemType: 'SECTION',
            key: 'admin-section',
            label: 'Admin Section',
            description: null,
            iconName: 'folder',
            sortOrder: 0,
            version: 1,
          },
          {
            id: 2,
            companyId: 20,
            branchUnitId: 10,
            userId: 100,
            parentId: 1,
            moduleId: 7,
            itemType: 'LINK',
            key: 'allowed-module',
            label: 'Allowed Module',
            description: null,
            iconName: null,
            sortOrder: 0,
            version: 1,
          },
          {
            id: 3,
            companyId: 20,
            branchUnitId: 10,
            userId: 100,
            parentId: 1,
            moduleId: 8,
            itemType: 'LINK',
            key: 'blocked-module',
            label: 'Blocked Module',
            description: null,
            iconName: null,
            sortOrder: 1,
            version: 1,
          },
        ]),
        create: jest.fn().mockImplementation(({ data }) => {
          creates.push(data);
          return Promise.resolve({ id: creates.length + 1000 });
        }),
      },
    };

    await (
      service as unknown as {
        materializeFromAdminSidebarTemplate: (
          tx: unknown,
          scope: { companyId: number; branchUnitId: number; userId: number },
          permittedModuleIds: Set<number>,
        ) => Promise<void>;
      }
    ).materializeFromAdminSidebarTemplate(
      tx,
      { companyId: 20, branchUnitId: 10, userId: 200 },
      new Set([7]),
    );

    expect(creates).toEqual([
      expect.objectContaining({
        userId: 200,
        itemType: 'SECTION',
        key: 'admin-section',
      }),
      expect.objectContaining({
        userId: 200,
        parentId: 1001,
        itemType: 'LINK',
        key: 'allowed-module',
        moduleId: 7,
      }),
    ]);
  });
});
