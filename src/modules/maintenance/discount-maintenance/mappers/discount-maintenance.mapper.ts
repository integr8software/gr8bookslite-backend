import { DiscountType } from '@prisma/client';
import type { DiscountWithAccount } from '../types/discount-with-account.type';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';

export function mapDiscount(discount: DiscountWithAccount, userNames: Map<number, string>) {
  return {
    id: discount.id.toString(),
    name: discount.name,
    description: discount.description ?? '',
    type: discount.type,
    valueType: discount.valueType,
    value: discount.value.toString(),
    status: discount.status,
    chartAccountId: discount.chartAccountId.toString(),
    accountCode: discount.chartAccount.accountCode,
    accountTitle: discount.chartAccount.accountTitle,
    accountGroupPath: discount.type === DiscountType.PURCHASES ? 'Cost of Sales > Purchase Discount' : 'Sales > Sales Discount',
    createdBy: discount.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(discount.createdByUserId) ?? null),
    createdAt: discount.createdAt,
    updatedBy: (discount.updatedByUserId && userNames.get(discount.updatedByUserId)) ?? null,
    updatedAt: discount.updatedAt,
  };
}
