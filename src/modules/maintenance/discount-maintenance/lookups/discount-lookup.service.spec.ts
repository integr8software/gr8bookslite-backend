/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import { DiscountStatus, DiscountType, DiscountValueType, Prisma } from '@prisma/client';
import { DiscountLookupService } from './discount-lookup.service';

describe('DiscountLookupService', () => {
  it('applies lookup filters and serializes decimal values', async () => {
    const prisma = { discount: { findMany: jest.fn() } };
    const service = new DiscountLookupService(prisma as never);
    const type = Object.values(DiscountType)[0];
    const valueType = Object.values(DiscountValueType)[0];
    prisma.discount.findMany.mockResolvedValue([{ id: 8n, name: 'VIP', type, valueType, value: new Prisma.Decimal('12.50'), status: DiscountStatus.ACTIVE }]);

    await expect(service.findOptions({ companyId: 11, search: ' vip ', type, valueType })).resolves.toEqual([
      { id: '8', name: 'VIP', type, valueType, value: '12.5', status: DiscountStatus.ACTIVE },
    ]);
    expect(prisma.discount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          status: DiscountStatus.ACTIVE,
          type,
          valueType,
          name: { contains: 'vip', mode: 'insensitive' },
        }),
      }),
    );
  });
});
