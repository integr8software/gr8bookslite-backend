import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { JournalVoucherListRow, JournalVoucherWithEntries } from '../types/journal-voucher-with-entries.type';

export function mapJournalVoucherListItem(voucher: JournalVoucherListRow) {
  return {
    id: voucher.id.toString(),
    branchUnitId: voucher.branchUnitId,
    transactionNo: voucher.transactionNo,
    documentDate: toDateValue(voucher.documentDate),
    remarks: voucher.remarks ?? null,
    currencyCode: voucher.currencyCode,
    exchangeRate: Number(voucher.exchangeRate),
    totalDebit: Number(voucher.totalDebit),
    totalCredit: Number(voucher.totalCredit),
    status: voucher.status,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
  };
}

export function mapJournalVoucher(voucher: JournalVoucherWithEntries, userNames: Map<number, string>) {
  return {
    id: voucher.id.toString(),
    companyId: voucher.companyId,
    branchUnitId: voucher.branchUnitId,
    transactionNo: voucher.transactionNo,
    documentDate: toDateValue(voucher.documentDate),
    remarks: voucher.remarks ?? null,
    currencyCode: voucher.currencyCode,
    exchangeRate: Number(voucher.exchangeRate),
    totalDebit: Number(voucher.totalDebit),
    totalCredit: Number(voucher.totalCredit),
    status: voucher.status,
    lines: voucher.journalEntries.map((entry) => ({
      id: entry.id.toString(),
      lineNumber: entry.lineNumber,
      accountId: entry.accountId?.toString() ?? null,
      accountCode: entry.accountCodeSnapshot,
      accountTitle: entry.accountTitleSnapshot,
      particulars: getTaxCleanedParticulars(entry.particulars, entry.vatType, entry.atcCode),
      partyCode: entry.partyCodeSnapshot ?? null,
      partyName: entry.partyNameSnapshot ?? null,
      responsibilityCenterId: entry.responsibilityCenterId?.toString() ?? null,
      responsibilityCenter: entry.responsibilityCenterSnapshot ?? null,
      refNo: entry.refNo ?? null,
      vatType: entry.vatType ?? null,
      atcCode: entry.atcCode ?? null,
      debit: Number(entry.debit),
      credit: Number(entry.credit),
    })),
    createdBy: mapAuditUser(voucher.createdByUserId, userNames),
    updatedBy: mapOptionalAuditUser(voucher.updatedByUserId, userNames),
    submittedBy: mapOptionalAuditUser(voucher.submittedByUserId, userNames),
    submittedAt: voucher.submittedAt?.toISOString() ?? null,
    postedBy: mapOptionalAuditUser(voucher.postedByUserId, userNames),
    postedAt: voucher.postedAt?.toISOString() ?? null,
    disapprovedBy: mapOptionalAuditUser(voucher.disapprovedByUserId, userNames),
    disapprovedAt: voucher.disapprovedAt?.toISOString() ?? null,
    cancelledBy: mapOptionalAuditUser(voucher.cancelledByUserId, userNames),
    cancelledAt: voucher.cancelledAt?.toISOString() ?? null,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
  };
}

function mapAuditUser(userId: number | null, userNames: Map<number, string>) {
  return userId === null ? SystemGeneratedAuditLabel : (userNames.get(userId) ?? null);
}

function mapOptionalAuditUser(userId: number | null, userNames: Map<number, string>) {
  return userId === null ? null : (userNames.get(userId) ?? null);
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTaxCleanedParticulars(particulars: string | null | undefined, vatType: string | null | undefined, atcCode: string | null | undefined) {
  const normalizedParticulars = particulars?.trim() ?? '';

  if (!normalizedParticulars) {
    return null;
  }

  const hasSelectedTax = Boolean(vatType?.trim() || atcCode?.trim());

  if (hasSelectedTax && isGeneratedTaxParticulars(normalizedParticulars)) {
    return null;
  }

  return normalizedParticulars;
}

function isGeneratedTaxParticulars(value: string) {
  return /^(input vat|ewt)(\s+-\s+.*)?$/i.test(value.trim());
}
