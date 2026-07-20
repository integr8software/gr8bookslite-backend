import type { PaymentType } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';

export function mapPaymentType(paymentType: PaymentType, userNames: Map<number, string>) {
  return {
    id: paymentType.id.toString(),
    name: paymentType.name,
    description: paymentType.description ?? '',
    classification: paymentType.classification,
    sortOrder: paymentType.sortOrder,
    status: paymentType.status,
    createdBy: paymentType.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(paymentType.createdByUserId) ?? null),
    createdAt: paymentType.createdAt,
    updatedBy: (paymentType.updatedByUserId && userNames.get(paymentType.updatedByUserId)) ?? null,
    updatedAt: paymentType.updatedAt,
  };
}
