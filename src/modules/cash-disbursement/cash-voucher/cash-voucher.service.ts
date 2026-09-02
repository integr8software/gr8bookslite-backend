import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CashVoucherStatus,
  ChartAccount,
  ChartAccountStatus,
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Party,
  PartyAddress,
  PartyStatus,
  Prisma,
  ResponsibilityCenter,
  ResponsibilityCenterStatus,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  resolveTransactionNumberForCompanyBranch,
  resolveTransactionNumberScopeForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CashVoucherDetailDto } from './dto/cash-voucher-detail.dto';
import { CreateCashVoucherDto } from './dto/create-cash-voucher.dto';
import { GetCashVoucherListQueryDto } from './dto/get-cash-voucher-list-query.dto';
import { JournalEntryDto } from './dto/journal-entry.dto';
import { UpdateCashVoucherDto } from './dto/update-cash-voucher.dto';
import { UpdateCashVoucherStatusDto } from './dto/update-cash-voucher-status.dto';
import { mapCashVoucher } from './mappers/cash-voucher.mapper';
import { CashVoucherInclude } from './prisma/cash-voucher.include';
import { CashVoucherAccountingService, CashVoucherReferenceType } from './services/cash-voucher-accounting.service';
export const CashVoucherModuleCode = 'CV';
import type { CashVoucherJournalEntry, CashVoucherWithDetails } from './types/cash-voucher-with-details.type';
import { roundCurrency } from './utils/cash-voucher-totals.util';

const JournalEntryNumberAdvisoryLockNamespace = 7082;
type PrismaWriteClient = PrismaService | Prisma.TransactionClient;
type PartyWithAddresses = Party & { addresses: PartyAddress[] };

type ResolvedVoucherReferences = {
  creditAccount: ChartAccount | null;
  details: ResolvedDetailLine[];
  journalEntries: ResolvedJournalEntry[];
  party: PartyWithAddresses | null;
};

type ResolvedDetailLine = {
  account: ChartAccount | null;
  input: CashVoucherDetailDto;
  party: PartyWithAddresses | null;
  responsibilityCenter: ResponsibilityCenter | null;
};

type ResolvedJournalEntry = {
  account: ChartAccount;
  input: JournalEntryDto;
  party: PartyWithAddresses | null;
  responsibilityCenter: ResponsibilityCenter | null;
};

