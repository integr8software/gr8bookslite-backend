import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AccountsPayableVoucherStatus, CashVoucherStatus, DisbursementVoucherStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
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
const CopyableAccountsPayableVoucherStatuses: AccountsPayableVoucherStatus[] = [
  AccountsPayableVoucherStatus.APPROVED,
  AccountsPayableVoucherStatus.CLOSED,
];

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

type CopiedDetailInput = {
  debit?: number | Prisma.Decimal;
  disburseAmount?: number | Prisma.Decimal;
  grossAmount?: number | Prisma.Decimal;
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
      records.map((record) => record.apvId.toString()),
      query.target,
    );

    const candidates = records
      .map((record) => {
        const consumedAmount = consumedAmounts.get(record.apvId.toString()) ?? 0;
        const amount = Number(record.amount);
        const availableAmount = roundMoney(amount - consumedAmount);

        return {
          amount,
          availableAmount,
          branchUnitId: record.branchUnitId,
          consumedAmount,
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
          source: AccountsPayableVoucherCopySourceLabel,
          sourceNo: record.transactionNo,
          transactionNo: record.transactionNo,
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

    const apvIds = allocations.map((allocation) => allocation.apvId);
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
        partyCodeSnapshot: true,
        partyId: true,
        status: true,
        transactionNo: true,
      },
    });
    const apvsById = new Map(apvs.map((apv) => [apv.apvId.toString(), apv]));

    if (apvs.length !== apvIds.length) {
      throw new BadRequestException('One or more Accounts Payable Vouchers were not found.');
    }

    const consumedAmounts = await this.getConsumedAmounts(tx, input.companyId, apvIds, input.target, input.currentTargetId);

    for (const allocation of allocations) {
      const apv = apvsById.get(allocation.apvId);
      if (!apv) {
        throw new BadRequestException('One or more Accounts Payable Vouchers were not found.');
      }

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

      const consumedAmount = consumedAmounts.get(allocation.apvId) ?? 0;
      const availableAmount = roundMoney(Number(apv.amount) - consumedAmount);
      if (allocation.amount > availableAmount) {
        throw new BadRequestException(`APV ${apv.transactionNo} only has ${availableAmount.toFixed(2)} remaining.`);
      }
    }
  }

  private getCopiedDetailAmounts(details: CopiedDetailInput[] = []) {
    const amountsByApvId = new Map<string, number>();

    for (const detail of details) {
      const referenceId = cleanOptional(detail.refId);
      if (!referenceId) {
        continue;
      }

      const apvId = parsePositiveBigIntId(referenceId, 'detail refId').toString();
      const amount = getCopiedDetailAmount(detail);
      if (amount <= 0) {
        continue;
      }

      amountsByApvId.set(apvId, roundMoney((amountsByApvId.get(apvId) ?? 0) + amount));
    }

    return [...amountsByApvId].map(([apvId, amount]) => ({ apvId, amount }));
  }

  private async lockAccountsPayableVoucherAllocation(tx: Prisma.TransactionClient, apvId: bigint) {
    const lockKey = (AccountsPayableVoucherAllocationLockNamespace << 32n) + apvId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }

  private async getConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    apvIds: string[],
    target: AccountsPayableVoucherCopyFromTarget,
    currentTargetId?: bigint,
  ) {
    const consumedAmounts = new Map<string, number>();
    if (apvIds.length === 0) {
      return consumedAmounts;
    }

    const [cashDetails, disbursementDetails] = await Promise.all([
      tx.cashVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: apvIds },
          voucher: {
            deletedAt: null,
            referenceModule: AccountsPayableVoucherCopySourceLabel,
            status: { in: ActiveCashVoucherStatuses },
            ...(target === 'cash-voucher' && currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        select: {
          debit: true,
          disburseAmount: true,
          grossAmount: true,
          refId: true,
        },
      }),
      tx.disbursementVoucherDetail.findMany({
        where: {
          companyId,
          refId: { in: apvIds },
          voucher: {
            deletedAt: null,
            referenceModule: AccountsPayableVoucherCopySourceLabel,
            status: { in: ActiveDisbursementVoucherStatuses },
            ...(target === 'disbursement-voucher' && currentTargetId ? { id: { not: currentTargetId } } : {}),
          },
        },
        select: {
          debit: true,
          disburseAmount: true,
          grossAmount: true,
          refId: true,
        },
      }),
    ]);

    for (const detail of [...cashDetails, ...disbursementDetails]) {
      const refId = cleanOptional(detail.refId);
      if (!refId) {
        continue;
      }

      consumedAmounts.set(refId, roundMoney((consumedAmounts.get(refId) ?? 0) + getCopiedDetailAmount(detail)));
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

function getCopiedDetailAmount(detail: CopiedDetailInput) {
  return roundMoney(Number(detail.grossAmount || detail.debit || detail.disburseAmount || 0));
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
