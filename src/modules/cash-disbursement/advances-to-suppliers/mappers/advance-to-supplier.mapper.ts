import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { AdvanceToSupplierWithPayload } from '../prisma/advance-to-supplier.include';

export function mapAdvanceToSupplier(record: AdvanceToSupplierWithPayload, userNames: Map<number, string>) {
  return {
    id: record.id.toString(),
    transactionNo: record.transNo,
    documentDate: toDateValue(record.documentDate),
    partyId: record.partyId?.toString() ?? null,
    partyCode: record.partyCodeSnapshot || record.party?.partyCodeNo || '',
    partyName: record.partyNameSnapshot || record.party?.partyName || '',
    accountCode: record.accountCodeSnapshot || record.creditAccount?.accountCode || '',
    accountTitle: record.accountTitleSnapshot || record.creditAccount?.accountTitle || '',
    responsibilityCenter: record.responsibilityCenterSnapshot ?? null,
    responsibilityCenterCode: record.responsibilityCenterCodeSnapshot ?? null,
    projectName: record.projectNameSnapshot ?? null,
    projectCode: record.projectCodeSnapshot ?? null,
    currency: record.currencyCode,
    exchangeRate: Number(record.exchangeRate),
    poReference: record.poReference,
    totalPoAmount: Number(record.totalPoAmount),
    advancePaymentType: record.advancePaymentType,
    advancePaymentPercentage: Number(record.advancePaymentPercentage),
    amount: Number(record.amount),
    remarks: record.remarks ?? null,
    status: record.status,
    createdBy: record.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(record.createdByUserId) ?? null),
    createdAt: record.createdAt.toISOString(),
    updatedBy: (record.updatedByUserId && userNames.get(record.updatedByUserId)) ?? null,
    updatedAt: record.updatedAt?.toISOString() ?? null,
  };
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
