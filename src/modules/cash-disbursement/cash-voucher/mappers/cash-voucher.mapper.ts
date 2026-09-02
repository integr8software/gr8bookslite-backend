import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { CashVoucherWithDetails } from '../types/cash-voucher-with-details.type';

export function mapCashVoucher(voucher: CashVoucherWithDetails, userNames: Map<number, string>) {
  const partyCode = voucher.partyCodeSnapshot || voucher.party?.partyCodeNo || '';
  const partyName = voucher.partyNameSnapshot || voucher.party?.partyName || '';
  const creditAccountCode = voucher.creditAccount?.accountCode || '';
  const creditAccountTitle = voucher.creditAccount?.accountTitle || '';
  const sourceDetails = (voucher.details || []).filter((detail) => !isGeneratedCashVoucherDetail(detail));
  const grossAmount = sourceDetails.reduce((sum, detail) => sum + getCashVoucherDetailGrossAmount(detail), 0);
  const disburseAmount = sourceDetails.reduce((sum, detail) => sum + getCashVoucherDetailDisburseAmount(detail), 0);

  return {
    id: voucher.id.toString(),
    transactionId: voucher.id.toString(),
    branchUnitId: voucher.branchUnitId,
    transactionNo: voucher.voucherNo,
    voucherNo: voucher.voucherNo,
    documentDate: toDateValue(voucher.voucherDate),
    voucherDate: toDateValue(voucher.voucherDate),
    dueDate: voucher.paymentDueDate ? toDateValue(voucher.paymentDueDate) : toDateValue(voucher.voucherDate),
    paymentDueDate: voucher.paymentDueDate ? toDateValue(voucher.paymentDueDate) : toDateValue(voucher.voucherDate),
    referenceNo: voucher.referenceNo ?? null,
    referenceModule: voucher.referenceModule ?? null,
    voucherReferenceNo: voucher.voucherReferenceNo ?? null,
    invoiceReferenceNo: voucher.invoiceReferenceNo ?? null,
    paymentMethod: voucher.paymentMethod,
    disbursementType: voucher.disbursementType ?? 'Vendor Payment',
    partyId: voucher.partyId?.toString() ?? null,
    partyCode,
    partyName,
    creditAccountId: voucher.creditAccountId?.toString() ?? null,
    creditAccountCode,
    creditAccountTitle,
    costCenter: voucher.projectCode ?? null,
    department: voucher.projectCode ?? null,
    projectCode: voucher.projectCode ?? null,
    projectName: voucher.projectName ?? null,
    preparedBy: voucher.preparedBy ?? null,
    requestedBy: voucher.preparedBy ?? null,
    currency: voucher.currencyCode,
    currencyCode: voucher.currencyCode,
    fxRate: Number(voucher.exchangeRate),
    exchangeRate: Number(voucher.exchangeRate),
    amount: roundCashVoucherAmount(grossAmount || Number(voucher.amount)),
    disburseAmount: roundCashVoucherAmount(disburseAmount || Number(voucher.amount)),
    remarks: voucher.remarks ?? null,
    purpose: voucher.remarks ?? null,
    status: voucher.status,
    details: (voucher.details || []).map((detail) => ({
      id: detail.id.toString(),
      lineNumber: detail.lineNumber,
      accountId: detail.accountId?.toString() ?? null,
      accountCode: detail.accountCodeSnapshot || detail.account?.accountCode || '',
      accountTitle: detail.accountTitleSnapshot || detail.account?.accountTitle || '',
      accountName: detail.accountTitleSnapshot || detail.account?.accountTitle || '',
      particulars: detail.particulars ?? null,
      remarks: detail.remarks ?? null,
      debit: Number(detail.debit),
      credit: Number(detail.credit),
      grossAmount: Number(detail.grossAmount),
      netAmount: Number(detail.netAmount),
      vatType: detail.vatType ?? null,
      vatCode: detail.vatCode ?? null,
      vatPercent: Number(detail.vatPercent),
      vatAmount: Number(detail.vatAmount),
      ewtCode: detail.ewtCode ?? null,
      ewtPercent: Number(detail.ewtPercent),
      ewtAmount: Number(detail.ewtAmount),
      disburseAmount: Number(detail.disburseAmount),
      partyId: detail.partyId?.toString() ?? null,
      partyCode: detail.partyCodeSnapshot || detail.party?.partyCodeNo || null,
      partyName: detail.partyNameSnapshot || detail.party?.partyName || null,
      responsibilityCenterId: detail.responsibilityCenterId?.toString() ?? null,
      responsibilityCenter: detail.responsibilityCenterSnapshot || detail.responsibilityCenter?.name || null,
      refId: detail.refId ?? null,
      checkDate: detail.checkDate ? toDateValue(detail.checkDate) : null,
      checkNo: detail.checkNo ?? null,
      checkStatus: detail.checkStatus ?? null,
    })),
    lineEntries: (voucher.details || []).map((detail) => ({
      id: detail.id.toString(),
      accountCode: detail.accountCodeSnapshot || detail.account?.accountCode || '',
      accountName: detail.accountTitleSnapshot || detail.account?.accountTitle || '',
      checkDate: detail.checkDate ? toDateValue(detail.checkDate) : undefined,
      checkNo: detail.checkNo ?? undefined,
      checkStatus: detail.checkStatus ?? undefined,
      partyCode: detail.partyCodeSnapshot || detail.party?.partyCodeNo || undefined,
      partyName: detail.partyNameSnapshot || detail.party?.partyName || undefined,
      responsibilityCenter: detail.responsibilityCenterSnapshot || detail.responsibilityCenter?.name || undefined,
      refId: detail.refId ?? undefined,
      vatType: detail.vatType ?? undefined,
      ewtCode: detail.ewtCode ?? undefined,
      particulars: detail.particulars ?? '',
      remarks: detail.remarks ?? undefined,
      debit: Number(detail.debit),
      credit: Number(detail.credit),
      taxRate: '',
      taxDetails: {
        code: detail.vatCode ?? '',
        name: detail.vatType ?? '',
        responsibilityCenter: detail.responsibilityCenterSnapshot || detail.responsibilityCenter?.name || '',
        refId: detail.refId ?? '',
        vatType: detail.vatType ?? '',
        grossAmount: Number(detail.grossAmount),
        netAmount: Number(detail.netAmount),
        vatCode: detail.vatCode ?? '',
        vatPercent: Number(detail.vatPercent),
        vatAmount: Number(detail.vatAmount),
        ewtCode: detail.ewtCode ?? '',
        ewtPercent: Number(detail.ewtPercent),
        ewtAmount: Number(detail.ewtAmount),
        amount: Number(detail.disburseAmount || detail.debit),
      },
      status: Number(detail.debit) === Number(detail.credit) ? 'Balanced' : 'Pending',
    })),
    journalEntries: (voucher.journalEntries || []).map((entry) => ({
      id: entry.id.toString(),
      referenceType: entry.referenceType,
      referenceId: entry.referenceId.toString(),
      lineNumber: entry.lineNumber,
      accountId: entry.accountId?.toString() ?? '',
      accountCode: entry.accountCodeSnapshot,
      accountTitle: entry.accountTitleSnapshot,
      currencyCode: entry.currencyCode,
      exchangeRate: Number(entry.exchangeRate),
      particulars: entry.particulars,
      debit: Number(entry.debit),
      credit: Number(entry.credit),
      vatType: entry.vatType ?? null,
      atcCode: entry.atcCode ?? null,
      partyCode: entry.partyCodeSnapshot ?? null,
      partyName: entry.partyNameSnapshot ?? null,
      responsibilityCenterId: entry.responsibilityCenterId?.toString() ?? null,
      responsibilityCenter: entry.responsibilityCenterSnapshot ?? null,
      refNo: entry.refNo ?? null,
    })),
    createdBy: voucher.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(voucher.createdByUserId) ?? null),
    createdAt: voucher.createdAt.toISOString(),
    updatedBy: (voucher.updatedByUserId && userNames.get(voucher.updatedByUserId)) ?? null,
    updatedAt: voucher.updatedAt ? voucher.updatedAt.toISOString() : null,
  };
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCashVoucherDetailGrossAmount(detail: CashVoucherWithDetails['details'][number]) {
  const storedGrossAmount = Number(detail.grossAmount);
  const debitAmount = Number(detail.debit);
  const vatPercent = Number(detail.vatPercent);

  if (storedGrossAmount > 0 && debitAmount > 0 && vatPercent > 0 && Math.abs(storedGrossAmount - debitAmount) <= 0.01) {
    const netRatio = 1 - vatPercent / 100;

    if (netRatio > 0) {
      return debitAmount / netRatio;
    }
  }

  return storedGrossAmount || debitAmount;
}

function getCashVoucherDetailDisburseAmount(detail: CashVoucherWithDetails['details'][number]) {
  const grossAmount = getCashVoucherDetailGrossAmount(detail);
  const ewtPercent = Number(detail.ewtPercent);

  if (grossAmount > 0 && ewtPercent > 0) {
    return grossAmount - grossAmount * (ewtPercent / 100);
  }

  return Number(detail.disburseAmount) || grossAmount;
}

function isGeneratedCashVoucherDetail(detail: CashVoucherWithDetails['details'][number]) {
  const accountTitle = (detail.accountTitleSnapshot || detail.account?.accountTitle || '').trim().toLowerCase();

  return (
    accountTitle === 'input vat' ||
    accountTitle === 'expanded withholding tax' ||
    accountTitle === 'cash on hand' ||
    accountTitle === 'cash in bank' ||
    accountTitle.startsWith('cash in bank - ') ||
    accountTitle === 'check cashvoucher clearing' ||
    accountTitle === 'online payment clearing'
  );
}

function roundCashVoucherAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
