import { BadRequestException } from '@nestjs/common';
import { DiscountStatus, DiscountType, DiscountValueType } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { DiscountMaintenanceService } from './discount-maintenance.service';

describe('DiscountMaintenanceService discount options', () => {
  function createService() {
    const prisma = {
      discount: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new DiscountMaintenanceService(prisma as never) };
  }

  it('returns active percentage discounts scoped to the company', async () => {
    const { prisma, service } = createService();
    prisma.discount.findMany.mockResolvedValue([
      {
        id: 15n,
        name: 'Senior Citizen Discount',
        type: DiscountType.SALES,
        valueType: DiscountValueType.PERCENTAGE,
        value: { toString: () => '20' },
        status: DiscountStatus.ACTIVE,
      },
    ]);

    const result = await service.findOptions({ companyId: 11, role: AppRole.SUPER_ADMIN } as never, {
      search: ' senior ',
      type: DiscountType.SALES,
      valueType: DiscountValueType.PERCENTAGE,
    });

    expect(prisma.discount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: DiscountStatus.ACTIVE,
          type: DiscountType.SALES,
          valueType: DiscountValueType.PERCENTAGE,
          name: { contains: 'senior', mode: 'insensitive' },
        },
      }),
    );
    expect(result.discounts[0]).toEqual({
      id: '15',
      name: 'Senior Citizen Discount',
      type: DiscountType.SALES,
      valueType: DiscountValueType.PERCENTAGE,
      value: '20',
      status: DiscountStatus.ACTIVE,
    });
  });

  it('rejects percentage discounts greater than one hundred percent', () => {
    const { service } = createService();

    expect(() => callPrivate(service, 'validateDiscountValue', DiscountValueType.PERCENTAGE, 101)).toThrow(BadRequestException);
  });
});

function callPrivate(service: DiscountMaintenanceService, methodName: string, ...args: unknown[]) {
  return (service as never as Record<string, (...values: unknown[]) => unknown>)[methodName](...args);
}
