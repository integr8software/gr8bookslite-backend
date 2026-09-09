import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CashAdvanceStatus, CashVoucherStatus, DisbursementVoucherStatus, Prisma } from '@prisma/client';
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
import type { CashAdvanceCopyFromTarget } from './dto/get-cash-advance-copy-from-candidates-query.dto';
import { GetCashAdvanceCopyFromCandidatesQueryDto } from './dto/get-cash-advance-copy-from-candidates-query.dto';

export const CashAdvanceCopySourceLabel = 'Employee Advance';

const CashAdvanceModuleCode = 'CA';
const CashAdvanceMultipleEntryModuleCode = 'CAME';
const CashAdvanceMultipleEntryPrefix = 'CAME-';
const CashAdvanceAllocationLockNamespace = 7094n;
const ActiveCashVoucherStatuses = [CashVoucherStatus.DRAFT, CashVoucherStatus.FOR_APPROVAL, CashVoucherStatus.POSTED];
const ActiveDisbursementVoucherStatuses = [DisbursementVoucherStatus.DRAFT, DisbursementVoucherStatus.FOR_APPROVAL, DisbursementVoucherStatus.POSTED];
const CopyableCashAdvanceStatuses: CashAdvanceStatus[] = [CashAdvanceStatus.POSTED];

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

type CashAdvanceSourceIdentity = {
  id: string;
  transNo: string;
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
  target: CashAdvanceCopyFromTarget;
};

