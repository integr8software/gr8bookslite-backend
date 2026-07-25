import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ChartAccountStatus, TaxTransactionScope, TaxTreatment } from '@prisma/client';
import { AppRole } from '../../common/enums/app-role.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { TaxAccessService } from './services/tax-access.service';
import { TaxCatalogService } from './services/tax-catalog.service';
import { TaxCompanyConfigurationService } from './services/tax-company-configuration.service';
import { normalizeTaxPercentage, normalizeTaxRecoverable } from './utils/tax-definition.util';

describe('Tax module services', () => {
  it('enforces unique global tax codes', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 3n });
    const service = createCatalogService({
      taxMaintenance: { findFirst },
    });

    await expect(callPrivate<Promise<void>>(service, 'ensureCodeAvailable', ' xx-vat-std ')).rejects.toBeInstanceOf(ConflictException);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        id: undefined,
        code: { equals: 'XX-VAT-STD', mode: 'insensitive' },
      },
      select: { id: true },
    });
  });

  it('forces zero amounts for legal zero, exempt, and out-of-scope treatments', () => {
    expect(normalizeTaxPercentage(TaxTreatment.ZERO_RATED, 12)).toBe(0);
    expect(normalizeTaxPercentage(TaxTreatment.EXEMPT, 12)).toBe(0);
    expect(normalizeTaxPercentage(TaxTreatment.OUT_OF_SCOPE, 12)).toBe(0);
    expect(normalizeTaxPercentage(TaxTreatment.STANDARD, 12)).toBe(12);
  });

  it('forces exempt and out-of-scope definitions to be non-recoverable', () => {
    expect(normalizeTaxRecoverable(TaxTreatment.EXEMPT, true)).toBe(false);
    expect(normalizeTaxRecoverable(TaxTreatment.OUT_OF_SCOPE, true)).toBe(false);
    expect(normalizeTaxRecoverable(TaxTreatment.ZERO_RATED, true)).toBe(true);
  });

  it('allows authenticated users to view but restricts maintenance to superadmins', () => {
    const service = new TaxAccessService({} as never);
    const companyUser = { role: AppRole.USER };
    const superadmin = { role: AppRole.SUPER_ADMIN };

    expect(() => service.assertCan(companyUser as never, PermissionAction.VIEW)).not.toThrow();
    expect(() => service.assertCan(companyUser as never, PermissionAction.CREATE)).toThrow(ForbiddenException);
    expect(() => service.assertCan(companyUser as never, PermissionAction.UPDATE)).toThrow(ForbiddenException);
    expect(() => service.assertCan(superadmin as never, PermissionAction.CREATE)).not.toThrow();
    expect(() => service.assertCan(superadmin as never, PermissionAction.UPDATE)).not.toThrow();
  });

  it('uses the persisted Tax List order by default', () => {
    const service = createCatalogService();
    expect(callPrivate(service, 'buildOrderBy', {})).toEqual([{ sortOrder: 'asc' }, { id: 'asc' }]);
  });

  it('persists a complete Tax List reorder in ten-point increments', async () => {
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const service = createCatalogService({
      taxMaintenance: {
        findMany: jest.fn().mockResolvedValue([{ id: 1n }, { id: 2n }, { id: 3n }]),
        update,
      },
      $transaction: jest.fn().mockImplementation((operations) => Promise.all(operations)),
    });

    await service.reorder({ id: 9, role: AppRole.SUPER_ADMIN } as never, { taxIds: ['3', '1', '2'] });

    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 3n },
      data: { sortOrder: 10, updatedByUserId: 9 },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 1n },
      data: { sortOrder: 20, updatedByUserId: 9 },
    });
    expect(update).toHaveBeenNthCalledWith(3, {
      where: { id: 2n },
      data: { sortOrder: 30, updatedByUserId: 9 },
    });
  });

  it.each([
    [TaxTransactionScope.PURCHASE, 'INPUT_TAX_ACCOUNT', 'DEBIT', 'Input VAT'],
    [TaxTransactionScope.SALE, 'OUTPUT_VAT_ACCOUNT', 'CREDIT', 'Output VAT'],
  ])('resolves the company-owned posting account for %s transactions', async (transactionScope, accountRole, postingSide, title) => {
    const findFirst = jest.fn().mockResolvedValue({ id: 7n, percentage: 12 });
    const findUnique = jest.fn().mockResolvedValue({
      chartAccount: {
        id: 91n,
        companyId: 42,
        accountCode: accountRole === 'INPUT_TAX_ACCOUNT' ? '2010002011' : '2010002005',
        accountTitle: title,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
    });
    const service = createCompanyConfigurationService({
      taxMaintenance: { findFirst },
      companyAccountMapping: { findUnique },
    });

    const result = await service.resolveTaxForTransaction(42, 7n, transactionScope);

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        companyId_moduleCode_accountRole: {
          companyId: 42,
          moduleCode: 'TXM',
          accountRole,
        },
      },
      include: { chartAccount: true },
    });
    expect(result).toMatchObject({
      postingAccountRole: accountRole,
      postingSide,
      postingAccount: { id: 91n, title },
    });
  });

  it('blocks posting when the company tax account is not configured', async () => {
    const service = createCompanyConfigurationService({
      taxMaintenance: {
        findFirst: jest.fn().mockResolvedValue({ id: 7n, percentage: 12 }),
      },
      companyAccountMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.resolveTaxForTransaction(42, 7n, TaxTransactionScope.PURCHASE)).rejects.toThrow(BadRequestException);
  });
});

function createCatalogService(prismaOverrides: Record<string, unknown> = {}) {
  const access = new TaxAccessService(prismaOverrides as never);
  return new TaxCatalogService(
    prismaOverrides as never,
    access,
    {
      getAccountingOptions: jest.fn(),
      getEmptyAccountingOptions: jest.fn(),
    } as never,
    {} as never,
  );
}

function createCompanyConfigurationService(prismaOverrides: Record<string, unknown> = {}) {
  return new TaxCompanyConfigurationService(prismaOverrides as never, new TaxAccessService(prismaOverrides as never));
}

function callPrivate<TReturn = unknown>(service: object, methodName: string, ...args: unknown[]): TReturn {
  return (service as Record<string, (...methodArgs: unknown[]) => TReturn>)[methodName](...args);
}
