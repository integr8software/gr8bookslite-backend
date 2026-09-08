import { BadRequestException, Injectable } from '@nestjs/common';
import { CashVoucherStatus, DisbursementVoucherStatus, PettyCashReplenishmentStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { getCopiedDetailAmount, getCopiedDetailPayableAmount } from '../../../../common/utils/copy-from.util';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../../common/utils/module-permissions.util';
import { roundMoney } from '../../../../common/utils/money.util';
import { cleanOptional } from '../../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GetPettyCashReplenishmentCopyFromCandidatesQueryDto } from './dto/get-petty-cash-replenishment-copy-from-candidates-query.dto';

export const PettyCashReplenishmentCopySourceLabel = 'Petty Cash Replenishment';
export const PettyCashReplenishmentAllocationLockNamespace = 7092n;
const PettyCashReplenishmentModuleCode = 'PCR';

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

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

type PettyCashReplenishmentSourceIdentity = {
  id: string;
  transactionNo: string;
};

export type CopiedVoucherDetailInput = {
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

export type ValidateCopiedVoucherDetailsInput = {
  branchUnitId: number | null;
  companyId: number;
  currencyCode: string;
  currentTargetId?: bigint;
  details?: CopiedVoucherDetailInput[];
  partyCode: string;
  partyId?: bigint | null;
  referenceModule?: string | null;
  target: 'cash-voucher' | 'disbursement-voucher';
};

@Injectable()
export class PettyCashReplenishmentCopySourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(user: AuthUser, query: GetPettyCashReplenishmentCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashReplenishmentModuleCode,
      PermissionAction.VIEW,
      'You do not have permission to view PettyCashReplenishment records.',
    );

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const search = cleanOptional(query.search);
    const partyId = query.partyId ? parsePositiveBigIntId(query.partyId, 'partyId') : null;
    const partyCode = cleanOptional(query.partyCode);
    const branchUnitId = query.branchUnitId;
    const where: Prisma.PettyCashReplenishmentWhereInput = {
      companyId,
      deletedAt: null,
      status: { in: [PettyCashReplenishmentStatus.APPROVED, PettyCashReplenishmentStatus.POSTED] },
      ...(branchUnitId ? { branchUnitId } : {}),
      ...(partyId ? { partyId } : partyCode ? { partyCodeSnapshot: { equals: partyCode, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { transactionNo: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
              { remarks: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.pettyCashReplenishment.findMany({
        where,
        include: { creditAccount: true, details: { orderBy: { lineNumber: 'asc' } } },
        orderBy: [{ documentDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.pettyCashReplenishment.count({ where }),
    ]);
    const consumedAmounts = await this.getVoucherConsumedAmounts(
      this.prisma,
      companyId,
      records.map((record) => ({ id: record.id.toString(), transactionNo: record.transactionNo })),
      query.target,
    );

    const candidates = records
      .map((record) => {
        const sourceId = record.id.toString();
        const consumedGrossAmount = consumedAmounts.gross.get(sourceId) ?? 0;
        const consumedAmount = consumedAmounts.disburse.get(sourceId) ?? 0;
        const amount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.amount), 0));
        const disburseAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.disburseAmount || detail.amount || 0), 0));
        const availableGrossAmount = roundMoney(amount - consumedGrossAmount);
        const availableAmount = roundMoney(disburseAmount - consumedAmount);

        return {
          amount,
          availableAmount,
          availableGrossAmount,
          consumedAmount,
          consumedGrossAmount,
          creditAccountCode: record.creditAccount?.accountCode ?? record.accountCodeSnapshot,
          creditAccountId: record.creditAccountId?.toString() ?? null,
          creditAccountTitle: record.creditAccount?.accountTitle ?? record.accountTitleSnapshot ?? 'Petty Cash Fund',
          currency: record.currencyCode,
          details: record.details.map((detail) => ({
            amount: Number(detail.amount),
            disburseAmount: Number(detail.disburseAmount || detail.amount || 0),
            ewtAmount: Number(detail.ewtAmount),
            ewtCode: detail.ewtCode,
            ewtPercent: Number(detail.ewtPercent),
            id: detail.id.toString(),
            lineNumber: detail.lineNumber,
            netAmount: Number(detail.netAmount),
            particulars: detail.particulars,
            pettyCashDate: detail.pettyCashDate ? detail.pettyCashDate.toISOString().slice(0, 10) : null,
            pettyCashNo: detail.pettyCashNo,
            responsibilityCenter: detail.responsibilityCenterSnapshot,
            responsibilityCenterId: detail.responsibilityCenterId?.toString() ?? null,
            supplierCode: detail.supplierCodeSnapshot,
            supplierName: detail.supplierNameSnapshot,
            vatAmount: Number(detail.vatAmount),
            vatPercent: Number(detail.vatPercent),
            vatType: detail.vatType,
          })),
          documentDate: record.documentDate.toISOString().slice(0, 10),
          exchangeRate: Number(record.exchangeRate),
          id: sourceId,
          partyCode: record.partyCodeSnapshot,
          partyId: record.partyId?.toString() ?? null,
          partyName: record.partyNameSnapshot,
          projectCode: record.projectCode,
          projectName: record.projectName,
          remarks: record.remarks,
          source: PettyCashReplenishmentCopySourceLabel,
          sourceNo: record.transactionNo,
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

  async validateCopiedDetails(tx: Prisma.TransactionClient, input: ValidateCopiedVoucherDetailsInput) {
    if (cleanOptional(input.referenceModule) !== PettyCashReplenishmentCopySourceLabel) {
      return;
    }

    const allocations = this.getCopiedVoucherDetailAmounts(input.details);
    if (allocations.length === 0) {
      return;
    }

    if (!input.partyId && !input.partyCode) {
      throw new BadRequestException('Party is required when copying from Petty Cash Replenishment.');
    }

    const legacyIds = allocations.filter((allocation) => /^\d+$/.test(allocation.reference)).map((allocation) => BigInt(allocation.reference));
    const transactionNos = allocations
      .filter((allocation) => !/^\d+$/.test(allocation.reference))
      .map((allocation) => parsePettyCashReplenishmentReference(allocation.reference));
    const resolvedSources = await tx.pettyCashReplenishment.findMany({
      where: {
        companyId: input.companyId,
        deletedAt: null,
        ...(input.branchUnitId ? { branchUnitId: input.branchUnitId } : {}),
        OR: [...(legacyIds.length > 0 ? [{ id: { in: legacyIds } }] : []), ...(transactionNos.length > 0 ? [{ transactionNo: { in: transactionNos } }] : [])],
      },
      select: { id: true, transactionNo: true },
    });
    const sourceIds = [...new Set(resolvedSources.map((source) => source.id.toString()))];
    for (const sourceId of sourceIds) {
      await this.lockAllocation(tx, PettyCashReplenishmentAllocationLockNamespace, BigInt(sourceId));
    }

    const records = await tx.pettyCashReplenishment.findMany({
      where: {
        id: { in: sourceIds.map((sourceId) => BigInt(sourceId)) },
        companyId: input.companyId,
        deletedAt: null,
      },
      select: {
        branchUnitId: true,
        currencyCode: true,
        details: { select: { amount: true, disburseAmount: true } },
        id: true,
        partyCodeSnapshot: true,
        partyId: true,
        status: true,
        transactionNo: true,
      },
    });
    const recordsByReference = new Map(
      records.flatMap((record) => [[record.id.toString(), record] as const, [formatPettyCashReplenishmentReference(record.transactionNo), record] as const]),
    );

    if (allocations.some((allocation) => !recordsByReference.has(allocation.reference))) {
      throw new BadRequestException('One or more Petty Cash Replenishments were not found.');
    }

    const resolvedAllocations = new Map<string, { grossAmount: number; disburseAmount: number; record: (typeof records)[number] }>();
    for (const allocation of allocations) {
      const record = recordsByReference.get(allocation.reference);
      if (!record) {
        throw new BadRequestException('One or more Petty Cash Replenishments were not found.');
      }
      const sourceId = record.id.toString();
      const current = resolvedAllocations.get(sourceId) ?? { grossAmount: 0, disburseAmount: 0, record };
      resolvedAllocations.set(sourceId, {
        record,
        grossAmount: roundMoney(current.grossAmount + allocation.grossAmount),
        disburseAmount: roundMoney(current.disburseAmount + allocation.disburseAmount),
      });
    }

    const consumedAmounts = await this.getVoucherConsumedAmounts(
      tx,
      input.companyId,
      records.map((record) => ({ id: record.id.toString(), transactionNo: record.transactionNo })),
      input.target,
      input.currentTargetId,
    );

    for (const allocation of resolvedAllocations.values()) {
      const { record } = allocation;
      if (record.status !== PettyCashReplenishmentStatus.APPROVED && record.status !== PettyCashReplenishmentStatus.POSTED) {
        throw new BadRequestException(`PCR ${record.transactionNo} is not available for voucher copying.`);
      }
      if (input.branchUnitId && record.branchUnitId !== input.branchUnitId) {
        throw new BadRequestException(`PCR ${record.transactionNo} belongs to a different branch.`);
      }
      if (input.partyId && record.partyId !== input.partyId) {
        throw new BadRequestException(`PCR ${record.transactionNo} belongs to a different party.`);
      }
      if (!input.partyId && input.partyCode && record.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
        throw new BadRequestException(`PCR ${record.transactionNo} belongs to a different party.`);
      }
      if (record.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
        throw new BadRequestException(`PCR ${record.transactionNo} uses ${record.currencyCode}, not ${input.currencyCode}.`);
      }

      const sourceId = record.id.toString();
      const consumedGrossAmount = consumedAmounts.gross.get(sourceId) ?? 0;
      const consumedAmount = consumedAmounts.disburse.get(sourceId) ?? 0;
      const sourceGrossAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.amount), 0));
      const sourceDisburseAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.disburseAmount || detail.amount || 0), 0));
      const availableGrossAmount = roundMoney(sourceGrossAmount - consumedGrossAmount);
      const availableAmount = roundMoney(sourceDisburseAmount - consumedAmount);
      if (allocation.grossAmount > availableGrossAmount) {
        throw new BadRequestException(`PCR ${record.transactionNo} only has ${availableGrossAmount.toFixed(2)} gross amount remaining.`);
      }
      if (allocation.disburseAmount > availableAmount) {
        throw new BadRequestException(`PCR ${record.transactionNo} only has ${availableAmount.toFixed(2)} disburse amount remaining.`);
      }
    }
  }

  getCopiedVoucherDetailAmounts(details: CopiedVoucherDetailInput[] = []) {
    const amountsByReference = new Map<string, { grossAmount: number; disburseAmount: number }>();
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
        : formatPettyCashReplenishmentReference(parsePettyCashReplenishmentReference(reference));
      const current = amountsByReference.get(normalizedReference) ?? { grossAmount: 0, disburseAmount: 0 };
      amountsByReference.set(normalizedReference, {
        grossAmount: roundMoney(current.grossAmount + getCopiedDetailAmount(detail)),
        disburseAmount: roundMoney(current.disburseAmount + getCopiedDetailPayableAmount(detail)),
      });
    }

    return [...amountsByReference].map(([reference, amounts]) => ({ reference, ...amounts }));
  }

  async getVoucherConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    sources: PettyCashReplenishmentSourceIdentity[],
    target: 'cash-voucher' | 'disbursement-voucher',
    currentTargetId?: bigint,
  ) {
    const consumedAmounts = {
      gross: new Map<string, number>(),
      disburse: new Map<string, number>(),
    };
    if (sources.length === 0) {
      return consumedAmounts;
    }

    const sourceIdByReference = new Map<string, string>();
    for (const source of sources) {
      sourceIdByReference.set(source.id, source.id);
      sourceIdByReference.set(formatPettyCashReplenishmentReference(source.transactionNo), source.id);
    }
    const references = [...sourceIdByReference.keys()];
    const [cashDetails, disbursementDetails] = await Promise.all([
      tx.cashVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: PettyCashReplenishmentCopySourceLabel,
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
            referenceModule: PettyCashReplenishmentCopySourceLabel,
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
      consumedAmounts.gross.set(sourceId, roundMoney((consumedAmounts.gross.get(sourceId) ?? 0) + getCopiedDetailAmount(detail)));
      consumedAmounts.disburse.set(sourceId, roundMoney((consumedAmounts.disburse.get(sourceId) ?? 0) + getCopiedDetailPayableAmount(detail)));
    }

    return consumedAmounts;
  }

  async lockAllocation(tx: Prisma.TransactionClient, namespace: bigint, sourceId: bigint) {
    const lockKey = (namespace << 32n) + sourceId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }
}

export function formatPettyCashReplenishmentReference(transactionNo: string) {
  return `PCR:${transactionNo.trim()}`;
}

export function parsePettyCashReplenishmentReference(reference: string) {
  const separatorIndex = reference.indexOf(':');
  const prefix = separatorIndex >= 0 ? reference.slice(0, separatorIndex).trim().toUpperCase() : '';
  const transactionNo = separatorIndex >= 0 ? reference.slice(separatorIndex + 1).trim() : '';

  if (prefix !== 'PCR' || !transactionNo) {
    throw new BadRequestException('Petty Cash Replenishment detail Reference No must use PCR:<transactionNo>.');
  }

  return transactionNo;
}

function isGeneratedTargetDetailRow(detail: CopiedVoucherDetailInput): boolean {
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