@Injectable()
export class CashAdvanceCopySourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(user: AuthUser, query: GetCashAdvanceCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCanReadCashAdvance(user, companyId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const search = cleanOptional(query.search);
    const partyCode = cleanOptional(query.partyCode);
    const partyName = cleanOptional(query.partyName);
    const partyId = query.partyId ? parsePositiveBigIntId(query.partyId, 'partyId') : null;
    const branchUnitId = query.branchUnitId;
    const where: Prisma.CashAdvanceWhereInput = {
      companyId,
      deletedAt: null,
      status: { in: CopyableCashAdvanceStatuses },
      ...(branchUnitId ? { branchUnitId } : {}),
      ...(partyId
        ? { partyId }
        : partyName
          ? { partyNameSnapshot: { equals: partyName, mode: 'insensitive' } }
          : partyCode
            ? { partyCodeSnapshot: { equals: partyCode, mode: 'insensitive' } }
            : {}),
      ...(search
        ? {
            OR: [
              { transNo: { contains: search, mode: 'insensitive' } },
              { referenceNo: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
              { remarks: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.cashAdvance.findMany({
        where,
        include: { creditAccount: true },
        orderBy: [{ documentDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.cashAdvance.count({ where }),
    ]);

    const consumedAmounts = await this.getConsumedAmounts(
      this.prisma,
      companyId,
      records.map((record) => ({ id: record.id.toString(), transNo: record.transNo })),
      query.target,
    );

    const candidates = records
      .map((record) => {
        const consumedAmount = consumedAmounts.get(record.id.toString()) ?? 0;
        const amount = roundMoney(Number(record.amount));
        const availableAmount = roundMoney(amount - consumedAmount);
        const referencePrefix = getCashAdvanceReferencePrefix(record.transNo);
        const sourceReference = formatCashAdvanceReference(record.transNo);

        return {
          amount,
          availableAmount,
          availableGrossAmount: availableAmount,
          branchUnitId: record.branchUnitId,
          consumedAmount,
          consumedGrossAmount: consumedAmount,
          currency: record.currencyCode,
          details: [
            {
              accountCode: record.accountCodeSnapshot || record.creditAccount?.accountCode || null,
              accountTitle: record.accountTitleSnapshot || record.creditAccount?.accountTitle || null,
              amount,
              consumptionAmount: availableAmount,
              grossAmount: availableAmount,
              id: record.id.toString(),
              lineNumber: 1,
              particulars: record.remarks,
              referenceNo: sourceReference,
              responsibilityCenter: record.costCenterSnapshot ?? record.projectNameSnapshot,
            },
          ],
          documentDate: toDateValue(record.documentDate),
          exchangeRate: Number(record.exchangeRate),
          grossAmount: amount,
          id: record.id.toString(),
          partyCode: record.partyCodeSnapshot,
          partyId: record.partyId?.toString() ?? null,
          partyName: record.partyNameSnapshot,
          projectCode: record.projectCodeSnapshot ?? record.costCenterCodeSnapshot,
          projectName: record.projectNameSnapshot ?? record.costCenterSnapshot,
          referencePrefix,
          remarks: record.remarks,
          source: CashAdvanceCopySourceLabel,
          sourceNo: record.transNo,
          transactionNo: record.transNo,
        };
      })
      .filter((record) => record.availableAmount > 0);

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
    if (cleanOptional(input.referenceModule) !== CashAdvanceCopySourceLabel) {
      return;
    }

    const allocations = this.getCopiedDetailAmounts(input.details);
    if (allocations.length === 0) {
      return;
    }

    if (!input.partyId && !input.partyCode) {
      throw new BadRequestException('Party is required when copying from Employee Advance.');
    }

    const legacyIds = allocations.filter((allocation) => /^\d+$/.test(allocation.reference)).map((allocation) => BigInt(allocation.reference));
    const transactionNos = allocations
      .filter((allocation) => !/^\d+$/.test(allocation.reference))
      .map((allocation) => parseCashAdvanceReference(allocation.reference));
    const resolvedSources = await tx.cashAdvance.findMany({
      where: {
        companyId: input.companyId,
        deletedAt: null,
        ...(input.branchUnitId ? { branchUnitId: input.branchUnitId } : {}),
        OR: [...(legacyIds.length > 0 ? [{ id: { in: legacyIds } }] : []), ...(transactionNos.length > 0 ? [{ transNo: { in: transactionNos } }] : [])],
      },
      select: { id: true, transNo: true },
    });
    const sourceIds = [...new Set(resolvedSources.map((source) => source.id.toString()))];
    for (const sourceId of sourceIds) {
      await this.lockCashAdvanceAllocation(tx, BigInt(sourceId));
    }

    const records = await tx.cashAdvance.findMany({
      where: {
        id: { in: sourceIds.map((sourceId) => BigInt(sourceId)) },
        companyId: input.companyId,
        deletedAt: null,
      },
      select: {
        amount: true,
        branchUnitId: true,
        currencyCode: true,
        id: true,
        partyCodeSnapshot: true,
        partyId: true,
        status: true,
        transNo: true,
      },
    });
    const recordsByReference = new Map(
      records.flatMap((record) => [[record.id.toString(), record] as const, [formatCashAdvanceReference(record.transNo), record] as const]),
    );

    if (allocations.some((allocation) => !recordsByReference.has(allocation.reference))) {
      throw new BadRequestException('One or more Employee Advances were not found.');
    }

    const resolvedAllocations = new Map<string, { record: (typeof records)[number]; amount: number }>();
    for (const allocation of allocations) {
      const record = recordsByReference.get(allocation.reference);
      if (!record) {
        throw new BadRequestException('One or more Employee Advances were not found.');
      }

      const sourceId = record.id.toString();
      const current = resolvedAllocations.get(sourceId) ?? { record, amount: 0 };
      resolvedAllocations.set(sourceId, {
        record,
        amount: roundMoney(current.amount + allocation.amount),
      });
    }

    const consumedAmounts = await this.getConsumedAmounts(
      tx,
      input.companyId,
      records.map((record) => ({ id: record.id.toString(), transNo: record.transNo })),
      input.target,
      input.currentTargetId,
    );

    for (const allocation of resolvedAllocations.values()) {
      const { record } = allocation;

      if (!CopyableCashAdvanceStatuses.includes(record.status)) {
        throw new BadRequestException(`${getCashAdvanceReferencePrefix(record.transNo)} ${record.transNo} is not available for voucher copying.`);
      }

      if (input.branchUnitId && record.branchUnitId !== input.branchUnitId) {
        throw new BadRequestException(`${getCashAdvanceReferencePrefix(record.transNo)} ${record.transNo} belongs to a different branch.`);
      }

      if (input.partyId && record.partyId !== input.partyId) {
        throw new BadRequestException(`${getCashAdvanceReferencePrefix(record.transNo)} ${record.transNo} belongs to a different party.`);
      }

      if (!input.partyId && input.partyCode && record.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
        throw new BadRequestException(`${getCashAdvanceReferencePrefix(record.transNo)} ${record.transNo} belongs to a different party.`);
      }

      if (record.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
        throw new BadRequestException(
          `${getCashAdvanceReferencePrefix(record.transNo)} ${record.transNo} uses ${record.currencyCode}, not ${input.currencyCode}.`,
        );
      }

      const consumedAmount = consumedAmounts.get(record.id.toString()) ?? 0;
      const availableAmount = roundMoney(Number(record.amount) - consumedAmount);
      if (allocation.amount > availableAmount) {
        throw new BadRequestException(
          `${getCashAdvanceReferencePrefix(record.transNo)} ${record.transNo} only has ${availableAmount.toFixed(2)} employee advance amount remaining.`,
        );
      }
    }
  }

  private getCopiedDetailAmounts(details: CopiedDetailInput[] = []) {
    const amountsByReference = new Map<string, number>();

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
        : formatCashAdvanceReference(parseCashAdvanceReference(reference));
      const amount = getCashAdvanceCopiedAmount(detail);
      if (amount <= 0) {
        continue;
      }

      amountsByReference.set(normalizedReference, roundMoney((amountsByReference.get(normalizedReference) ?? 0) + amount));
    }

    return [...amountsByReference].map(([reference, amount]) => ({ reference, amount }));
  }

  private async lockCashAdvanceAllocation(tx: Prisma.TransactionClient, cashAdvanceId: bigint) {
    const lockKey = (CashAdvanceAllocationLockNamespace << 32n) + cashAdvanceId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }

  private async getConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    sources: CashAdvanceSourceIdentity[],
    target: CashAdvanceCopyFromTarget,
    currentTargetId?: bigint,
  ) {
    const consumedAmounts = new Map<string, number>();
    if (sources.length === 0) {
      return consumedAmounts;
    }

    const sourceIdByReference = new Map<string, string>();
    for (const source of sources) {
      sourceIdByReference.set(source.id, source.id);
      sourceIdByReference.set(formatCashAdvanceReference(source.transNo), source.id);
    }
    const references = [...sourceIdByReference.keys()];

    const [cashDetails, disbursementDetails] = await Promise.all([
      tx.cashVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: CashAdvanceCopySourceLabel,
            status: { in: ActiveCashVoucherStatuses },
            ...(target === 'cash-voucher' && currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        select: { accountTitleSnapshot: true, credit: true, debit: true, disburseAmount: true, grossAmount: true, refId: true },
      }),
      tx.disbursementVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: CashAdvanceCopySourceLabel,
            status: { in: ActiveDisbursementVoucherStatuses },
            ...(target === 'disbursement-voucher' && currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        select: { accountTitleSnapshot: true, credit: true, debit: true, disburseAmount: true, grossAmount: true, refId: true },
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

      const sourceId = sourceIdByReference.get(refId);
      if (!sourceId) {
        continue;
      }

      consumedAmounts.set(sourceId, roundMoney((consumedAmounts.get(sourceId) ?? 0) + getCashAdvanceCopiedAmount(detail)));
    }

    return consumedAmounts;
  }

  private ensureCanReadCashAdvance(user: AuthUser, companyId: number) {
    if (
      canAccessModuleAction(user, companyId, CashAdvanceModuleCode, PermissionAction.VIEW) ||
      canAccessModuleAction(user, companyId, CashAdvanceModuleCode, PermissionAction.CREATE) ||
      canAccessModuleAction(user, companyId, CashAdvanceModuleCode, PermissionAction.UPDATE) ||
      canAccessModuleAction(user, companyId, CashAdvanceMultipleEntryModuleCode, PermissionAction.VIEW) ||
      canAccessModuleAction(user, companyId, CashAdvanceMultipleEntryModuleCode, PermissionAction.CREATE) ||
      canAccessModuleAction(user, companyId, CashAdvanceMultipleEntryModuleCode, PermissionAction.UPDATE)
    ) {
      return;
    }

    throw new ForbiddenException('You do not have permission to prepare employee advances.');
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

function getCashAdvanceCopiedAmount(detail: CopiedDetailInput) {
  const disburseAmount = getCopiedDetailPayableAmount(detail);
  return disburseAmount > 0 ? disburseAmount : getCopiedDetailAmount(detail);
}

function getCashAdvanceReferencePrefix(transactionNo: string) {
  return transactionNo.trim().toUpperCase().startsWith(CashAdvanceMultipleEntryPrefix) ? CashAdvanceMultipleEntryModuleCode : CashAdvanceModuleCode;
}

function formatCashAdvanceReference(transactionNo: string) {
  return `${getCashAdvanceReferencePrefix(transactionNo)}:${transactionNo.trim()}`;
}

function parseCashAdvanceReference(reference: string) {
  const separatorIndex = reference.indexOf(':');
  const prefix = separatorIndex >= 0 ? reference.slice(0, separatorIndex).trim().toUpperCase() : '';
  const transactionNo = separatorIndex >= 0 ? reference.slice(separatorIndex + 1).trim() : '';

  if ((prefix !== CashAdvanceModuleCode && prefix !== CashAdvanceMultipleEntryModuleCode) || !transactionNo) {
    throw new BadRequestException('Employee Advance detail Reference No must use CA:<transactionNo> or CAME:<transactionNo>.');
  }

  if (prefix === CashAdvanceMultipleEntryModuleCode && !transactionNo.toUpperCase().startsWith(CashAdvanceMultipleEntryPrefix)) {
    throw new BadRequestException('Employee Advance CAME references must use a CAME transaction number.');
  }

  return transactionNo;
}
