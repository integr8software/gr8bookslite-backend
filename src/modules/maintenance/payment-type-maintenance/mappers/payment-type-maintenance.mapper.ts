import type { PaymentType } from '@prisma/client';

const SystemGeneratedLabel = 'System Generated';

export function mapPaymentType(
  paymentType: PaymentType,
  userNames: Map<number, string>,
) {
  return {
    id: paymentType.id.toString(),
    name: paymentType.name,
    description: paymentType.description ?? '',
    classification: paymentType.classification,
    status: paymentType.status,
    createdBy:
      paymentType.createdByUserId === null
        ? SystemGeneratedLabel
        : (userNames.get(paymentType.createdByUserId) ?? null),
    createdAt: paymentType.createdAt,
    updatedBy:
      (paymentType.updatedByUserId &&
        userNames.get(paymentType.updatedByUserId)) ??
      null,
    updatedAt: paymentType.updatedAt,
  };
}
