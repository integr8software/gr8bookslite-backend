import { PaymentTypeClassification, PaymentTypeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type PaymentTypeWriteClient = Pick<PrismaService, 'paymentType'> | Prisma.TransactionClient;

export const PaymentTypeMaintenanceSeedRecords = [
  {
    name: 'Internal Bank Transfer',
    description: 'Transfer between bank accounts within the same company.',
    classification: PaymentTypeClassification.BANK_TRANSFER,
    sortOrder: 10,
  },
  {
    name: 'Intercompany Bank Transfer',
    description: 'Transfer from a company bank account to another company.',
    classification: PaymentTypeClassification.BANK_TRANSFER,
    sortOrder: 20,
  },
  {
    name: 'InstaPay',
    description: 'Real-time bank transfer through InstaPay.',
    classification: PaymentTypeClassification.BANK_TRANSFER,
    sortOrder: 30,
  },
  {
    name: 'PESONet',
    description: 'Electronic fund transfer through PESONet.',
    classification: PaymentTypeClassification.BANK_TRANSFER,
    sortOrder: 40,
  },
  {
    name: 'Cash',
    description: 'Cash payment without additional bank details.',
    classification: PaymentTypeClassification.CASH,
    sortOrder: 50,
  },
  {
    name: 'Check',
    description: 'Bank-issued check payment requiring bank and check details.',
    classification: PaymentTypeClassification.CHECK,
    sortOrder: 60,
  },
  {
    name: "Manager's Check",
    description: "Bank-issued manager's check payment.",
    classification: PaymentTypeClassification.CHECK,
    sortOrder: 70,
  },
  {
    name: 'E-Wallet',
    description: 'Digital wallet payment through an e-wallet provider.',
    classification: PaymentTypeClassification.DIGITAL_WALLET,
    sortOrder: 80,
  },
  {
    name: 'Debit Memo',
    description: 'Non-cash settlement through debit memo.',
    classification: PaymentTypeClassification.NON_CASH_SETTLEMENT,
    sortOrder: 90,
  },
] as const;

export async function seedCompanyPaymentTypeMaintenanceDefaults(tx: PaymentTypeWriteClient, companyId: number) {
  const existingPaymentTypes = await tx.paymentType.findMany({
    where: {
      companyId,
      name: {
        in: PaymentTypeMaintenanceSeedRecords.map((paymentType) => paymentType.name),
      },
    },
    select: { name: true },
  });
  const existingNames = new Set(existingPaymentTypes.map((paymentType) => paymentType.name));
  const missingPaymentTypes = PaymentTypeMaintenanceSeedRecords.filter((paymentType) => !existingNames.has(paymentType.name));

  if (missingPaymentTypes.length === 0) {
    return 0;
  }

  const result = await tx.paymentType.createMany({
    data: missingPaymentTypes.map((paymentType) => ({
      companyId,
      name: paymentType.name,
      description: paymentType.description,
      classification: paymentType.classification,
      sortOrder: paymentType.sortOrder,
      status: PaymentTypeStatus.ACTIVE,
      createdByUserId: null,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
