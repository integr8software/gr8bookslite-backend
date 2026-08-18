import { PaymentTypeClassification, PaymentTypeStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PaymentTypeMaintenanceService } from './payment-type-maintenance.service';

describe('PaymentTypeMaintenanceService payment type options', () => {
  function createService() {
    const prisma = {
      paymentType: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new PaymentTypeMaintenanceService(prisma as never) };
  }

  it('returns active payment types for the requested classification', async () => {
    const { prisma, service } = createService();
    prisma.paymentType.findMany.mockResolvedValue([
      {
        id: 7n,
        name: 'Bank Transfer',
        classification: PaymentTypeClassification.NON_CASH_SETTLEMENT,
        sortOrder: 20,
        status: PaymentTypeStatus.ACTIVE,
      },
    ]);

    const result = await service.findOptions(
      { companyId: 11, role: AppRole.SUPER_ADMIN } as never,
      { search: ' transfer ', classification: PaymentTypeClassification.NON_CASH_SETTLEMENT },
    );

    expect(prisma.paymentType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: PaymentTypeStatus.ACTIVE,
          classification: PaymentTypeClassification.NON_CASH_SETTLEMENT,
          name: { contains: 'transfer', mode: 'insensitive' },
        },
      }),
    );
    expect(result.paymentTypes).toEqual([
      {
        id: '7',
        name: 'Bank Transfer',
        classification: PaymentTypeClassification.NON_CASH_SETTLEMENT,
        sortOrder: 20,
        status: PaymentTypeStatus.ACTIVE,
      },
    ]);
  });
});
