import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  AccessScopeLevel,
  MembershipRole,
  MembershipStatus,
  ResponsibilityCenterCategory,
  ResponsibilityCenterFinancialType,
  ResponsibilityCenterStatus,
  SystemRole,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { ResponsibilityCenterService } from './responsibility-center.service';

describe('ResponsibilityCenterService', () => {
  it('generates the next type-scoped code with escaped dynamic prefixes', async () => {
    const service = createService();
    const tx = {
      $queryRaw: jest.fn(),
      responsibilityCenter: {
        findMany: jest.fn().mockResolvedValue([{ code: 'CC-D.E-001' }, { code: 'CC-D.E-002' }, { code: 'CC-DXE-999' }, { code: 'CC-D.E-ABC' }]),
      },
    };

    await expect(
      callPrivate<string>(service, 'generateNextCode', tx, 7, {
        codePrefix: 'D.E',
        classification: { code: 'CC' },
      }),
    ).resolves.toBe('CC-D.E-003');

    expect(tx.responsibilityCenter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 7,
          code: { startsWith: 'CC-D.E-' },
        }),
      }),
    );
  });

  it('checks code uniqueness within the active company only', async () => {
    const service = createService();
    const client = {
      responsibilityCenter: {
        findFirst: jest.fn().mockResolvedValue({ id: 55n }),
      },
    };

    await expect(callPrivate(service, 'ensureCodeAvailable', 9, ' cc-dept-001 ', undefined, client)).rejects.toBeInstanceOf(ConflictException);

    expect(client.responsibilityCenter.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 9,
        deletedAt: null,
        id: undefined,
        code: { equals: 'CC-DEPT-001', mode: 'insensitive' },
      },
      select: { id: true },
    });
  });

  it('rejects a parent that would create a hierarchy cycle', async () => {
    const service = createService({
      responsibilityCenter: {
        findFirst: jest.fn().mockResolvedValueOnce({ parentId: 3n }).mockResolvedValueOnce({ parentId: 1n }),
      },
    });

    await expect(callPrivate(service, 'ensureNoHierarchyCycle', 12, 1n, 2n)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes center lookup by company id', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = createService({
      responsibilityCenter: { findFirst },
    });

    await expect(callPrivate(service, 'findCenterOrThrow', 23, 99n)).rejects.toBeInstanceOf(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99n, companyId: 23, deletedAt: null },
      }),
    );
  });

  it('inactivates an entire active descendant branch in one status change', async () => {
    const existingCenter = createCenter({ id: 1n });
    const tx = {
      responsibilityCenter: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 2n }])
          .mockResolvedValueOnce([{ id: 3n }])
          .mockResolvedValueOnce([]),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        findFirstOrThrow: jest.fn().mockResolvedValue(existingCenter),
      },
    };
    const service = createService({
      responsibilityCenter: {
        findFirst: jest.fn().mockResolvedValue(existingCenter),
      },
      $transaction: jest.fn((callback) => callback(tx)),
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });

    const result = await service.updateStatus(createSuperAdmin(), '1', {
      status: ResponsibilityCenterStatus.INACTIVE,
    });

    expect(tx.responsibilityCenter.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1n, 2n, 3n] },
        companyId: 77,
        deletedAt: null,
      },
      data: {
        status: ResponsibilityCenterStatus.INACTIVE,
        updatedByUserId: 5,
      },
    });
    expect(result.center.id).toBe('1');
  });

  it('activates an entire descendant branch when the parent is activated', async () => {
    const existingCenter = createCenter({
      id: 1n,
      status: ResponsibilityCenterStatus.INACTIVE,
    });
    const tx = {
      responsibilityCenter: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 2n }])
          .mockResolvedValueOnce([{ id: 3n }])
          .mockResolvedValueOnce([]),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          ...existingCenter,
          status: ResponsibilityCenterStatus.ACTIVE,
        }),
      },
    };
    const service = createService({
      responsibilityCenter: {
        findFirst: jest.fn().mockResolvedValue(existingCenter),
      },
      $transaction: jest.fn((callback) => callback(tx)),
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });

    const result = await service.updateStatus(createSuperAdmin(), '1', {
      status: ResponsibilityCenterStatus.ACTIVE,
    });

    expect(tx.responsibilityCenter.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1n, 2n, 3n] },
        companyId: 77,
        deletedAt: null,
      },
      data: {
        status: ResponsibilityCenterStatus.ACTIVE,
        updatedByUserId: 5,
      },
    });
    expect(result.center.id).toBe('1');
  });

  it('activates inactive ancestors and descendants when a sub-parent is activated', async () => {
    const existingCenter = createCenter({
      id: 2n,
      parentId: 1n,
      status: ResponsibilityCenterStatus.INACTIVE,
    });
    const tx = {
      responsibilityCenter: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 3n }])
          .mockResolvedValueOnce([]),
        findFirst: jest.fn().mockResolvedValueOnce({ id: 1n, parentId: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          ...existingCenter,
          status: ResponsibilityCenterStatus.ACTIVE,
        }),
      },
    };
    const service = createService({
      responsibilityCenter: {
        findFirst: jest.fn().mockResolvedValue(existingCenter),
      },
      $transaction: jest.fn((callback) => callback(tx)),
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });

    const result = await service.updateStatus(createSuperAdmin(), '2', {
      status: ResponsibilityCenterStatus.ACTIVE,
    });

    expect(tx.responsibilityCenter.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1n, 2n, 3n] },
        companyId: 77,
        deletedAt: null,
      },
      data: {
        status: ResponsibilityCenterStatus.ACTIVE,
        updatedByUserId: 5,
      },
    });
    expect(result.center.id).toBe('2');
  });

  it('rejects a type that does not belong to the submitted classification', () => {
    const service = createService();

    expect(() =>
      callPrivate(
        service,
        'ensureTypeMatchesClassification',
        {
          classificationId: 10n,
        },
        '11',
      ),
    ).toThrow(BadRequestException);
  });

  it('does not silently map custom type names to a legacy TEAM category', () => {
    const service = createService();

    expect(() => callPrivate(service, 'categoryFromTypeName', 'Custom Storefront Segment')).toThrow(BadRequestException);
  });
});

