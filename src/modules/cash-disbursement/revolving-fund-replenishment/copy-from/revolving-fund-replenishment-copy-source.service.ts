import { BadRequestException, Injectable } from '@nestjs/common';
import { CashVoucherStatus, DisbursementVoucherStatus, RevolvingFundReplenishmentStatus, Prisma } from '@prisma/client';
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
import type { GetRevolvingFundReplenishmentCopyFromCandidatesQueryDto } from './dto/get-revolving-fund-replenishment-copy-from-candidates-query.dto';

export const RevolvingFundReplenishmentCopySourceLabel = 'Revolving Fund Replenishment';
export const RevolvingFundReplenishmentAllocationLockNamespace = 7094n;
const RevolvingFundReplenishmentModuleCode = 'RFR';

const ActiveCashVoucherStatuses = [CashVoucherStatus.DRAFT, CashVoucherStatus.FOR_APPROVAL, CashVoucherStatus.POSTED];

const ActiveDisbursementVoucherStatuses = [DisbursementVoucherStatus.DRAFT, DisbursementVoucherStatus.FOR_APPROVAL, DisbursementVoucherStatus.POSTED];

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

type RevolvingFundReplenishmentSourceIdentity = {
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
export class RevolvingFundReplenishmentCopySourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(user: AuthUser, query: GetRevolvingFundReplenishmentCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.VIEW,
      'You do not have permission to view RevolvingFundReplenishment records.',
    );

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const search = cleanOptional(query.search);
    const partyId = query.partyId ? parsePositiveBigIntId(query.partyId, 'partyId') : null;
    const partyCode = cleanOptional(query.partyCode);
    const partyName = cleanOptional(query.partyName);
    const branchUnitId = query.branchUnitId;
    const where: Prisma.RevolvingFundReplenishmentWhereInput = {
      companyId,
      deletedAt: null,
      status: RevolvingFundReplenishmentStatus.POSTED,
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
              { transactionNo: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
              { remarks: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.revolvingFundReplenishment.findMany({
        where,
        include: { creditAccount: true, details: { orderBy: { lineNumber: 'asc' } } },
        orderBy: [{ documentDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.revolvingFundReplenishment.count({ where }),
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
        const detailAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.amount), 0));
        const detailDisburseAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.disburseAmount || detail.amount || 0), 0));
        const headerAmount = roundMoney(Number(record.amount));
        const amount = detailAmount > 0 ? detailAmount : headerAmount;
        const disburseAmount = detailDisburseAmount > 0 ? detailDisburseAmount : headerAmount;
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
          creditAccountTitle: record.creditAccount?.accountTitle ?? record.accountTitleSnapshot ?? 'Revolving Fund',
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
            revolvingFundDate: detail.revolvingFundDate ? detail.revolvingFundDate.toISOString().slice(0, 10) : null,
            revolvingFundNo: detail.revolvingFundNo,
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
          source: RevolvingFundReplenishmentCopySourceLabel,
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
    if (cleanOptional(input.referenceModule) !== RevolvingFundReplenishmentCopySourceLabel) {
      return;
    }

    const allocations = this.getCopiedVoucherDetailAmounts(input.details);
    if (allocations.length === 0) {
      return;
    }

    if (!input.partyId && !input.partyCode) {
      throw new BadRequestException('Party is required when copying from Revolving Fund Replenishment.');
    }

    const legacyIds = allocations.filter((allocation) => /^\d+$/.test(allocation.reference)).map((allocation) => BigInt(allocation.reference));
    const transactionNos = allocations
      .filter((allocation) => !/^\d+$/.test(allocation.reference))
      .map((allocation) => parseRevolvingFundReplenishmentReference(allocation.reference));
    const resolvedSources = await tx.revolvingFundReplenishment.findMany({
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
      await this.lockAllocation(tx, RevolvingFundReplenishmentAllocationLockNamespace, BigInt(sourceId));
    }

    const records = await tx.revolvingFundReplenishment.findMany({
      where: {
        id: { in: sourceIds.map((sourceId) => BigInt(sourceId)) },
        companyId: input.companyId,
        deletedAt: null,
      },
      select: {
        amount: true,
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
      records.flatMap((record) => [
        [record.id.toString(), record] as const,
        [formatRevolvingFundReplenishmentReference(record.transactionNo), record] as const,
      ]),
    );

    if (allocations.some((allocation) => !recordsByReference.has(allocation.reference))) {
      throw new BadRequestException('One or more Revolving Fund Replenishments were not found.');
    }

    const resolvedAllocations = new Map<string, { grossAmount: number; disburseAmount: number; record: (typeof records)[number] }>();
    for (const allocation of allocations) {
      const record = recordsByReference.get(allocation.reference);
      if (!record) {
        throw new BadRequestException('One or more Revolving Fund Replenishments were not found.');
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
      if (record.status !== RevolvingFundReplenishmentStatus.POSTED) {
        throw new BadRequestException(`RFR ${record.transactionNo} is not available for voucher copying.`);
      }
      if (input.branchUnitId && record.branchUnitId !== input.branchUnitId) {
        throw new BadRequestException(`RFR ${record.transactionNo} belongs to a different branch.`);
      }
      if (input.partyId && record.partyId !== input.partyId) {
        throw new BadRequestException(`RFR ${record.transactionNo} belongs to a different party.`);
      }
      if (!input.partyId && input.partyCode && record.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
        throw new BadRequestException(`RFR ${record.transactionNo} belongs to a different party.`);
      }
      if (record.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
        throw new BadRequestException(`RFR ${record.transactionNo} uses ${record.currencyCode}, not ${input.currencyCode}.`);
      }

      const sourceId = record.id.toString();
      const consumedGrossAmount = consumedAmounts.gross.get(sourceId) ?? 0;
      const consumedAmount = consumedAmounts.disburse.get(sourceId) ?? 0;
      const detailGrossAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.amount), 0));
      const detailDisburseAmount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.disburseAmount || detail.amount || 0), 0));
      const headerAmount = roundMoney(Number(record.amount));
      const sourceGrossAmount = detailGrossAmount > 0 ? detailGrossAmount : headerAmount;
      const sourceDisburseAmount = detailDisburseAmount > 0 ? detailDisburseAmount : headerAmount;
      const availableGrossAmount = roundMoney(sourceGrossAmount - consumedGrossAmount);
      const availableAmount = roundMoney(sourceDisburseAmount - consumedAmount);
      if (allocation.grossAmount > availableGrossAmount) {
        throw new BadRequestException(`RFR ${record.transactionNo} only has ${availableGrossAmount.toFixed(2)} gross amount remaining.`);
      }
      if (allocation.disburseAmount > availableAmount) {
        throw new BadRequestException(`RFR ${record.transactionNo} only has ${availableAmount.toFixed(2)} disburse amount remaining.`);
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
        : formatRevolvingFundReplenishmentReference(parseRevolvingFundReplenishmentReference(reference));
      const current = amountsByReference.get(normalizedReference) ?? { grossAmount: 0, disburseAmount: 0 };
      amountsByReference.set(normalizedReference, {
        grossAmount: roundMoney(current.grossAmount + getCopiedDetailAmount(detail)),
        disburseAmount: roundMoney(current.disburseAmount + getCopiedDetailPayableAmount(detail)),
      });
    }

    return [...amountsByReference].map(([reference, amounts]) => ({ reference, ...amounts }));
  }

  private async getVoucherConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    sources: RevolvingFundReplenishmentSourceIdentity[],
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
      sourceIdByReference.set(formatRevolvingFundReplenishmentReference(source.transactionNo), source.id);
    }
    const references = [...sourceIdByReference.keys()];
    const [cashDetails, disbursementDetails] = await Promise.all([
      tx.cashVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: RevolvingFundReplenishmentCopySourceLabel,
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
            referenceModule: RevolvingFundReplenishmentCopySourceLabel,
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

  private async lockAllocation(tx: Prisma.TransactionClient, namespace: bigint, sourceId: bigint) {
    const lockKey = (namespace << 32n) + sourceId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }
}

export function formatRevolvingFundReplenishmentReference(transactionNo: string) {
  return `RFR:${transactionNo.trim()}`;
}

export function parseRevolvingFundReplenishmentReference(reference: string) {
  const separatorIndex = reference.indexOf(':');
  const prefix = separatorIndex >= 0 ? reference.slice(0, separatorIndex).trim().toUpperCase() : '';
  const transactionNo = separatorIndex >= 0 ? reference.slice(separatorIndex + 1).trim() : '';

  if (prefix !== 'RFR' || !transactionNo) {
    throw new BadRequestException('Revolving Fund Replenishment detail Reference No must use RFR:<transactionNo>.');
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
