import {
  PaymentTypeClassification,
  PaymentTypeStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type PaymentTypeWriteClient =
  | Pick<PrismaService, 'paymentType'>
  | Prisma.TransactionClient;

export const PaymentTypeMaintenanceSeedRecords = [
  {
    name: 'Cash',
    description: 'Cash payment without additional bank details.',
    classification: PaymentTypeClassification.CASH,
  },
  {
    name: 'Check',
    description: 'Bank-issued check payment requiring bank and check details.',
    classification: PaymentTypeClassification.WITH_BANK,
  },
  {
    name: 'Bank Transfer',
    description: 'Transfer from one bank account to a recipient bank account.',
    classification: PaymentTypeClassification.BANK_TRANSFER,
  },
  {
    name: 'Debit Memo',
    description: 'Debit memo payment requiring bank and debit memo details.',
    classification: PaymentTypeClassification.DEBIT,
  },
  {
    name: "Manager's Check",
    description: "Bank-issued manager's check payment.",
    classification: PaymentTypeClassification.MULTIPLE_CHECK,
  },
  {
    name: 'InstaPay',
    description: 'Real-time bank transfer through InstaPay.',
    classification: PaymentTypeClassification.ONLINE_PAYMENT,
  },
  {
    name: 'PesoNet',
    description: 'Electronic fund transfer through PesoNet.',
    classification: PaymentTypeClassification.ONLINE_PAYMENT,
  },
  {
    name: 'eWallet',
    description: 'Digital wallet payment through an eWallet provider.',
    classification: PaymentTypeClassification.ONLINE_PAYMENT,
  },
] as const;

export async function seedCompanyPaymentTypeMaintenanceDefaults(
  tx: PaymentTypeWriteClient,
  companyId: number,
) {
  const existingCount = await tx.paymentType.count({
    where: {
      companyId,
      deletedAt: null,
    },
  });

  if (existingCount > 0) {
    return;
  }

  await tx.paymentType.createMany({
    data: PaymentTypeMaintenanceSeedRecords.map((paymentType) => ({
      companyId,
      name: paymentType.name,
      description: paymentType.description,
      classification: paymentType.classification,
      status: PaymentTypeStatus.ACTIVE,
      createdByUserId: null,
    })),
    skipDuplicates: true,
  });
}