@Injectable()
export class CashVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCurrencyService: CompanyCurrencyService,
    private readonly accountingService: CashVoucherAccountingService,
  ) {}

  async findAll(user: AuthUser, query: GetCashVoucherListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, branchUnitId, query);
    const orderBy = this.buildOrderBy(query);

    const [records, total, statistics] = await Promise.all([
      this.prisma.cashVoucher.findMany({
        where,
        include: CashVoucherInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.cashVoucher.count({ where }),
      this.getStatistics(companyId, branchUnitId),
    ]);

    const vouchersWithJournal = await this.attachJournalEntries(records);
    const mapped = await this.mapWithAuditUsers(vouchersWithJournal);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    const permissions = this.getPermissions(user, companyId);

    return {
      data: mapped,
      vouchers: mapped,
      meta: pagination,
      pagination,
      statistics,
      permissions,
    };
  }

  async findOne(user: AuthUser, id: string, requestedBranchUnitId?: number) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const branchUnitId = requestedBranchUnitId ? await this.resolveBranchUnitId(companyId, requestedBranchUnitId) : undefined;
    const voucher = await this.findVoucherOrThrow(companyId, parsePositiveBigIntId(id), branchUnitId);
    const mapped = (await this.mapWithAuditUsers([voucher]))[0];
    const permissions = this.getPermissions(user, companyId);

    return {
      data: mapped,
      voucher: mapped,
      permissions,
    };
  }

  async suggestTransactionNumber(user: AuthUser, requestedBranchUnitId?: number) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const branchUnitId = await this.resolveBranchUnitId(companyId, requestedBranchUnitId);

    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: CashVoucherModuleCode,
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(this.prisma, companyId, branchUnitId, transactionNo, context.scope),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreateCashVoucherDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const normalized = await this.normalizeVoucherInput(companyId, dto);
    const targetStatus = dto.status || CashVoucherStatus.DRAFT;

    if (this.requiresSubmissionValidation(targetStatus)) {
      this.validateSubmittedHeader(dto);
      this.accountingService.validateSubmittedPayload({
        currencyCode: normalized.currencyCode,
        details: dto.details ?? [],
        exchangeRate: normalized.exchangeRate,
        journalEntries: dto.journalEntries,
        voucherAmount: normalized.amount,
      });
    }

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const references = await this.resolveVoucherReferences(tx, companyId, dto, {
          requireDetailAccounts: this.requiresSubmissionValidation(targetStatus),
        });
        const transactionNo = await this.resolveTransactionNumberForCreate(tx, {
          branchUnitId,
          companyId,
          requestedTransactionNo: dto.voucherNo || dto.transactionNo,
        });

        const created = await tx.cashVoucher.create({
          data: {
            companyId,
            branchUnitId,
            partyId: references.party?.id ?? null,
            creditAccountId: references.creditAccount?.id ?? null,
            voucherNo: transactionNo,
            voucherDate: normalized.voucherDate,
            paymentDueDate: normalized.paymentDueDate,
            referenceNo: cleanOptional(dto.referenceNo),
            referenceModule: cleanOptional(dto.referenceModule),
            voucherReferenceNo: cleanOptional(dto.voucherReferenceNo),
            invoiceReferenceNo: cleanOptional(dto.invoiceReferenceNo),
            paymentMethod: cleanOptional(dto.paymentMethod) || 'Cash',
            disbursementType: cleanOptional(dto.disbursementType) || 'Vendor Payment',
            partyCodeSnapshot: references.party?.partyCodeNo || dto.partyCode?.trim() || '',
            partyNameSnapshot: references.party ? this.getPartyName(references.party, dto.partyName) : dto.partyName?.trim() || '',
            projectCode: cleanOptional(dto.projectCode) ?? cleanOptional(dto.costCenter),
            projectName: cleanOptional(dto.projectName),
            preparedBy: cleanOptional(dto.preparedBy),
            currencyCode: normalized.currencyCode,
            exchangeRate: new Prisma.Decimal(String(normalized.exchangeRate)),
            amount: new Prisma.Decimal(String(normalized.amount)),
            remarks: cleanOptional(dto.remarks),
            status: targetStatus,
            createdByUserId: user.id ? Number(user.id) : null,
          },
          include: CashVoucherInclude,
        });

        await this.replaceDetails(tx, created.id, companyId, branchUnitId, references.details);
        await this.replaceJournalEntries(
          tx,
          created.id,
          companyId,
          branchUnitId,
          normalized.currencyCode,
          normalized.exchangeRate,
          cleanOptional(dto.remarks),
          references.journalEntries,
        );

        const saved = await tx.cashVoucher.findUniqueOrThrow({
          where: { id: created.id },
          include: CashVoucherInclude,
        });

        return (await this.attachJournalEntries([saved], tx))[0];
      });

      const mapped = (await this.mapWithAuditUsers([voucher]))[0];
      const permissions = this.getPermissions(user, companyId);

      return {
        message: 'Cash Voucher created successfully.',
        data: mapped,
        voucher: mapped,
        permissions,
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateCashVoucherDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const voucherId = parsePositiveBigIntId(id);
    const current = await this.findVoucherOrThrow(companyId, voucherId);

    if (current.status !== CashVoucherStatus.DRAFT && current.status !== CashVoucherStatus.FOR_APPROVAL) {
      throw new BadRequestException('Only draft or for approval cash vouchers can be edited.');
    }

    const branchUnitId = current.branchUnitId ?? (await this.resolveBranchUnitId(companyId, dto.branchUnitId));
    const normalized = await this.normalizeVoucherInput(companyId, {
      ...dto,
      partyCode: dto.partyCode ?? current.partyCodeSnapshot,
      partyName: dto.partyName ?? current.partyNameSnapshot,
      voucherDate: dto.voucherDate ?? dto.documentDate ?? current.voucherDate.toISOString(),
      details: dto.details ?? [],
    });
    const targetStatus = dto.status || current.status;

    if (this.requiresSubmissionValidation(targetStatus)) {
      this.validateSubmittedHeader({
        ...dto,
        partyCode: dto.partyCode ?? current.partyCodeSnapshot,
        partyName: dto.partyName ?? current.partyNameSnapshot,
      });
      this.accountingService.validateSubmittedPayload({
        currencyCode: normalized.currencyCode,
        details:
          dto.details ??
          current.details.map((detail, index) => ({
            lineNumber: detail.lineNumber || index + 1,
            accountId: detail.accountId?.toString(),
            accountCode: detail.accountCodeSnapshot,
            accountTitle: detail.accountTitleSnapshot,
            debit: Number(detail.debit),
            credit: Number(detail.credit),
            grossAmount: Number(detail.grossAmount),
            disburseAmount: Number(detail.disburseAmount),
          })),
        exchangeRate: normalized.exchangeRate,
        journalEntries: dto.journalEntries,
        voucherAmount: normalized.amount,
      });
    }

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const references = await this.resolveVoucherReferences(tx, companyId, dto, {
          requireDetailAccounts: this.requiresSubmissionValidation(targetStatus),
        });
        const transactionNo = await this.resolveTransactionNumberForUpdate(tx, {
          branchUnitId,
          companyId,
          currentTransactionNo: current.voucherNo,
          excludedVoucherId: voucherId,
          requestedTransactionNo: dto.voucherNo || dto.transactionNo,
        });

        await tx.cashVoucher.update({
          where: { id: voucherId },
          data: {
            partyId: references.party !== undefined ? (references.party?.id ?? null) : current.partyId,
            creditAccountId: references.creditAccount !== undefined ? (references.creditAccount?.id ?? null) : current.creditAccountId,
            voucherNo: transactionNo,
            voucherDate: normalized.voucherDate,
            paymentDueDate: normalized.paymentDueDate,
            referenceNo: dto.referenceNo !== undefined ? cleanOptional(dto.referenceNo) : current.referenceNo,
            referenceModule: dto.referenceModule !== undefined ? cleanOptional(dto.referenceModule) : current.referenceModule,
            voucherReferenceNo: dto.voucherReferenceNo !== undefined ? cleanOptional(dto.voucherReferenceNo) : current.voucherReferenceNo,
            invoiceReferenceNo: dto.invoiceReferenceNo !== undefined ? cleanOptional(dto.invoiceReferenceNo) : current.invoiceReferenceNo,
            paymentMethod: dto.paymentMethod !== undefined ? cleanOptional(dto.paymentMethod) || 'Cash' : current.paymentMethod,
            disbursementType: dto.disbursementType !== undefined ? cleanOptional(dto.disbursementType) : current.disbursementType,
            partyCodeSnapshot: dto.partyCode ? dto.partyCode.trim() : references.party?.partyCodeNo || current.partyCodeSnapshot,
            partyNameSnapshot: dto.partyName
              ? dto.partyName.trim()
              : references.party
                ? this.getPartyName(references.party, dto.partyName)
                : current.partyNameSnapshot,
            projectCode:
              dto.projectCode !== undefined || dto.costCenter !== undefined
                ? (cleanOptional(dto.projectCode) ?? cleanOptional(dto.costCenter))
                : current.projectCode,
            projectName: dto.projectName !== undefined ? cleanOptional(dto.projectName) : current.projectName,
            preparedBy: dto.preparedBy !== undefined ? cleanOptional(dto.preparedBy) : current.preparedBy,
            currencyCode: normalized.currencyCode,
            exchangeRate: new Prisma.Decimal(String(normalized.exchangeRate)),
            amount: new Prisma.Decimal(String(normalized.amount)),
            remarks: dto.remarks !== undefined ? cleanOptional(dto.remarks) : current.remarks,
            status: targetStatus,
            updatedByUserId: user.id ? Number(user.id) : null,
          },
        });

        if (dto.details && dto.details.length > 0) {
          await this.replaceDetails(tx, voucherId, companyId, branchUnitId, references.details);
        }

        if (dto.journalEntries && dto.journalEntries.length > 0) {
          await this.replaceJournalEntries(
            tx,
            voucherId,
            companyId,
            branchUnitId,
            normalized.currencyCode,
            normalized.exchangeRate,
            cleanOptional(dto.remarks) ?? current.remarks,
            references.journalEntries,
          );
        }

        const saved = await tx.cashVoucher.findUniqueOrThrow({
          where: { id: voucherId },
          include: CashVoucherInclude,
        });

        return (await this.attachJournalEntries([saved], tx))[0];
      });

      const mapped = (await this.mapWithAuditUsers([voucher]))[0];
      const permissions = this.getPermissions(user, companyId);

      return {
        message: 'Cash Voucher updated successfully.',
        data: mapped,
        voucher: mapped,
        permissions,
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateCashVoucherStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const targetStatus = this.normalizeStatus(dto.status);
    const requiredAction = targetStatus === CashVoucherStatus.CANCELLED ? PermissionAction.CANCEL : PermissionAction.UPDATE;

    this.ensureCan(user, companyId, requiredAction);
    const voucherId = parsePositiveBigIntId(id);
    const current = await this.findVoucherOrThrow(companyId, voucherId);

    if (current.status === targetStatus) {
      const mapped = (await this.mapWithAuditUsers([current]))[0];
      return {
        message: 'Cash Voucher status is already up to date.',
        data: mapped,
        voucher: mapped,
        permissions: this.getPermissions(user, companyId),
      };
    }

    if (targetStatus === CashVoucherStatus.FOR_APPROVAL || targetStatus === CashVoucherStatus.APPROVED || targetStatus === CashVoucherStatus.POSTED) {
      this.validateSubmittedHeader({
        partyCode: current.partyCodeSnapshot,
        partyName: current.partyNameSnapshot,
      });
      this.accountingService.validatePersistedPayload({
        amount: Number(current.amount),
        details: current.details,
        journalEntries: current.journalEntries,
      });
    }

    const now = new Date();
    const userId = user.id ? Number(user.id) : null;
    const auditData: Prisma.CashVoucherUpdateInput = {
      status: targetStatus,
      updatedByUserId: userId,
    };

    if (targetStatus === CashVoucherStatus.APPROVED) {
      auditData.approvedByUserId = userId;
      auditData.approvedAt = now;
    } else if (targetStatus === CashVoucherStatus.POSTED || targetStatus === CashVoucherStatus.CLOSED) {
      auditData.postedByUserId = userId;
      auditData.postedAt = now;
    } else if (targetStatus === CashVoucherStatus.DISAPPROVED) {
      auditData.disapprovedByUserId = userId;
      auditData.disapprovedAt = now;
    } else if (targetStatus === CashVoucherStatus.CANCELLED) {
      auditData.cancelledByUserId = userId;
      auditData.cancelledAt = now;
    }

    const voucher = await this.prisma.cashVoucher.update({
      where: { id: voucherId },
      data: auditData,
      include: CashVoucherInclude,
    });

    const saved = (await this.attachJournalEntries([voucher]))[0];
    const mapped = (await this.mapWithAuditUsers([saved]))[0];

    return {
      message: 'Cash Voucher status updated successfully.',
      data: mapped,
      voucher: mapped,
      permissions: this.getPermissions(user, companyId),
    };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CANCEL);
    const voucherId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashVoucher.findFirst({
      where: { id: voucherId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Cash Voucher record not found.');
    }

    const userId = user.id ? Number(user.id) : null;
    const now = new Date();

    await this.prisma.cashVoucher.update({
      where: { id: voucherId },
      data: {
        deletedAt: now,
        status: CashVoucherStatus.CANCELLED,
        cancelledByUserId: userId,
        cancelledAt: now,
        updatedByUserId: userId,
      },
    });

    return { message: 'Cash Voucher record cancelled successfully.' };
  }

  private buildListWhere(companyId: number, branchUnitId?: number, query: GetCashVoucherListQueryDto = {}): Prisma.CashVoucherWhereInput {
    const search = query.search?.trim();
    const startDate = query.documentDateFrom || query.startDate;
    const endDate = query.documentDateTo || query.endDate;
    const dateFrom = startDate ? new Date(startDate) : undefined;
    const dateTo = endDate ? new Date(endDate) : undefined;
    const searchConditions: Prisma.CashVoucherWhereInput[] = [];

    if (query.amountFrom !== undefined && query.amountTo !== undefined && query.amountFrom > query.amountTo) {
      throw new BadRequestException('Amount from cannot be greater than amount to.');
    }

    if (search) {
      searchConditions.push(
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { voucherReferenceNo: { contains: search, mode: 'insensitive' } },
        { invoiceReferenceNo: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } },
      );
    }

    return {
      companyId,
      deletedAt: null,
      ...(branchUnitId ? { branchUnitId } : {}),
      ...(query.status ? { status: this.normalizeStatus(query.status) } : {}),
      ...(query.partyCode?.trim() ? { partyCodeSnapshot: { equals: query.partyCode.trim(), mode: 'insensitive' } } : {}),
      ...(dateFrom || dateTo
        ? {
            voucherDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(query.amountFrom !== undefined || query.amountTo !== undefined
        ? {
            amount: {
              ...(query.amountFrom !== undefined ? { gte: query.amountFrom } : {}),
              ...(query.amountTo !== undefined ? { lte: query.amountTo } : {}),
            },
          }
        : {}),
      ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
    };
  }

  private buildOrderBy(query: GetCashVoucherListQueryDto): Prisma.CashVoucherOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'voucherDate';
    const sortDirection = query.sortDirection ?? query.sortOrder ?? 'desc';
    const field = (() => {
      switch (sortBy) {
        case 'partyName':
          return 'partyNameSnapshot';
        case 'partyCode':
          return 'partyCodeSnapshot';
        case 'currency':
          return 'currencyCode';
        case 'transactionNo':
        case 'voucherNo':
          return 'voucherNo';
        case 'amount':
        case 'createdAt':
        case 'updatedAt':
        case 'status':
          return sortBy;
        case 'documentDate':
        case 'voucherDate':
        default:
          return 'voucherDate';
      }
    })();

    return [{ [field]: sortDirection }, { id: 'desc' }];
  }

  private async getStatistics(companyId: number, branchUnitId?: number) {
    const baseWhere: Prisma.CashVoucherWhereInput = {
      companyId,
      deletedAt: null,
      ...(branchUnitId ? { branchUnitId } : {}),
    };

    const counts = await this.prisma.cashVoucher.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });

    const countsMap = new Map<CashVoucherStatus, number>();
    for (const item of counts) {
      countsMap.set(item.status, item._count.id);
    }

    const totalVouchers = await this.prisma.cashVoucher.count({ where: baseWhere });

    return {
      totalVouchers,
      draftVouchers: countsMap.get(CashVoucherStatus.DRAFT) ?? 0,
      forApprovalVouchers: countsMap.get(CashVoucherStatus.FOR_APPROVAL) ?? 0,
      postedVouchers: (countsMap.get(CashVoucherStatus.POSTED) ?? 0) + (countsMap.get(CashVoucherStatus.CLOSED) ?? 0),
      disapprovedVouchers: countsMap.get(CashVoucherStatus.DISAPPROVED) ?? 0,
      cancelledVouchers: countsMap.get(CashVoucherStatus.CANCELLED) ?? 0,
    };
  }

  private async mapWithAuditUsers(records: CashVoucherWithDetails[]) {
    const userIds = new Set<number>();
    for (const record of records) {
      if (record.createdByUserId) userIds.add(record.createdByUserId);
      if (record.updatedByUserId) userIds.add(record.updatedByUserId);
      if (record.approvedByUserId) userIds.add(record.approvedByUserId);
      if (record.postedByUserId) userIds.add(record.postedByUserId);
      if (record.disapprovedByUserId) userIds.add(record.disapprovedByUserId);
      if (record.cancelledByUserId) userIds.add(record.cancelledByUserId);
    }

    const userNames = await resolveAuditUserNames(this.prisma, Array.from(userIds));
    return records.map((record) => mapCashVoucher(record, userNames));
  }

  private async findVoucherOrThrow(companyId: number, id: bigint, branchUnitId?: number) {
    const voucher = await this.prisma.cashVoucher.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
        ...(branchUnitId ? { branchUnitId } : {}),
      },
      include: CashVoucherInclude,
    });

    if (!voucher) {
      throw new NotFoundException('Cash Voucher record not found.');
    }

    return (await this.attachJournalEntries([voucher]))[0];
  }

  private async attachJournalEntries<T extends Prisma.CashVoucherGetPayload<{ include: typeof CashVoucherInclude }>>(
    vouchers: T[],
    tx: PrismaWriteClient = this.prisma,
  ): Promise<Array<T & { journalEntries: CashVoucherJournalEntry[] }>> {
    if (vouchers.length === 0) {
      return [];
    }

    const journalEntryHeaders = await tx.journalEntryHeader.findMany({
      where: {
        referenceId: {
          in: vouchers.map((voucher) => voucher.id),
        },
        referenceType: CashVoucherReferenceType,
      },
      include: {
        details: {
          orderBy: {
            lineNumber: 'asc',
          },
        },
      },
      orderBy: [{ referenceId: 'asc' }],
    });

    const journalEntriesByReferenceId = new Map<string, CashVoucherJournalEntry[]>();

    for (const header of journalEntryHeaders) {
      const entries = header.details.map((entry) => ({
        ...entry,
        currencyCode: header.currencyCode,
        exchangeRate: header.exchangeRate,
        particulars: entry.particulars ?? header.particulars,
        referenceId: header.referenceId,
        referenceNo: header.referenceNo,
        referenceType: header.referenceType,
      }));

      journalEntriesByReferenceId.set(header.referenceId.toString(), entries);
    }

    return vouchers.map((voucher) => ({
      ...voucher,
      journalEntries: journalEntriesByReferenceId.get(voucher.id.toString()) ?? [],
    }));
  }

  private async replaceDetails(tx: Prisma.TransactionClient, voucherId: bigint, companyId: number, branchUnitId: number | null, details: ResolvedDetailLine[]) {
    await tx.cashVoucherDetail.deleteMany({
      where: { voucherId },
    });

    if (details.length === 0) {
      return;
    }

    await tx.cashVoucherDetail.createMany({
      data: details.map((line, index) => ({
        voucherId,
        companyId,
        branchUnitId,
        lineNumber: line.input.lineNumber || index + 1,
        accountId: line.account?.id ?? parseOptionalPositiveBigIntId(line.input.accountId) ?? null,
        accountCodeSnapshot: (line.account?.accountCode || line.input.accountCode || '').trim(),
        accountTitleSnapshot: (line.account?.accountTitle || line.input.accountTitle || '').trim(),
        particulars: cleanOptional(line.input.particulars),
        remarks: cleanOptional(line.input.remarks),
        debit: new Prisma.Decimal(String(line.input.debit || 0)),
        credit: new Prisma.Decimal(String(line.input.credit || 0)),
        grossAmount: new Prisma.Decimal(String(line.input.grossAmount || line.input.debit || 0)),
        netAmount: new Prisma.Decimal(String(line.input.netAmount || line.input.debit || 0)),
        vatType: cleanOptional(line.input.vatType),
        vatCode: cleanOptional(line.input.vatCode),
        vatPercent: new Prisma.Decimal(String(line.input.vatPercent || 0)),
        vatAmount: new Prisma.Decimal(String(line.input.vatAmount || 0)),
        ewtCode: cleanOptional(line.input.ewtCode),
        ewtPercent: new Prisma.Decimal(String(line.input.ewtPercent || 0)),
        ewtAmount: new Prisma.Decimal(String(line.input.ewtAmount || 0)),
        disburseAmount: new Prisma.Decimal(String(line.input.disburseAmount || line.input.debit || 0)),
        partyId: line.party?.id ?? parseOptionalPositiveBigIntId(line.input.partyId) ?? null,
        partyCodeSnapshot: cleanOptional(line.input.partyCode) || line.party?.partyCodeNo || null,
        partyNameSnapshot: cleanOptional(line.input.partyName) || (line.party ? this.getPartyName(line.party) : null),
        responsibilityCenterId: line.responsibilityCenter?.id ?? parseOptionalPositiveBigIntId(line.input.responsibilityCenterId) ?? null,
        responsibilityCenterSnapshot: cleanOptional(line.input.responsibilityCenter) || line.responsibilityCenter?.name || null,
        refId: cleanOptional(line.input.refId),
        checkDate: line.input.checkDate ? new Date(line.input.checkDate) : null,
        checkNo: cleanOptional(line.input.checkNo),
        checkStatus: cleanOptional(line.input.checkStatus),
      })),
    });
  }

  private async replaceJournalEntries(
    tx: Prisma.TransactionClient,
    voucherId: bigint,
    companyId: number,
    branchUnitId: number | null,
    currencyCode: string,
    exchangeRate: number,
    particulars: string | null,
    journalEntries: ResolvedJournalEntry[],
  ) {
    await tx.journalEntryHeader.deleteMany({
      where: {
        companyId,
        referenceId: voucherId,
        referenceType: CashVoucherReferenceType,
      },
    });

    if (journalEntries.length === 0 || !branchUnitId) {
      return;
    }

    const jeno = await this.allocateJournalEntryNumber(tx, companyId);
    const totalDebit = journalEntries.reduce((sum, item) => sum + Number(item.input.debit || 0), 0);
    const totalCredit = journalEntries.reduce((sum, item) => sum + Number(item.input.credit || 0), 0);

    await tx.journalEntryHeader.create({
      data: {
        companyId,
        branchUnitId,
        currencyCode,
        exchangeRate: new Prisma.Decimal(String(exchangeRate)),
        jeno,
        particulars,
        referenceId: voucherId,
        referenceType: CashVoucherReferenceType,
        transactionDate: new Date(),
        totalCredit: new Prisma.Decimal(String(roundCurrency(totalCredit))),
        totalDebit: new Prisma.Decimal(String(roundCurrency(totalDebit))),
        details: {
          create: journalEntries.map((item, index) => ({
            companyId,
            lineNumber: item.input.lineNumber || index + 1,
            accountId: item.account.id,
            accountCodeSnapshot: item.account.accountCode,
            accountTitleSnapshot: item.account.accountTitle,
            particulars: cleanOptional(item.input.particulars),
            debit: new Prisma.Decimal(String(item.input.debit || 0)),
            credit: new Prisma.Decimal(String(item.input.credit || 0)),
            vatType: cleanOptional(item.input.vatType),
            atcCode: cleanOptional(item.input.atcCode),
            partyCodeSnapshot: cleanOptional(item.input.partyCode) || item.party?.partyCodeNo || null,
            partyNameSnapshot: cleanOptional(item.input.partyName) || (item.party ? this.getPartyName(item.party) : null),
            responsibilityCenterId: item.responsibilityCenter?.id ?? null,
            responsibilityCenterSnapshot: cleanOptional(item.input.responsibilityCenter) || item.responsibilityCenter?.name || null,
            refNo: cleanOptional(item.input.refNo),
          })),
        },
      },
    });
  }

  private async allocateJournalEntryNumber(tx: Prisma.TransactionClient, companyId: number): Promise<bigint> {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${JournalEntryNumberAdvisoryLockNamespace}::int, ${companyId}::int)`);

    const latest = await tx.journalEntryHeader.findFirst({
      where: { companyId },
      orderBy: { jeno: 'desc' },
      select: { jeno: true },
    });

    return (latest?.jeno ?? 0n) + 1n;
  }

  private async normalizeVoucherInput(companyId: number, dto: Partial<CreateCashVoucherDto>) {
    const currencyCode = cleanCurrencyCode(dto.currencyCode || dto.currency) || (await this.companyCurrencyService.getBaseCurrencyCode(companyId)) || 'PHP';
    const exchangeRate = Number(dto.exchangeRate || dto.fxRate || 1.0);
    const voucherDateStr = dto.voucherDate || dto.documentDate || new Date().toISOString().slice(0, 10);
    const voucherDate = new Date(voucherDateStr);
    const dueDateStr = dto.paymentDueDate || dto.dueDate;
    const paymentDueDate = dueDateStr ? new Date(dueDateStr) : null;

    let amount = Number(dto.amount || 0);
    if (!amount && dto.details && dto.details.length > 0) {
      amount = dto.details.reduce((sum, d) => sum + Number(d.grossAmount || d.debit || d.disburseAmount || 0), 0);
    }

    return {
      amount: roundCurrency(amount),
      currencyCode,
      exchangeRate,
      paymentDueDate,
      voucherDate,
    };
  }

  private async resolveVoucherReferences(
    tx: PrismaWriteClient,
    companyId: number,
    dto: Partial<CreateCashVoucherDto>,
    options: { requireDetailAccounts?: boolean } = {},
  ): Promise<ResolvedVoucherReferences> {
    let party: PartyWithAddresses | null = null;
    if (dto.partyId || dto.partyCode) {
      party = await this.resolveParty(tx, companyId, { partyCode: dto.partyCode, partyId: dto.partyId, required: false });
    }

    let creditAccount: ChartAccount | null = null;
    if (dto.creditAccountId || dto.creditAccountCode) {
      creditAccount = await this.resolvePostingAccount(tx, companyId, {
        accountCode: dto.creditAccountCode,
        accountId: dto.creditAccountId,
        label: 'Credit account',
        required: false,
      });
    }

    const details: ResolvedDetailLine[] = [];
    if (dto.details && dto.details.length > 0) {
      for (const line of dto.details) {
        const account = await this.resolvePostingAccount(tx, companyId, {
          accountCode: line.accountCode,
          accountId: line.accountId,
          label: `Detail line ${line.lineNumber} account`,
          required: options.requireDetailAccounts,
        });

        const lineParty =
          line.partyId || line.partyCode ? await this.resolveParty(tx, companyId, { partyCode: line.partyCode, partyId: line.partyId, required: false }) : null;

        const responsibilityCenter =
          line.responsibilityCenterId || line.responsibilityCenter
            ? await this.resolveResponsibilityCenter(tx, companyId, {
                code: line.responsibilityCenter,
                id: line.responsibilityCenterId,
              })
            : null;

        details.push({
          account,
          input: line,
          party: lineParty,
          responsibilityCenter,
        });
      }
    }

    const journalEntries: ResolvedJournalEntry[] = [];
    if (dto.journalEntries && dto.journalEntries.length > 0) {
      for (const entry of dto.journalEntries) {
        const account = await this.resolvePostingAccount(tx, companyId, {
          accountCode: entry.accountCode,
          accountId: entry.accountId,
          label: `Journal line ${entry.lineNumber} account`,
          required: true,
        });

        const entryParty = entry.partyCode ? await this.resolveParty(tx, companyId, { partyCode: entry.partyCode, required: false }) : null;

        const responsibilityCenter =
          entry.responsibilityCenterId || entry.responsibilityCenter
            ? await this.resolveResponsibilityCenter(tx, companyId, {
                code: entry.responsibilityCenter,
                id: entry.responsibilityCenterId,
              })
            : null;

        if (account) {
          journalEntries.push({
            account,
            input: entry,
            party: entryParty,
            responsibilityCenter,
          });
        }
      }
    }

    return {
      creditAccount,
      details,
      journalEntries,
      party,
    };
  }

  private async resolveParty(
    tx: PrismaWriteClient,
    companyId: number,
    { partyCode, partyId, required = false }: { partyCode?: string | null; partyId?: string | null; required?: boolean },
  ): Promise<PartyWithAddresses | null> {
    const parsedPartyId = parseOptionalPositiveBigIntId(partyId);
    const normalizedPartyCode = partyCode?.trim();

    if (!parsedPartyId && !normalizedPartyCode) {
      if (required) throw new BadRequestException('Party is required.');
      return null;
    }

    const party = await tx.party.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        ...(parsedPartyId ? { id: parsedPartyId } : { partyCodeNo: normalizedPartyCode }),
      },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
        },
      },
    });

    if (!party && required) {
      throw new BadRequestException('Selected party was not found or is inactive.');
    }

    return party;
  }

  private async resolvePostingAccount(
    tx: PrismaWriteClient,
    companyId: number,
    { accountCode, accountId, label, required = false }: { accountCode?: string | null; accountId?: string | null; label: string; required?: boolean },
  ): Promise<ChartAccount | null> {
    const parsedAccountId = parseOptionalPositiveBigIntId(accountId);
    const normalizedAccountCode = accountCode?.trim();

    if (!parsedAccountId && !normalizedAccountCode) {
      if (required) throw new BadRequestException(`${label} is required.`);
      return null;
    }

    const account = await tx.chartAccount.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
        ...(parsedAccountId ? { id: parsedAccountId } : { accountCode: normalizedAccountCode }),
      },
    });

    if (!account && required) {
      throw new BadRequestException(`${label} was not found or is inactive.`);
    }

    return account;
  }

  private async resolveResponsibilityCenter(
    tx: PrismaWriteClient,
    companyId: number,
    { code, id }: { code?: string | null; id?: string | null },
  ): Promise<ResponsibilityCenter | null> {
    const parsedId = parseOptionalPositiveBigIntId(id);
    const normalizedCode = code?.trim();

    if (!parsedId && !normalizedCode) {
      return null;
    }

    return tx.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(parsedId ? { id: parsedId } : { code: normalizedCode }),
      },
    });
  }

  private async resolveTransactionNumberForCreate(
    tx: Prisma.TransactionClient,
    { branchUnitId, companyId, requestedTransactionNo }: { branchUnitId: number; companyId: number; requestedTransactionNo?: string | null },
  ) {
    const transactionNumber = await resolveTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: CashVoucherModuleCode,
      requestedTransactionNumber: cleanOptional(requestedTransactionNo),
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(tx, companyId, branchUnitId, transactionNo, context.scope),
    });

    return transactionNumber;
  }

  private async resolveTransactionNumberForUpdate(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      currentTransactionNo,
      excludedVoucherId,
      requestedTransactionNo,
    }: {
      branchUnitId: number;
      companyId: number;
      currentTransactionNo: string;
      excludedVoucherId: bigint;
      requestedTransactionNo?: string | null;
    },
  ) {
    const normalizedRequested = cleanOptional(requestedTransactionNo);
    if (!normalizedRequested || normalizedRequested === currentTransactionNo) {
      return currentTransactionNo;
    }

    const sequenceScope = await resolveTransactionNumberScopeForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: CashVoucherModuleCode,
    });

    const isDuplicate = await this.isTransactionNoIssued(tx, companyId, branchUnitId, normalizedRequested, sequenceScope.scope, excludedVoucherId);

    if (isDuplicate) {
      throw new ConflictException(`Transaction number "${normalizedRequested}" is already in use.`);
    }

    return normalizedRequested;
  }

  private async isTransactionNoIssued(
    tx: PrismaWriteClient,
    companyId: number,
    branchUnitId: number | null,
    transactionNo: string,
    scope: 'all' | 'branch' = 'branch',
    excludedVoucherId?: bigint,
  ) {
    const existing = await tx.cashVoucher.findFirst({
      where: {
        companyId,
        ...(scope === 'branch' && branchUnitId ? { branchUnitId } : {}),
        voucherNo: transactionNo,
        ...(excludedVoucherId ? { id: { not: excludedVoucherId } } : {}),
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  private async resolveBranchUnitId(companyId: number, requestedBranchUnitId?: number | null): Promise<number> {
    const branch = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(requestedBranchUnitId ? { id: requestedBranchUnitId } : {}),
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new BadRequestException('Select an active branch.');
    }

    return branch.id;
  }

  private normalizeStatus(statusInput?: string): CashVoucherStatus {
    if (!statusInput?.trim()) {
      return CashVoucherStatus.DRAFT;
    }

    const normalized = statusInput
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    if (normalized === 'FOR_APPROVAL' || normalized === 'FORAPPROVAL') return CashVoucherStatus.FOR_APPROVAL;
    if (normalized === 'APPROVED') return CashVoucherStatus.APPROVED;
    if (normalized === 'POSTED') return CashVoucherStatus.POSTED;
    if (normalized === 'DISAPPROVED') return CashVoucherStatus.DISAPPROVED;
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return CashVoucherStatus.CANCELLED;
    if (normalized === 'CLOSED') return CashVoucherStatus.CLOSED;

    return CashVoucherStatus.DRAFT;
  }

  private requiresSubmissionValidation(status: CashVoucherStatus) {
    return status !== CashVoucherStatus.DRAFT && status !== CashVoucherStatus.CANCELLED && status !== CashVoucherStatus.DISAPPROVED;
  }

  private validateSubmittedHeader(dto: Pick<Partial<CreateCashVoucherDto>, 'partyCode' | 'partyName'>) {
    if (!dto.partyCode?.trim()) {
      throw new BadRequestException('Party code is required before submission.');
    }

    if (!dto.partyName?.trim()) {
      throw new BadRequestException('Party name is required before submission.');
    }
  }

  private getPartyName(
    party: {
      classification?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      middleName?: string | null;
      partyName?: string | null;
      suffixName?: string | null;
      tradeName?: string | null;
    },
    fallback?: string | null,
  ) {
    if (party.tradeName?.trim()) return party.tradeName.trim();
    if (party.partyName?.trim()) return party.partyName.trim();

    const parts = [party.firstName, party.middleName, party.lastName, party.suffixName].filter(Boolean).map((p) => p!.trim());
    if (parts.length > 0) return parts.join(' ');

    return fallback?.trim() || 'Unnamed Party';
  }

  private getActiveCompanyId(user: AuthUser): number {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }
    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${CashVoucherModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage cash vouchers.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canApprove: this.can(user, companyId, PermissionAction.UPDATE),
      canCancel: this.can(user, companyId, PermissionAction.CANCEL),
      canClose: this.can(user, companyId, PermissionAction.UPDATE),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canDisapprove: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canView: this.can(user, companyId, PermissionAction.VIEW),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${CashVoucherModuleCode}:${action}`);
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('A Cash Voucher with this transaction number already exists.');
      }
    }
  }
}
