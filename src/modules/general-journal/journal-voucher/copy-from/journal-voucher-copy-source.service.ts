import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AcknowledgementReceiptStatus,
  AccountsPayableVoucherStatus,
  CashVoucherStatus,
  DisbursementVoucherStatus,
  OfficialReceiptStatus,
  Prisma,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { roundMoney } from '../../../../common/utils/money.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { canAccessModuleAction } from '../../../../common/utils/module-permissions.util';
import { cleanOptional } from '../../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GetJournalVoucherCopyFromCandidatesQueryDto, JournalVoucherCopyFromTarget } from './dto/get-journal-voucher-copy-from-candidates-query.dto';

export const JournalVoucherCopySourceLabel = 'Journal Voucher';
export const JournalVoucherReferenceType = 'JV';

const JournalVoucherModuleCode = 'JV';
const JournalVoucherAllocationLockNamespace = 7095n;
const ActiveReceiptStatuses = [OfficialReceiptStatus.DRAFT, OfficialReceiptStatus.FOR_APPROVAL, OfficialReceiptStatus.POSTED];
const ActiveAcknowledgementReceiptStatuses = [
  AcknowledgementReceiptStatus.DRAFT,
  AcknowledgementReceiptStatus.FOR_APPROVAL,
  AcknowledgementReceiptStatus.POSTED,
];
const ActiveAccountsPayableVoucherStatuses = [
  AccountsPayableVoucherStatus.DRAFT,
  AccountsPayableVoucherStatus.FOR_APPROVAL,
  AccountsPayableVoucherStatus.POSTED,
];
const ActiveCashVoucherStatuses = [CashVoucherStatus.DRAFT, CashVoucherStatus.FOR_APPROVAL, CashVoucherStatus.POSTED];
const ActiveDisbursementVoucherStatuses = [DisbursementVoucherStatus.DRAFT, DisbursementVoucherStatus.FOR_APPROVAL, DisbursementVoucherStatus.POSTED];

type CopiedReferenceLine = {
  amount: number;
  reference: string;
};

type ValidateCopiedDetailsInput = {
  branchUnitId: number;
  companyId: number;
  currentTargetId?: bigint;
  currencyCode: string;
  details?: Array<{
    amount?: number | Prisma.Decimal | null;
    disburseAmount?: number | Prisma.Decimal | null;
    grossAmount?: number | Prisma.Decimal | null;
    netAmount?: number | Prisma.Decimal | null;
    referenceNo?: string | null;
    refId?: string | null;
    totalAmountDue?: number | Prisma.Decimal | null;
    totalReceived?: number | Prisma.Decimal | null;
  }>;
  partyCode?: string | null;
  target: JournalVoucherCopyFromTarget;
};

