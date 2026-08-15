import { NotFoundException } from '@nestjs/common';
import { AccessScopeLevel, CompanyUnitType, MembershipRole, MembershipStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { WorkspaceCompaniesService } from './workspace-companies.service';

describe('WorkspaceCompaniesService', () => {
  function createService(
    prismaOverrides: {
      company?: Record<string, unknown>;
      companyUnit?: Record<string, unknown>;
      membership?: Record<string, unknown>;
    } = {},
  ) {
    const company = { findUnique: jest.fn() };
    const companyUnit = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    };
    const membership = { findUnique: jest.fn() };

    Object.assign(company, prismaOverrides.company);
    Object.assign(companyUnit, prismaOverrides.companyUnit);
    Object.assign(membership, prismaOverrides.membership);

    const prisma = { company, companyUnit, membership };
    const auditLogsService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new WorkspaceCompaniesService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, auditLogsService as never);

    return { auditLogsService, prisma, service };
  }

  it('applies unit access filters and propagates head-office TIN to satellites', async () => {
    const headOffice = {
      id: 10,
      companyId: 20,
      parentUnitId: null,
      type: CompanyUnitType.HEAD_OFFICE,
      code: 'HEAD-OFFICE',
      name: 'Head Office',
      tin: '123456789',
      address: null,
      contactNumber: null,
      email: null,
      isActive: true,
      inheritsCompanyProfile: true,
      canTransactSales: true,
      canHoldInventory: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const satellite = { ...headOffice, id: 11, type: CompanyUnitType.SATELLITE, parentUnitId: 10, tin: null, name: 'Satellite' };
    const membership = {
      role: MembershipRole.USER,
      status: MembershipStatus.ACTIVE,
      accessScope: AccessScopeLevel.BRANCH,
      unitAccess: [{ unitId: 10 }, { unitId: 11 }],
    };
    const { prisma, service } = createService({
      companyUnit: {
        findMany: jest.fn().mockResolvedValue([headOffice, satellite]),
      },
      membership: {
        findUnique: jest.fn().mockResolvedValue(membership),
      },
    });

    const result = await service.findUnits({ id: 5, role: AppRole.USER } as AuthUser, 20);

    expect(prisma.companyUnit.findMany).toHaveBeenCalledWith({
      where: { companyId: 20, id: { in: [10, 11] } },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
    expect(result).toEqual([
      expect.objectContaining({ id: 10, type: CompanyUnitType.HEAD_OFFICE, tin: '123456789' }),
      expect.objectContaining({ id: 11, type: CompanyUnitType.SATELLITE, tin: '123456789' }),
    ]);
  });

  it('rejects unit listing for a missing or removed membership', async () => {
    const { service } = createService({
      membership: {
        findUnique: jest.fn().mockResolvedValue({ role: MembershipRole.USER, status: MembershipStatus.REMOVED, unitAccess: [] }),
      },
    });

    await expect(service.findUnits({ id: 5, role: AppRole.USER } as AuthUser, 20)).rejects.toThrow(new NotFoundException('Company not found.'));
  });

  it('generates a suffixed branch code when the requested code is already used', async () => {
    const branch = {
      id: 31,
      companyId: 20,
      parentUnitId: 10,
      type: CompanyUnitType.BRANCH,
      code: 'NORTH-2',
      name: 'North Branch',
      tin: '987654321',
      address: null,
      contactNumber: null,
      email: 'north@example.com',
      isActive: true,
      inheritsCompanyProfile: false,
      canTransactSales: true,
      canHoldInventory: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 10, type: CompanyUnitType.HEAD_OFFICE, tin: '123456789' })
      .mockResolvedValueOnce({ id: 30 })
      .mockResolvedValueOnce(null);
    const { auditLogsService, prisma, service } = createService({
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 20, name: 'Acme', tin: '123456789' }),
      },
      companyUnit: {
        findFirst,
        create: jest.fn().mockResolvedValue(branch),
      },
      membership: {
        findUnique: jest.fn().mockResolvedValue({ role: MembershipRole.ADMIN, status: MembershipStatus.ACTIVE }),
      },
    });

    await service.createUnit({ id: 5, role: AppRole.USER } as AuthUser, 20, {
      type: 'BRANCH',
      name: ' North Branch ',
      code: 'NORTH',
      tin: ' 987654321 ',
      email: 'NORTH@EXAMPLE.COM',
    });

    expect(prisma.companyUnit.create).toHaveBeenCalledWith({
      data: {
        companyId: 20,
        parentUnitId: 10,
        type: CompanyUnitType.BRANCH,
        code: 'NORTH-2',
        name: 'North Branch',
        tin: '987654321',
        address: null,
        contactNumber: null,
        email: 'north@example.com',
        isActive: true,
        inheritsCompanyProfile: false,
        canTransactSales: true,
        canHoldInventory: true,
      },
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entityType: 'CompanyUnit', entityId: 31 }));
  });
});
