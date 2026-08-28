import { BadRequestException } from '@nestjs/common';
import { PaymentTypeStatus } from '@prisma/client';
import type { PaymentType } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { OfficialReceiptService } from './official-receipt.service';
import type { OfficialReceiptAccountingService } from './services/official-receipt-accounting.service';

describe('OfficialReceiptService payment type resolution', () => {
  const findFirst = jest.fn();
  const prisma = {
    paymentType: { findFirst },
  } as unknown as PrismaService;
  const service = new OfficialReceiptService(prisma, {} as OfficialReceiptAccountingService);

  beforeEach(() => {
    findFirst.mockReset();
  });

  it('accepts an active payment type belonging to the receipt company', async () => {
    const paymentType = {
      companyId: 12,
      id: 31n,
      status: PaymentTypeStatus.ACTIVE,
    } as PaymentType;
    findFirst.mockResolvedValue(paymentType);

    await expect(service['resolvePaymentType'](prisma, 12, '31')).resolves.toBe(paymentType);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 12,
        deletedAt: null,
        id: 31n,
        status: PaymentTypeStatus.ACTIVE,
      },
    });
  });

  it('keeps payment type optional when no payment ID is supplied', async () => {
    await expect(service['resolvePaymentType'](prisma, 12, null)).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects a payment ID that does not reference an active company payment type', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service['resolvePaymentType'](prisma, 12, '31')).rejects.toThrow(
      new BadRequestException('Payment type must reference an active company payment type.'),
    );
  });
});