@Injectable()
export class JournalVoucherCopySourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(user: AuthUser, query: GetJournalVoucherCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCanRead(user, companyId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const branchUnitId = query.branchUnitId;
    const partyCode = cleanOptional(query.partyCode);
    const partyName = cleanOptional(query.partyName);
    const search = cleanOptional(query.search);
    const side = this.getTargetSide(query.target);

    const detailsWhere: Prisma.JournalEntryDetailWhereInput = {
      companyId,
      ...(side === 'debit' ? { debit: { gt: 0 } } : { credit: { gt: 0 } }),
      ...(partyName
        ? { partyNameSnapshot: { equals: partyName, mode: 'insensitive' } }
        : partyCode
          ? { partyCodeSnapshot: { equals: partyCode, mode: 'insensitive' } }
          : {}),
      ...(search
        ? {
            OR: [
              { accountCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { accountTitleSnapshot: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
              { particulars: { contains: search, mode: 'insensitive' } },
              { refNo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      journalEntryHeader: {
        companyId,
        referenceType: JournalVoucherReferenceType,
        status: 'Posted',
        ...(branchUnitId ? { branchUnitId } : {}),
        ...(search
          ? {
              OR: [{ referenceNo: { contains: search, mode: 'insensitive' } }, { remarks: { contains: search, mode: 'insensitive' } }],
            }
          : {}),
      },
    };

    const [lines, total] = await Promise.all([
      this.prisma.journalEntryDetail.findMany({
        where: detailsWhere,
        include: { journalEntryHeader: true },
        orderBy: [{ journalEntryHeader: { transactionDate: 'desc' } }, { jeno: 'desc' }, { lineNumber: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.journalEntryDetail.count({ where: detailsWhere }),
    ]);

    const references = lines.map((line) => this.formatReference(line.journalEntryHeader.referenceNo, line.lineNumber));
    const consumed = await this.getConsumedAmounts(this.prisma, companyId, references, query.target);
    const records = lines
      .map((line) => {
        const reference = this.formatReference(line.journalEntryHeader.referenceNo, line.lineNumber);
        const amount = roundMoney(Number(side === 'debit' ? line.debit : line.credit));
        const consumedAmount = consumed.get(reference) ?? 0;
        const availableAmount = roundMoney(amount - consumedAmount);

        return {
          accountCode: line.accountCodeSnapshot,
          accountTitle: line.accountTitleSnapshot,
          amount,
          availableAmount,
          branchUnitId: line.journalEntryHeader.branchUnitId,
          consumedAmount,
          currency: line.journalEntryHeader.currencyCode,
          documentDate: line.journalEntryHeader.transactionDate.toISOString().slice(0, 10),
          exchangeRate: Number(line.journalEntryHeader.exchangeRate),
          id: reference,
          lineNumber: line.lineNumber,
          particulars: line.particulars ?? line.journalEntryHeader.remarks,
          partyCode: line.partyCodeSnapshot,
          partyName: line.partyNameSnapshot,
          refNo: line.refNo,
          responsibilityCenter: line.responsibilityCenterSnapshot,
          side,
          source: JournalVoucherCopySourceLabel,
          sourceNo: line.journalEntryHeader.referenceNo ?? String(line.journalEntryHeader.referenceId),
          transactionNo: line.journalEntryHeader.referenceNo ?? String(line.journalEntryHeader.referenceId),
        };
      })
      .filter((record) => record.availableAmount > 0);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async validateCopiedDetails(tx: Prisma.TransactionClient, input: ValidateCopiedDetailsInput) {
    const allocations = this.getCopiedReferenceLines(input.details, input.target);
    if (allocations.length === 0) {
      return;
    }

    const references = allocations.map((allocation) => this.parseReference(allocation.reference));
    const voucherNos = [...new Set(references.map((reference) => reference.transactionNo))];
    const vouchers = await tx.journalEntryHeader.findMany({
      where: {
        branchUnitId: input.branchUnitId,
        companyId: input.companyId,
        referenceNo: { in: voucherNos },
        referenceType: JournalVoucherReferenceType,
      },
      include: { details: true },
    });

    const voucherIds = [...new Set(vouchers.map((voucher) => voucher.referenceId.toString()))];
    for (const voucherId of voucherIds) {
      await this.lockJournalVoucherAllocation(tx, BigInt(voucherId));
    }

    const lineByReference = new Map(
      vouchers.flatMap((voucher) =>
        voucher.details.map((line) => [this.formatReference(voucher.referenceNo, line.lineNumber), { header: voucher, line }] as const),
      ),
    );

    const consumed = await this.getConsumedAmounts(
      tx,
      input.companyId,
      allocations.map((allocation) => allocation.reference),
      input.target,
      input.currentTargetId,
    );
    const side = this.getTargetSide(input.target);

    for (const allocation of allocations) {
      const source = lineByReference.get(allocation.reference);
      if (!source) {
        throw new BadRequestException('One or more Journal Voucher references were not found.');
      }
      if (source.header.status !== 'Posted') {
        throw new BadRequestException(`${JournalVoucherCopySourceLabel} ${source.header.referenceNo} is not posted.`);
      }
      if (source.header.currencyCode !== input.currencyCode) {
        throw new BadRequestException(`${JournalVoucherCopySourceLabel} ${source.header.referenceNo} uses a different currency.`);
      }
      if (input.partyCode && source.line.partyCodeSnapshot && source.line.partyCodeSnapshot !== input.partyCode) {
        throw new BadRequestException(`${JournalVoucherCopySourceLabel} ${source.header.referenceNo} belongs to a different party.`);
      }

      const sourceAmount = roundMoney(Number(side === 'debit' ? source.line.debit : source.line.credit));
      const availableAmount = roundMoney(sourceAmount - (consumed.get(allocation.reference) ?? 0));
      if (allocation.amount > availableAmount) {
        throw new BadRequestException(
          `${JournalVoucherCopySourceLabel} ${source.header.referenceNo} line ${source.line.lineNumber} only has ${availableAmount.toFixed(2)} remaining.`,
        );
      }
    }
  }

  private getCopiedReferenceLines(details: ValidateCopiedDetailsInput['details'], target: JournalVoucherCopyFromTarget): CopiedReferenceLine[] {
    const totals = new Map<string, number>();

    for (const detail of details ?? []) {
      const reference = cleanOptional(detail.refId) ?? cleanOptional(detail.referenceNo);
      if (!reference?.startsWith('JV:')) {
        continue;
      }

      const amount = this.getTargetDetailAmount(detail, target);
      if (amount <= 0) {
        continue;
      }

      totals.set(reference, roundMoney((totals.get(reference) ?? 0) + amount));
    }

    return [...totals.entries()].map(([reference, amount]) => ({ reference, amount }));
  }

  private getTargetDetailAmount(detail: NonNullable<ValidateCopiedDetailsInput['details']>[number], target: JournalVoucherCopyFromTarget) {
    if (target === 'official-receipt' || target === 'acknowledgement-receipt') {
      return roundMoney(Number(detail.totalReceived ?? detail.grossAmount ?? detail.amount ?? 0));
    }

    return roundMoney(Number(detail.disburseAmount ?? detail.totalAmountDue ?? detail.netAmount ?? detail.grossAmount ?? detail.amount ?? 0));
  }

  private async getConsumedAmounts(
    tx: PrismaService | Prisma.TransactionClient,
    companyId: number,
    references: string[],
    target: JournalVoucherCopyFromTarget,
    currentTargetId?: bigint,
  ) {
    const uniqueReferences = [...new Set(references)];
    const consumed = new Map(uniqueReferences.map((reference) => [reference, 0]));
    if (uniqueReferences.length === 0) {
      return consumed;
    }

    if (target === 'official-receipt') {
      const rows = await tx.officialReceiptDetails.groupBy({
        by: ['referenceNo'],
        where: {
          companyId,
          referenceNo: { in: uniqueReferences },
          officialReceipt: {
            deletedAt: null,
            status: { in: ActiveReceiptStatuses },
            ...(currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        _sum: { totalReceived: true },
      });
      for (const row of rows) consumed.set(row.referenceNo ?? '', roundMoney(Number(row._sum.totalReceived ?? 0)));
    }

    if (target === 'acknowledgement-receipt') {
      const rows = await tx.acknowledgementReceiptDetails.groupBy({
        by: ['referenceNo'],
        where: {
          companyId,
          referenceNo: { in: uniqueReferences },
          acknowledgementReceipt: {
            deletedAt: null,
            status: { in: ActiveAcknowledgementReceiptStatuses },
            ...(currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        _sum: { totalReceived: true },
      });
      for (const row of rows) consumed.set(row.referenceNo ?? '', roundMoney(Number(row._sum.totalReceived ?? 0)));
    }

    if (target === 'accounts-payable-voucher') {
      const rows = await tx.accountsPayableVoucherDetails.groupBy({
        by: ['referenceNo'],
        where: {
          companyId,
          referenceNo: { in: uniqueReferences },
          voucher: {
            deletedAt: null,
            status: { in: ActiveAccountsPayableVoucherStatuses },
            ...(currentTargetId ? { apvId: { not: currentTargetId } } : {}),
          },
        },
        _sum: { totalAmountDue: true },
      });
      for (const row of rows) consumed.set(row.referenceNo ?? '', roundMoney(Number(row._sum.totalAmountDue ?? 0)));
    }

    if (target === 'cash-voucher') {
      const rows = await tx.cashVoucherDetail.groupBy({
        by: ['refId'],
        where: {
          companyId,
          refId: { in: uniqueReferences },
          voucher: {
            deletedAt: null,
            referenceModule: JournalVoucherCopySourceLabel,
            status: { in: ActiveCashVoucherStatuses },
            ...(currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        _sum: { disburseAmount: true },
      });
      for (const row of rows) consumed.set(row.refId ?? '', roundMoney(Number(row._sum.disburseAmount ?? 0)));
    }

    if (target === 'disbursement-voucher') {
      const rows = await tx.disbursementVoucherDetail.groupBy({
        by: ['refId'],
        where: {
          companyId,
          refId: { in: uniqueReferences },
          voucher: {
            deletedAt: null,
            referenceModule: JournalVoucherCopySourceLabel,
            status: { in: ActiveDisbursementVoucherStatuses },
            ...(currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        _sum: { disburseAmount: true },
      });
      for (const row of rows) consumed.set(row.refId ?? '', roundMoney(Number(row._sum.disburseAmount ?? 0)));
    }

    return consumed;
  }

  private getTargetSide(target: JournalVoucherCopyFromTarget): 'debit' | 'credit' {
    return target === 'official-receipt' || target === 'acknowledgement-receipt' ? 'debit' : 'credit';
  }

  private formatReference(transactionNo: string | null | undefined, lineNumber: number) {
    return `JV:${transactionNo ?? ''}:L${lineNumber}`;
  }

  private parseReference(reference: string) {
    const match = reference.trim().match(/^JV:(.+):L(\d+)$/i);
    if (!match) {
      throw new BadRequestException('Journal Voucher references must use JV:<transactionNo>:L<lineNumber>.');
    }

    return {
      transactionNo: match[1],
      lineNumber: Number(match[2]),
    };
  }

  private async lockJournalVoucherAllocation(tx: Prisma.TransactionClient, voucherId: bigint) {
    const lockKey = (JournalVoucherAllocationLockNamespace << 32n) + voucherId;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
  }

  private ensureCanRead(user: AuthUser, companyId: number) {
    if (canAccessModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.VIEW)) {
      return;
    }

    throw new BadRequestException('You do not have permission to view Journal Voucher Copy From records.');
  }
}
