import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AccountsPayableVoucherStatus, CashVoucherStatus, DisbursementVoucherStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { getCopiedDetailAmount, getCopiedDetailPayableAmount } from '../../../../common/utils/copy-from.util';
import { toDateValue } from '../../../../common/utils/date.util';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
import { roundMoney } from '../../../../common/utils/money.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { canAccessModuleAction } from '../../../../common/utils/module-permissions.util';
import { cleanOptional } from '../../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { AccountsPayableVoucherCopyFromTarget } from './dto/get-accounts-payable-voucher-copy-from-candidates-query.dto';
import { GetAccountsPayableVoucherCopyFromCandidatesQueryDto } from './dto/get-accounts-payable-voucher-copy-from-candidates-query.dto';

export const AccountsPayableVoucherCopySourceLabel = 'Accounts Payable Voucher';

const AccountsPayableVoucherModuleCode = 'APV';
const AccountsPayableVoucherAllocationLockNamespace = 7091n;
const ActiveCashVoucherStatuses = [
  CashVoucherStatus.DRAFT,
  CashVoucherStatus.FOR_APPROVAL,
  CashVoucherStatus.APPROVED,
  CashVoucherStatus.POSTED,
  CashVoucherStatus.CLOSED,
];
const ActiveDisbursementVoucherStatuses = [
  DisbursementVoucherStatus.DRAFT,
  DisbursementVoucherStatus.FOR_APPROVAL,
  DisbursementVoucherStatus.APPROVED,
  DisbursementVoucherStatus.POSTED,
  DisbursementVoucherStatus.CLOSED,
];
const CopyableAccountsPayableVoucherStatuses: AccountsPayableVoucherStatus[] = [AccountsPayableVoucherStatus.APPROVED, AccountsPayableVoucherStatus.CLOSED];

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

type AccountsPayableVoucherSourceIdentity = {
  apvId: string;
  transactionNo: string;
};

type CopiedDetailInput = {
  accountName?: string | null;
  accountTitle?: string | null;
  amount?: number | Prisma.Decimal;
  credit?: number | Prisma.Decimal;
  debit?: number | Prisma.Decimal;
  disburseAmount?: number | Prisma.Decimal;
  grossAmount?: number | Prisma.Decimal;
  id?: string | null;
  refId?: string | null;
};

type ValidateCopiedDetailsInput = {
  branchUnitId: number | null;
  companyId: number;
  currencyCode: string;
  currentTargetId?: bigint;
  details?: CopiedDetailInput[];
  partyCode: string;
  partyId?: bigint | null;
  referenceModule?: string | null;
  target: AccountsPayableVoucherCopyFromTarget;
};

