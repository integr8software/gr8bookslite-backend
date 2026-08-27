import { PaymentTypeClassification, PaymentTypeStatus } from '@prisma/client';
import { PaymentTypeLookupService } from './payment-type-lookup.service';

describe('PaymentTypeLookupService', () => {
  it('filters active options and maps database ids to strings', async () => {
    const prisma = { paymentType: { findMany: jest.fn() } };
    const service = new PaymentTypeLookupService(prisma as never);
    prisma.paymentType.findMany.mockResolvedValue([
      { id: 7n, name: 'Check', classification: PaymentTypeClassification.CHECK, sortOrder: 1, status: PaymentTypeStatus.ACTIVE },
    ]);

    await expect(service.findOptions({ companyId: 11, search: ' check ', classification: PaymentTypeClassification.CHECK })).resolves.toEqual([
      { id: '7', name: 'Check', classification: PaymentTypeClassification.CHECK, sortOrder: 1, status: PaymentTypeStatus.ACTIVE },
    ]);
    expect(prisma.paymentType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: PaymentTypeStatus.ACTIVE,
          classification: PaymentTypeClassification.CHECK,
          name: { contains: 'check', mode: 'insensitive' },
        },
      }),
    );
  });
});
