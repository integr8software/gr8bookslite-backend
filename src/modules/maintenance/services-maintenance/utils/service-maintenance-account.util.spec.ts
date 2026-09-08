import { BadRequestException } from '@nestjs/common';
import { ChartAccountLevel, ChartAccountStatus, ChartAccountType, ServiceMaintenanceType } from '@prisma/client';
import {
  buildServiceRevenueAccountGroupTags,
  findSelectableServiceAccountOrThrow,
  findSelectableServiceRevenueAccountOrThrow,
  findServiceRevenueParentOrThrow,
  generateNextServiceRevenueAccountCode,
  ServiceRevenueAccountGroupTag,
} from './service-maintenance-account.util';
import { SystemAccountGroupTags } from '../../chart-of-accounts/utils/system-account-groups.util';

describe('service-maintenance-account.util', () => {
  function createMockTx() {
    return {
      chartAccount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
  }

  describe('findServiceRevenueParentOrThrow', () => {
    it('finds the service revenue parent system account group', async () => {
      const tx = createMockTx();
      const parentGroup = {
        id: 10n,
        accountCode: '4010100000',
        accountGroup: [SystemAccountGroupTags.servicesMaintenanceRevenueParent],
      };
      tx.chartAccount.findMany.mockResolvedValue([parentGroup]);

      const result = await findServiceRevenueParentOrThrow(1, tx as never);
      expect(result).toBe(parentGroup);
    });
  });

  describe('generateNextServiceRevenueAccountCode', () => {
    it('generates the next account code based on sibling codes', async () => {
      const tx = createMockTx();
      tx.chartAccount.findMany.mockResolvedValue([{ accountCode: '4010101001' }, { accountCode: '4010101002' }]);

      const code = await generateNextServiceRevenueAccountCode(1, 10n, '4010101000', tx as never);
      expect(code).toBe('4010101003');
      expect(tx.chartAccount.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 1,
          parentAccountId: 10n,
          accountLevel: ChartAccountLevel.SPECIFIC,
        },
        select: { accountCode: true },
        orderBy: { accountCode: 'asc' },
      });
    });
  });

  describe('findSelectableServiceAccountOrThrow', () => {
    it('throws BadRequestException if the account is not found or not active/posting', async () => {
      const tx = createMockTx();
      tx.chartAccount.findFirst.mockResolvedValue(null);

      await expect(findSelectableServiceAccountOrThrow(1, '55', ServiceMaintenanceType.SALES, tx as never)).rejects.toThrow(
        new BadRequestException('Selected account must be an active posting account.'),
      );
    });

    it('throws BadRequestException for PURCHASES if accountType is not EXPENSE', async () => {
      const tx = createMockTx();
      tx.chartAccount.findFirst.mockResolvedValue({
        id: 55n,
        accountType: ChartAccountType.ASSET,
        accountGroup: [],
      });

      await expect(findSelectableServiceAccountOrThrow(1, '55', ServiceMaintenanceType.PURCHASES, tx as never)).rejects.toThrow(
        new BadRequestException('Selected account for purchase of service must be an active posting expense account.'),
      );
    });

    it('returns account for PURCHASES when account is EXPENSE', async () => {
      const tx = createMockTx();
      const expenseAccount = {
        id: 55n,
        accountType: ChartAccountType.EXPENSE,
        accountGroup: [],
      };
      tx.chartAccount.findFirst.mockResolvedValue(expenseAccount);

      const result = await findSelectableServiceAccountOrThrow(1, '55', ServiceMaintenanceType.PURCHASES, tx as never);
      expect(result).toBe(expenseAccount);
    });

    it('throws BadRequestException for SALES if accountType is not REVENUE', async () => {
      const tx = createMockTx();
      tx.chartAccount.findFirst.mockResolvedValue({
        id: 55n,
        accountType: ChartAccountType.EXPENSE,
        accountGroup: [SystemAccountGroupTags.serviceRevenues],
      });

      await expect(findSelectableServiceAccountOrThrow(1, '55', ServiceMaintenanceType.SALES, tx as never)).rejects.toThrow(
        new BadRequestException('Selected revenue account must be an active posting account under Service Revenues.'),
      );
    });

    it('throws BadRequestException for SALES if accountGroup does not have serviceRevenues tag', async () => {
      const tx = createMockTx();
      tx.chartAccount.findFirst.mockResolvedValue({
        id: 55n,
        accountType: ChartAccountType.REVENUE,
        accountGroup: ['Sales Revenue'],
      });

      await expect(findSelectableServiceAccountOrThrow(1, '55', ServiceMaintenanceType.SALES, tx as never)).rejects.toThrow(
        new BadRequestException('Selected revenue account must be an active posting account under Service Revenues.'),
      );
    });

    it('returns account for SALES when account is REVENUE and has serviceRevenues tag', async () => {
      const tx = createMockTx();
      const revenueAccount = {
        id: 55n,
        accountType: ChartAccountType.REVENUE,
        accountGroup: [SystemAccountGroupTags.serviceRevenues],
      };
      tx.chartAccount.findFirst.mockResolvedValue(revenueAccount);

      const result = await findSelectableServiceAccountOrThrow(1, '55', ServiceMaintenanceType.SALES, tx as never);
      expect(result).toBe(revenueAccount);
    });
  });

  describe('findSelectableServiceRevenueAccountOrThrow', () => {
    it('delegates to findSelectableServiceAccountOrThrow with SALES serviceType', async () => {
      const tx = createMockTx();
      const revenueAccount = {
        id: 55n,
        accountType: ChartAccountType.REVENUE,
        accountGroup: [SystemAccountGroupTags.serviceRevenues],
      };
      tx.chartAccount.findFirst.mockResolvedValue(revenueAccount);

      const result = await findSelectableServiceRevenueAccountOrThrow(1, '55', tx as never);
      expect(result).toBe(revenueAccount);
    });
  });

  describe('buildServiceRevenueAccountGroupTags', () => {
    it('merges revenue and serviceRevenues tags', () => {
      const tags = buildServiceRevenueAccountGroupTags();
      expect(tags).toContain(SystemAccountGroupTags.revenue);
      expect(tags).toContain(SystemAccountGroupTags.serviceRevenues);
      expect(ServiceRevenueAccountGroupTag).toBe(SystemAccountGroupTags.serviceRevenues);
    });
  });
});