function createService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    responsibilityCenter: {},
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...prismaOverrides,
  };

  return new ResponsibilityCenterService(prisma as never);
}

function callPrivate<TReturn = unknown>(service: ResponsibilityCenterService, methodName: string, ...args: unknown[]): TReturn {
  return (service as never as Record<string, (...args: unknown[]) => TReturn>)[methodName](...args);
}

function createSuperAdmin(): AuthUser {
  return {
    id: 5,
    companyId: 77,
    role: AppRole.SUPER_ADMIN,
    systemRole: SystemRole.SUPER_ADMIN,
    membershipRole: MembershipRole.ADMIN,
    membershipStatus: MembershipStatus.ACTIVE,
    companyRoleId: null,
    companyRoleCode: null,
    companyRoleName: null,
    accessScope: AccessScopeLevel.COMPANY,
    enabledModules: [],
    permissions: [],
    userModules: { items: [], byBranch: [] },
  };
}

function createCenter({
  id,
  parentId = null,
  status = ResponsibilityCenterStatus.ACTIVE,
}: {
  id: bigint;
  parentId?: bigint | null;
  status?: ResponsibilityCenterStatus;
}) {
  return {
    id,
    companyId: 77,
    typeId: 4n,
    code: 'CC-DEPT-001',
    name: 'Department',
    category: ResponsibilityCenterCategory.DEPARTMENT,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: null,
    parentId,
    parent: null,
    status,
    description: '',
    createdByUserId: null,
    updatedByUserId: null,
    deletedAt: null,
    createdAt: new Date('2026-07-16T00:00:00.000Z'),
    updatedAt: new Date('2026-07-16T00:00:00.000Z'),
    type: {
      id: 4n,
      companyId: 77,
      classificationId: 8n,
      name: 'Department',
      codePrefix: 'DEPT',
      description: null,
      sortOrder: 0,
      isRequired: true,
      status: ResponsibilityCenterStatus.ACTIVE,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date('2026-07-16T00:00:00.000Z'),
      updatedAt: new Date('2026-07-16T00:00:00.000Z'),
      classification: {
        id: 8n,
        code: 'CC',
        name: 'Cost Center',
        trackingBehavior: 'EXPENSES',
        isSystem: true,
        status: ResponsibilityCenterStatus.ACTIVE,
        createdAt: new Date('2026-07-16T00:00:00.000Z'),
        updatedAt: new Date('2026-07-16T00:00:00.000Z'),
      },
    },
  };
}
