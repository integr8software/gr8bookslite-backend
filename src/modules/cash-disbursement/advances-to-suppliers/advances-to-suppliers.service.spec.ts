import { BadRequestException } from '@nestjs/common';
import { AdvanceToSupplierStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdvancesToSuppliersService } from './advances-to-suppliers.service';

type AdvancesToSuppliersServiceInternals = {
  isSubmittedStatus: (status: AdvanceToSupplierStatus) => boolean;
  assertAdvanceToSupplierReady: (record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    poReference: string | null;
    totalPoAmount: Prisma.Decimal;
    amount: Prisma.Decimal;
  }) => void;
};

describe('AdvancesToSuppliersService', () => {
  const service = new AdvancesToSuppliersService({} as PrismaService) as unknown as AdvancesToSuppliersServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(AdvanceToSupplierStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(AdvanceToSupplierStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(AdvanceToSupplierStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(AdvanceToSupplierStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(AdvanceToSupplierStatus.CANCELLED)).toBe(false);
  });

  it('requires supplier, account, PO reference, and positive amounts before submission', () => {
    expect(() =>
      service.assertAdvanceToSupplierReady({
        partyCodeSnapshot: 'SUP-001',
        partyNameSnapshot: 'Supplier',
        accountCodeSnapshot: '1200',
        poReference: 'PO-001',
        totalPoAmount: new Prisma.Decimal('1000'),
        amount: new Prisma.Decimal('250'),
      }),
    ).not.toThrow();

    expect(() =>
      service.assertAdvanceToSupplierReady({
        partyCodeSnapshot: '',
        partyNameSnapshot: 'Supplier',
        accountCodeSnapshot: '1200',
        poReference: 'PO-001',
        totalPoAmount: new Prisma.Decimal('1000'),
        amount: new Prisma.Decimal('250'),
      }),
    ).toThrow(BadRequestException);
  });
});
