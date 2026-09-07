import { BadRequestException } from '@nestjs/common';
import { ChartAccountStatus, ServiceAccountSetupMode, ServiceMaintenanceType } from '@prisma/client';
import {
  buildServiceMaintenanceListWhere,
  buildServiceMaintenanceOrderBy,
  resolveServiceRevenueAccountTitle,
  toCreateServiceMaintenanceData,
  toUpdateServiceMaintenanceData,
  validateServiceMaintenanceInput,
} from './service-maintenance-data.util';

describe('service-maintenance-data.util', () => {
  describe('buildServiceMaintenanceListWhere', () => {
    it('builds default where clause with companyId and deletedAt null', () => {
      const where = buildServiceMaintenanceListWhere(5, {});
      expect(where).toEqual({
        companyId: 5,
        deletedAt: null,
      });
    });

    it('builds where clause with status, accountSetupMode, and serviceType', () => {
      const where = buildServiceMaintenanceListWhere(5, {
        status: ChartAccountStatus.ACTIVE,
        accountSetupMode: ServiceAccountSetupMode.AUTO,
        serviceType: ServiceMaintenanceType.SALES,
      });
      expect(where).toEqual({
        companyId: 5,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
        accountSetupMode: ServiceAccountSetupMode.AUTO,
        serviceType: ServiceMaintenanceType.SALES,
      });
    });

    it('builds where clause with search term across service name, description, and revenueCoa', () => {
      const where = buildServiceMaintenanceListWhere(5, {
        search: '  consulting  ',
      });
      expect(where).toEqual({
        companyId: 5,
        deletedAt: null,
        OR: [
          { serviceName: { contains: 'consulting', mode: 'insensitive' } },
          { description: { contains: 'consulting', mode: 'insensitive' } },
          { revenueCoa: { accountCode: { contains: 'consulting', mode: 'insensitive' } } },
          { revenueCoa: { accountTitle: { contains: 'consulting', mode: 'insensitive' } } },
        ],
      });
    });
  });

  describe('buildServiceMaintenanceOrderBy', () => {
    it('defaults to sorting by serviceName asc and id asc', () => {
      const orderBy = buildServiceMaintenanceOrderBy({});
      expect(orderBy).toEqual([{ serviceName: 'asc' }, { id: 'asc' }]);
    });

    it('respects custom sortBy and sortDirection', () => {
      const orderBy = buildServiceMaintenanceOrderBy({
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });
      expect(orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });
  });

  describe('validateServiceMaintenanceInput', () => {
    it('throws BadRequestException if serviceName is empty or only whitespace', () => {
      expect(() =>
        validateServiceMaintenanceInput({
          serviceName: '   ',
          serviceType: ServiceMaintenanceType.SALES,
          accountSetupMode: ServiceAccountSetupMode.AUTO,
        }),
      ).toThrow(new BadRequestException('Service name is required.'));
    });

    it('throws BadRequestException if accountSetupMode is EXISTING and revenueCoaId is missing', () => {
      expect(() =>
        validateServiceMaintenanceInput({
          serviceName: 'Valid Service',
          serviceType: ServiceMaintenanceType.SALES,
          accountSetupMode: ServiceAccountSetupMode.EXISTING,
          revenueCoaId: '   ',
        }),
      ).toThrow(new BadRequestException('Account is required when selecting an existing account.'));
    });

    it('throws BadRequestException if serviceType is PURCHASES, AUTO setup mode, and expenseParentCoaId is empty', () => {
      expect(() =>
        validateServiceMaintenanceInput({
          serviceName: 'Valid Service',
          serviceType: ServiceMaintenanceType.PURCHASES,
          accountSetupMode: ServiceAccountSetupMode.AUTO,
          expenseParentCoaId: '   ',
        }),
      ).toThrow(new BadRequestException('Expense type is required for purchase of service.'));
    });

    it('does not throw for valid inputs', () => {
      expect(() =>
        validateServiceMaintenanceInput({
          serviceName: 'Valid Service',
          serviceType: ServiceMaintenanceType.SALES,
          accountSetupMode: ServiceAccountSetupMode.AUTO,
        }),
      ).not.toThrow();

      expect(() =>
        validateServiceMaintenanceInput({
          serviceName: 'Valid Purchase Service',
          serviceType: ServiceMaintenanceType.PURCHASES,
          accountSetupMode: ServiceAccountSetupMode.EXISTING,
          revenueCoaId: '10',
        }),
      ).not.toThrow();
    });
  });

  describe('resolveServiceRevenueAccountTitle', () => {
    it('trims service name', () => {
      expect(resolveServiceRevenueAccountTitle('  Consulting Service  ')).toBe('Consulting Service');
    });
  });

  describe('toCreateServiceMaintenanceData', () => {
    it('creates properly structured Prisma data object', () => {
      const data = toCreateServiceMaintenanceData(
        {
          serviceName: '  Delivery Service  ',
          serviceType: ServiceMaintenanceType.SALES,
          description: '  Standard delivery  ',
          accountSetupMode: ServiceAccountSetupMode.AUTO,
        },
        100n,
        true,
      );

      expect(data).toEqual({
        serviceName: 'Delivery Service',
        serviceType: ServiceMaintenanceType.SALES,
        description: 'Standard delivery',
        accountSetupMode: ServiceAccountSetupMode.AUTO,
        revenueCoaId: 100n,
        isGeneratedRevenueAccount: true,
      });
    });
  });

  describe('toUpdateServiceMaintenanceData', () => {
    it('creates update data object with only defined fields', () => {
      const data = toUpdateServiceMaintenanceData(
        {
          serviceName: '  Updated Service  ',
          status: ChartAccountStatus.INACTIVE,
        },
        200n,
        false,
      );

      expect(data).toEqual({
        serviceName: 'Updated Service',
        status: ChartAccountStatus.INACTIVE,
        revenueCoaId: 200n,
        isGeneratedRevenueAccount: false,
      });
    });

    it('handles empty update dto', () => {
      const data = toUpdateServiceMaintenanceData({});
      expect(data).toEqual({});
    });
  });
});
