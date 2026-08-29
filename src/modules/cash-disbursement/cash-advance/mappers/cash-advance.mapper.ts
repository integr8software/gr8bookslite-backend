import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { CashAdvanceWithPayload } from '../prisma/cash-advance.include';

export function mapCashAdvance(record: CashAdvanceWithPayload, userNames: Map<number, string>) {
  return {
    id: record.id.toString(),
    transNo: record.transNo,
    documentDate: toDateValue(record.documentDate),
    dueDate: record.dueDate ? toDateValue(record.dueDate) : null,
    referenceNo: record.referenceNo ?? null,
    partyId: record.partyId?.toString() ?? null,
    partyCode: record.partyCodeSnapshot || record.party?.partyCodeNo || '',
    partyName: record.partyNameSnapshot || record.party?.partyName || '',
    accountCode: record.accountCodeSnapshot || record.creditAccount?.accountCode || '',
    accountTitle: record.accountTitleSnapshot || record.creditAccount?.accountTitle || '',
    costCenter: record.costCenterSnapshot ?? null,
    costCenterCode: record.costCenterCodeSnapshot ?? null,
    projectName: record.projectNameSnapshot ?? null,
    projectCode: record.projectCodeSnapshot ?? null,
    projectRef: record.projectNameSnapshot ?? null,
    currency: record.currencyCode,
    fxRate: Number(record.exchangeRate),
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
