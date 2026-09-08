import { BadRequestException, Injectable } from '@nestjs/common';
import { AdvanceToSupplierStatus, CashVoucherStatus, DisbursementVoucherStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { getCopiedDetailAmount, getCopiedDetailPayableAmount } from '../../../../common/utils/copy-from.util';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { roundMoney } from '../../../../common/utils/money.util';
import { cleanOptional } from '../../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AdvanceToSupplierInclude } from '../prisma/advance-to-supplier.include';
import type { AdvanceToSupplierCopyFromTarget } from './dto/get-advance-to-supplier-copy-from-candidates-query.dto';
import { GetAdvanceToSupplierCopyFromCandidatesQueryDto } from './dto/get-advance-to-supplier-copy-from-candidates-query.dto';

export const AdvanceToSupplierCopySourceLabel = 'Advances to Suppliers';
export const PurchaseOrderAllocationLockNamespace = 7092n;

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

const CopyableAdvanceToSupplierStatuses: AdvanceToSupplierStatus[] = [
  AdvanceToSupplierStatus.APPROVED,
  AdvanceToSupplierStatus.POSTED,
];

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

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

export type ValidateAdvanceToSupplierCopiedDetailsInput = {
  branchUnitId: number | null;
  companyId: number;
  currencyCode: string;
  currentTargetId?: bigint;
  details?: CopiedVoucherDetailInput[];
  partyCode: string;
  partyId?: bigint | null;
  referenceModule?: string | null;
  target: AdvanceToSupplierCopyFromTarget;
};

@Injectable()
export class AdvanceToSupplierCopySourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(user: AuthUser, query: GetAdvanceToSupplierCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const search = cleanOptional(query.search);
    const partyId = query.partyId ? parsePositiveBigIntId(query.partyId, 'partyId') : null;
    const partyCode = cleanOptional(query.partyCode);
    const where: Prisma.AdvanceToSupplierWhereInput = {
      companyId,
      deletedAt: null,
      status: { in: CopyableAdvanceToSupplierStatuses },
      ...(query.branchUnitId ? { branchUnitId: query.branchUnitId } : {}),
      ...(partyId ? { partyId } : partyCode ? { partyCodeSnapshot: { equals: partyCode, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { transNo: { contains: search, mode: 'insensitive' } },
              { poReference: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
              { projectCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { projectNameSnapshot: { contains: search, mode: 'insensitive' } },
              { remarks: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.advanceToSupplier.findMany({
        where,
        include: AdvanceToSupplierInclude,
        orderBy: [{ documentDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.advanceToSupplier.count({ where }),
    ]);

    const consumedAmounts = await this.getVoucherConsumedAmounts(
      this.prisma,
      companyId,
      records.map((record) => ({ id: record.id.toString(), transactionNo: record.transNo })),
      query.target,
    );

    const candidates = records
      .map((record) => {
        const amount = roundMoney(Number(record.amount));
        const consumedGrossAmount = consumedAmounts.gross.get(record.id.toString()) ?? 0;
        const consumedAmount = consumedAmounts.payable.get(record.id.toString()) ?? 0;
        const availableGrossAmount = roundMoney(amount - consumedGrossAmount);
        const availableAmount = roundMoney(amount - consumedAmount);

        return {
          amount,
          availableAmount,
          availableGrossAmount,
          branchUnitId: record.branchUnitId,
          consumedAmount,
          consumedGrossAmount,
          currency: record.currencyCode,
          details: [
            {
              accountCode: record.accountCodeSnapshot,
              accountTitle: record.accountTitleSnapshot ?? 'Advances to Suppliers',
              amount: availableAmount,
              consumptionAmount: availableAmount,
              grossAmount: availableGrossAmount,
              id: record.id.toString(),
              lineNumber: 1,
              particulars: record.remarks,
              referenceNo: record.poReference,
              responsibilityCenter: record.responsibilityCenterSnapshot,
            },
          ],
          documentDate: record.documentDate.toISOString().slice(0, 10),
          exchangeRate: Number(record.exchangeRate),
          grossAmount: amount,
          id: record.id.toString(),
          partyCode: record.partyCodeSnapshot,
          partyId: record.partyId?.toString() ?? null,
          partyName: record.partyNameSnapshot,
          poReference: record.poReference,
          projectCode: record.projectCodeSnapshot,
          projectName: record.projectNameSnapshot,
          remarks: record.remarks,
          source: AdvanceToSupplierCopySourceLabel,
          sourceNo: record.transNo,
          transactionNo: record.transNo,
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

  async validateCopiedDetails(tx: Prisma.TransactionClient, input: ValidateAdvanceToSupplierCopiedDetailsInput) {
    if (cleanOptional(input.referenceModule) !== AdvanceToSupplierCopySourceLabel) {
      return;
    }

    const allocations = getAdvanceToSupplierCopiedDetailAmounts(input.details);
    if (allocations.length === 0) {
      return;
    }

    if (!input.partyId && !input.partyCode) {
      throw new BadRequestException('Party is required when copying from Advances to Suppliers.');
    }

    const legacyIds = allocations.filter((allocation) => /^\d+$/.test(allocation.reference)).map((allocation) => BigInt(allocation.reference));
    const transactionNos = allocations
      .filter((allocation) => !/^\d+$/.test(allocation.reference))
      .map((allocation) => parseAdvanceToSupplierReference(allocation.reference));
    const sources = await tx.advanceToSupplier.findMany({
      where: {
        companyId: input.companyId,
        deletedAt: null,
        ...(input.branchUnitId ? { branchUnitId: input.branchUnitId } : {}),
        OR: [...(legacyIds.length > 0 ? [{ id: { in: legacyIds } }] : []), ...(transactionNos.length > 0 ? [{ transNo: { in: transactionNos } }] : [])],
      },
    });
    const sourceIds = [...new Set(sources.map((source) => source.id.toString()))];
    for (const sourceId of sourceIds) {
      await this.lockAdvanceToSupplierAllocation(tx, BigInt(sourceId));
    }

    const sourcesByReference = new Map(
      sources.flatMap((source) => [[source.id.toString(), source] as const, [formatAdvanceToSupplierReference(source.transNo), source] as const]),
    );

    if (allocations.some((allocation) => !sourcesByReference.has(allocation.reference))) {
      throw new BadRequestException('One or more Advances to Suppliers records were not found.');
    }

    const resolvedAllocations = new Map<string, { source: (typeof sources)[number]; grossAmount: number; payableAmount: number }>();
    for (const allocation of allocations) {
      const source = sourcesByReference.get(allocation.reference);
      if (!source) {
        throw new BadRequestException('One or more Advances to Suppliers records were not found.');
      }

      const sourceId = source.id.toString();
      const current = resolvedAllocations.get(sourceId) ?? { source, grossAmount: 0, payableAmount: 0 };
      resolvedAllocations.set(sourceId, {
        source,
        grossAmount: roundMoney(current.grossAmount + allocation.grossAmount),
        payableAmount: roundMoney(current.payableAmount + allocation.payableAmount),
      });
    }

    const consumedAmounts = await this.getVoucherConsumedAmounts(
      tx,
      input.companyId,
      sources.map((source) => ({ id: source.id.toString(), transactionNo: source.transNo })),
      input.target,
      input.currentTargetId,
    );

    for (const allocation of resolvedAllocations.values()) {
      const { source } = allocation;
      if (!CopyableAdvanceToSupplierStatuses.includes(source.status)) {
        throw new BadRequestException(`ATS ${source.transNo} is not available for voucher copying.`);
      }

      if (input.branchUnitId && source.branchUnitId !== input.branchUnitId) {
        throw new BadRequestException(`ATS ${source.transNo} belongs to a different branch.`);
      }

      if (input.partyId && source.partyId !== input.partyId) {
        throw new BadRequestException(`ATS ${source.transNo} belongs to a different party.`);
      }

      if (!input.partyId && input.partyCode && source.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
        throw new BadRequestException(`ATS ${source.transNo} belongs to a different party.`);
      }

      if (source.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
        throw new BadRequestException(`ATS ${source.transNo} uses ${source.currencyCode}, not ${input.currencyCode}.`);
      }

      const sourceId = source.id.toString();
      const sourceAmount = roundMoney(Number(source.amount));
      const availableGrossAmount = roundMoney(sourceAmount - (consumedAmounts.gross.get(sourceId) ?? 0));
      const availableAmount = roundMoney(sourceAmount - (consumedAmounts.payable.get(sourceId) ?? 0));
      if (allocation.grossAmount > availableGrossAmount) {
        throw new BadRequestException(`ATS ${source.transNo} only has ${availableGrossAmount.toFixed(2)} gross amount remaining.`);
      }
      if (allocation.payableAmount > availableAmount) {
        throw new BadRequestException(`ATS ${source.transNo} only has ${availableAmount.toFixed(2)} disbursement amount remaining.`);
      }
    }
  }

  async lockAdvanceToSupplierAllocation(tx: Prisma.TransactionClient, advanceToSupplierId: bigint) {
    const lockKey = (PurchaseOrderAllocationLockNamespace << 31n) + advanceToSupplierId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }

  getCopiedVoucherDetailAmounts(details: CopiedVoucherDetailInput[] = []) {
    return getAdvanceToSupplierCopiedDetailAmounts(details);
  }

  async getVoucherConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    sources: Array<{ id: string; transactionNo: string }>,
    target: AdvanceToSupplierCopyFromTarget,
    currentTargetId?: bigint,
  ) {
    const consumedAmounts = {
      gross: new Map<string, number>(),
      payable: new Map<string, number>(),
    };
    if (sources.length === 0) {
      return consumedAmounts;
    }

    const idByReference = new Map<string, string>();
    for (const source of sources) {
      idByReference.set(source.id, source.id);
      idByReference.set(formatAdvanceToSupplierReference(source.transactionNo), source.id);
    }
    const references = [...idByReference.keys()];

    const [cashDetails, disbursementDetails] = await Promise.all([
      tx.cashVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: references },
          voucher: {
            deletedAt: null,
            referenceModule: AdvanceToSupplierCopySourceLabel,
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
            referenceModule: AdvanceToSupplierCopySourceLabel,
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

      const sourceId = idByReference.get(refId);
      if (!sourceId) {
        continue;
      }

      consumedAmounts.gross.set(sourceId, roundMoney((consumedAmounts.gross.get(sourceId) ?? 0) + getCopiedDetailAmount(detail)));
      consumedAmounts.payable.set(sourceId, roundMoney((consumedAmounts.payable.get(sourceId) ?? 0) + getCopiedDetailPayableAmount(detail)));
    }

    return consumedAmounts;
  }
}

export function formatAdvanceToSupplierReference(transactionNo: string) {
  return `ATS:${transactionNo.trim()}`;
}

export function parseAdvanceToSupplierReference(reference: string) {
  const separatorIndex = reference.indexOf(':');
  const prefix = separatorIndex >= 0 ? reference.slice(0, separatorIndex).trim().toUpperCase() : '';
  const transactionNo = separatorIndex >= 0 ? reference.slice(separatorIndex + 1).trim() : '';

  if (prefix !== 'ATS' || !transactionNo) {
    throw new BadRequestException('Advances to Suppliers detail Reference No must use ATS:<transactionNo>.');
  }

  return transactionNo;
}

export function getAdvanceToSupplierCopiedDetailAmounts(details: CopiedVoucherDetailInput[] = []) {
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
      : formatAdvanceToSupplierReference(parseAdvanceToSupplierReference(reference));
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