@Injectable()
export class AccountsPayableVoucherCopySourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(user: AuthUser, query: GetAccountsPayableVoucherCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCanReadAccountsPayableVoucher(user, companyId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const search = cleanOptional(query.search);
    const partyCode = cleanOptional(query.partyCode);
    const partyId = query.partyId ? parsePositiveBigIntId(query.partyId, 'partyId') : null;
    const branchUnitId = query.branchUnitId;
    const where: Prisma.AccountsPayableVoucherWhereInput = {
      companyId,
      deletedAt: null,
      status: { in: CopyableAccountsPayableVoucherStatuses },
      ...(branchUnitId ? { branchUnitId } : {}),
      ...(partyId ? { partyId } : partyCode ? { partyCodeSnapshot: { equals: partyCode, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { transactionNo: { contains: search, mode: 'insensitive' } },
              { referenceNo: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
              { remarks: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.accountsPayableVoucher.findMany({
        where,
        include: {
          creditAccount: true,
          details: {
            orderBy: { lineNumber: 'asc' },
          },
        },
        orderBy: [{ documentDate: 'desc' }, { apvId: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.accountsPayableVoucher.count({ where }),
    ]);

    const consumedAmounts = await this.getConsumedAmounts(
      this.prisma,
      companyId,
      records.map((record) => ({ apvId: record.apvId.toString(), transactionNo: record.transactionNo })),
      query.target,
    );

    const candidates = records
      .map((record) => {
        const consumedGrossAmount = consumedAmounts.gross.get(record.apvId.toString()) ?? 0;
        const consumedAmount = consumedAmounts.payable.get(record.apvId.toString()) ?? 0;
        const amount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.amount), 0));
        const totalPayable = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.totalAmountDue), 0));
        const availableGrossAmount = roundMoney(amount - consumedGrossAmount);
        const availableAmount = roundMoney(totalPayable - consumedAmount);

        return {
          amount,
          availableAmount,
          availableGrossAmount,
          branchUnitId: record.branchUnitId,
          consumedAmount,
          consumedGrossAmount,
          creditAccountCode: record.creditAccount.accountCode,
          creditAccountId: record.creditAccountId.toString(),
          creditAccountTitle: record.creditAccount.accountTitle,
          currency: record.currencyCode,
          documentDate: toDateValue(record.documentDate),
          exchangeRate: Number(record.exchangeRate),
          id: record.apvId.toString(),
          partyCode: record.partyCodeSnapshot,
          partyId: record.partyId?.toString() ?? null,
          partyName: record.partyNameSnapshot,
          projectCode: record.projectCode,
          projectName: record.projectName,
          referenceNo: record.referenceNo,
          remarks: record.remarks,
          details: record.details.map((detail) => ({
            amount: Number(detail.amount),
            ewt: detail.ewt,
            ewtAmount: Number(detail.ewtAmount),
            ewtPercent: Number(detail.ewtPercent),
            expenseAccountCode: detail.expenseAccountCodeSnapshot,
            expenseAccountId: detail.expenseAccountId.toString(),
            expenseType: detail.expenseTypeSnapshot,
            id: detail.id.toString(),
            lineNumber: detail.lineNumber,
            netAmount: Number(detail.netAmount),
            particulars: detail.particulars,
            partyCode: detail.partyCodeSnapshot,
            partyName: detail.partyNameSnapshot,
            referenceNo: detail.referenceNo,
            responsibilityCenter: detail.responsibilityCenterSnapshot,
            responsibilityCenterId: detail.responsibilityCenterId?.toString() ?? null,
            totalAmountDue: Number(detail.totalAmountDue),
            vat: detail.vat,
            vatAmount: Number(detail.vatAmount),
            vatPercent: Number(detail.vatPercent),
          })),
          source: AccountsPayableVoucherCopySourceLabel,
          sourceNo: record.transactionNo,
          totalPayable,
          transactionNo: record.transactionNo,
        };
      })
      .filter((record) => record.availableGrossAmount > 0 && record.availableAmount > 0);

    return {
      records: candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async validateCopiedDetails(tx: Prisma.TransactionClient, input: ValidateCopiedDetailsInput) {
    if (cleanOptional(input.referenceModule) !== AccountsPayableVoucherCopySourceLabel) {
      return;
    }

    const allocations = this.getCopiedDetailAmounts(input.details);
    if (allocations.length === 0) {
      return;
    }

    if (!input.partyId && !input.partyCode) {
      throw new BadRequestException('Party is required when copying from Accounts Payable Voucher.');
    }

    const legacyApvIds = allocations.filter((allocation) => /^\d+$/.test(allocation.reference)).map((allocation) => BigInt(allocation.reference));
    const transactionNos = allocations
      .filter((allocation) => !/^\d+$/.test(allocation.reference))
      .map((allocation) => parseAccountsPayableVoucherReference(allocation.reference));
    const resolvedSources = await tx.accountsPayableVoucher.findMany({
      where: {
        companyId: input.companyId,
        deletedAt: null,
        ...(input.branchUnitId ? { branchUnitId: input.branchUnitId } : {}),
        OR: [
          ...(legacyApvIds.length > 0 ? [{ apvId: { in: legacyApvIds } }] : []),
          ...(transactionNos.length > 0 ? [{ transactionNo: { in: transactionNos } }] : []),
        ],
      },
      select: { apvId: true, transactionNo: true },
    });
    const apvIds = [...new Set(resolvedSources.map((source) => source.apvId.toString()))];
    for (const apvId of apvIds) {
      await this.lockAccountsPayableVoucherAllocation(tx, BigInt(apvId));
    }

    const apvs = await tx.accountsPayableVoucher.findMany({
      where: {
        apvId: { in: apvIds.map((apvId) => BigInt(apvId)) },
        companyId: input.companyId,
        deletedAt: null,
      },
      select: {
        amount: true,
        apvId: true,
        branchUnitId: true,
        currencyCode: true,
        details: {
          select: { amount: true, totalAmountDue: true },
        },
        partyCodeSnapshot: true,
        partyId: true,
        status: true,
        transactionNo: true,
      },
    });
    const apvsByReference = new Map(
      apvs.flatMap((apv) => [[apv.apvId.toString(), apv] as const, [formatAccountsPayableVoucherReference(apv.transactionNo), apv] as const]),
    );

    if (allocations.some((allocation) => !apvsByReference.has(allocation.reference))) {
      throw new BadRequestException('One or more Accounts Payable Vouchers were not found.');
    }

    const resolvedAllocations = new Map<string, { apv: (typeof apvs)[number]; grossAmount: number; payableAmount: number }>();
    for (const allocation of allocations) {
      const apv = apvsByReference.get(allocation.reference);
      if (!apv) {
        throw new BadRequestException('One or more Accounts Payable Vouchers were not found.');
      }

      const apvId = apv.apvId.toString();
      const current = resolvedAllocations.get(apvId) ?? { apv, grossAmount: 0, payableAmount: 0 };
      resolvedAllocations.set(apvId, {
        apv,
        grossAmount: roundMoney(current.grossAmount + allocation.grossAmount),
        payableAmount: roundMoney(current.payableAmount + allocation.payableAmount),
      });
    }

    const consumedAmounts = await this.getConsumedAmounts(
      tx,
      input.companyId,
      apvs.map((apv) => ({ apvId: apv.apvId.toString(), transactionNo: apv.transactionNo })),
      input.target,
      input.currentTargetId,
    );

    for (const allocation of resolvedAllocations.values()) {
      const { apv } = allocation;

      if (!CopyableAccountsPayableVoucherStatuses.includes(apv.status)) {
        throw new BadRequestException(`APV ${apv.transactionNo} is not available for voucher copying.`);
      }

      if (input.branchUnitId && apv.branchUnitId !== input.branchUnitId) {
        throw new BadRequestException(`APV ${apv.transactionNo} belongs to a different branch.`);
      }

      if (input.partyId && apv.partyId !== input.partyId) {
        throw new BadRequestException(`APV ${apv.transactionNo} belongs to a different party.`);
      }

      if (!input.partyId && input.partyCode && apv.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
        throw new BadRequestException(`APV ${apv.transactionNo} belongs to a different party.`);
      }

      if (apv.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
        throw new BadRequestException(`APV ${apv.transactionNo} uses ${apv.currencyCode}, not ${input.currencyCode}.`);
      }

      const apvId = apv.apvId.toString();
      const consumedGrossAmount = consumedAmounts.gross.get(apvId) ?? 0;
      const consumedAmount = consumedAmounts.payable.get(apvId) ?? 0;
      const sourceGrossAmount = roundMoney(apv.details.reduce((sum, detail) => sum + Number(detail.amount), 0));
      const sourcePayableAmount = roundMoney(apv.details.reduce((sum, detail) => sum + Number(detail.totalAmountDue), 0));
      const availableGrossAmount = roundMoney(sourceGrossAmount - consumedGrossAmount);
      const availableAmount = roundMoney(sourcePayableAmount - consumedAmount);
      if (allocation.grossAmount > availableGrossAmount) {
        throw new BadRequestException(`APV ${apv.transactionNo} only has ${availableGrossAmount.toFixed(2)} gross amount remaining.`);
      }
      if (allocation.payableAmount > availableAmount) {
        throw new BadRequestException(`APV ${apv.transactionNo} only has ${availableAmount.toFixed(2)} payable amount remaining.`);
      }
    }
  }

  private getCopiedDetailAmounts(details: CopiedDetailInput[] = []) {
    const amountsByReference = new Map<string, { grossAmount: number; payableAmount: number }>();

    for (const detail of details) {
      if (isGeneratedTargetDetailRow(detail)) {
        continue;
      }

      const reference = cleanOptional(detail.refId);
      if (!reference) {
        continue;
      }

      const normalizedReference = /^\d+$/.test(reference)
        ? parsePositiveBigIntId(reference, 'detail refId').toString()
        : formatAccountsPayableVoucherReference(parseAccountsPayableVoucherReference(reference));
      const grossAmount = getCopiedDetailAmount(detail);
      const payableAmount = getCopiedDetailPayableAmount(detail);
      if (grossAmount <= 0 && payableAmount <= 0) {
        continue;
      }

      const current = amountsByReference.get(normalizedReference) ?? { grossAmount: 0, payableAmount: 0 };
      amountsByReference.set(normalizedReference, {
        grossAmount: roundMoney(current.grossAmount + grossAmount),
        payableAmount: roundMoney(current.payableAmount + payableAmount),
      });
    }

    return [...amountsByReference].map(([reference, amounts]) => ({ reference, ...amounts }));
  }

  private async lockAccountsPayableVoucherAllocation(tx: Prisma.TransactionClient, apvId: bigint) {
    const lockKey = (AccountsPayableVoucherAllocationLockNamespace << 32n) + apvId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }

  private async getConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    sources: AccountsPayableVoucherSourceIdentity[],
    target: AccountsPayableVoucherCopyFromTarget,
    currentTargetId?: bigint,
  ) {
    const consumedAmounts = {
      gross: new Map<string, number>(),
      payable: new Map<string, number>(),
    };
    if (sources.length === 0) {
      return consumedAmounts;
    }

    const apvIdByReference = new Map<string, string>();
    for (const source of sources) {
      apvIdByReference.set(source.apvId, source.apvId);
      apvIdByReference.set(formatAccountsPayableVoucherReference(source.transactionNo), source.apvId);
    }
    const references = [...apvIdByReference.keys()];

    const [cashDetails, disbursementDetails] = await Promise.all([
      tx.cashVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: AccountsPayableVoucherCopySourceLabel,
            status: { in: ActiveCashVoucherStatuses },
            ...(target === 'cash-voucher' && currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        select: {
          accountTitleSnapshot: true,
          credit: true,
          debit: true,
          disburseAmount: true,
          grossAmount: true,
          refId: true,
        },
      }),
      tx.disbursementVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: AccountsPayableVoucherCopySourceLabel,
            status: { in: ActiveDisbursementVoucherStatuses },
            ...(target === 'disbursement-voucher' && currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        select: {
          accountTitleSnapshot: true,
          credit: true,
          debit: true,
          disburseAmount: true,
          grossAmount: true,
          refId: true,
        },
      }),
    ]);

    for (const detail of [...cashDetails, ...disbursementDetails]) {
      if (isGeneratedTargetDetailRow({ ...detail, accountTitle: detail.accountTitleSnapshot })) {
        continue;
      }

      const refId = cleanOptional(detail.refId);
      if (!refId) {
        continue;
      }

      const apvId = apvIdByReference.get(refId);
      if (!apvId) {
        continue;
      }

      consumedAmounts.gross.set(apvId, roundMoney((consumedAmounts.gross.get(apvId) ?? 0) + getCopiedDetailAmount(detail)));
      consumedAmounts.payable.set(apvId, roundMoney((consumedAmounts.payable.get(apvId) ?? 0) + getCopiedDetailPayableAmount(detail)));
    }

    return consumedAmounts;
  }

  private ensureCanReadAccountsPayableVoucher(user: AuthUser, companyId: number) {
    if (
      canAccessModuleAction(user, companyId, AccountsPayableVoucherModuleCode, PermissionAction.VIEW) ||
      canAccessModuleAction(user, companyId, AccountsPayableVoucherModuleCode, PermissionAction.CREATE) ||
      canAccessModuleAction(user, companyId, AccountsPayableVoucherModuleCode, PermissionAction.UPDATE)
    ) {
      return;
    }

    throw new ForbiddenException('You do not have permission to prepare accounts payable vouchers.');
  }
}

function isGeneratedTargetDetailRow(detail: CopiedDetailInput): boolean {
  const generatedId = detail.id?.trim().toLowerCase() ?? '';
  const accountTitle = (detail.accountTitle ?? detail.accountName ?? '').trim().toLowerCase();
  const debit = Number(detail.debit || 0);
  const credit = Number(detail.credit || 0);

  if (generatedId.startsWith('auto-')) {
    return true;
  }

  if (
    accountTitle === 'input vat' ||
    accountTitle === 'expanded withholding tax' ||
    accountTitle === 'cash on hand' ||
    accountTitle === 'cash in bank' ||
    accountTitle.startsWith('cash in bank - ') ||
    accountTitle === 'check cashvoucher clearing' ||
    accountTitle === 'check disbursement clearing' ||
    accountTitle === 'online payment clearing'
  ) {
    return true;
  }

  return credit > 0 && debit <= 0;
}

function formatAccountsPayableVoucherReference(transactionNo: string) {
  return `APV:${transactionNo.trim()}`;
}

function parseAccountsPayableVoucherReference(reference: string) {
  const separatorIndex = reference.indexOf(':');
  const prefix = separatorIndex >= 0 ? reference.slice(0, separatorIndex).trim().toUpperCase() : '';
  const transactionNo = separatorIndex >= 0 ? reference.slice(separatorIndex + 1).trim() : '';

  if (prefix !== 'APV' || !transactionNo) {
    throw new BadRequestException('Accounts Payable Voucher detail Reference No must use APV:<transactionNo>.');
  }

  return transactionNo;
}
