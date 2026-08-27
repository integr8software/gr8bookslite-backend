import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChartAccount,
  ChartAccountStatus,
  CompanyUnitType,
  JournalVoucherStatus,
  Party,
  PartyClassification,
  PartyStatus,
  Prisma,
  ResponsibilityCenter,
  ResponsibilityCenterStatus,
  TransactionNumberInputMode,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { canAccessModuleAction, ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { cleanCurrencyCode, cleanOptional, normalizeIdentityValue } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  findTransactionNumberForCompanyBranch,
  resolveTransactionNumberForCompanyBranch,
  resolveTransactionNumberScopeForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreateJournalVoucherDto } from './dto/create-journal-voucher.dto';
import { GetJournalVoucherListQueryDto } from './dto/get-journal-voucher-list-query.dto';
import { JournalVoucherLineDto } from './dto/journal-voucher-line.dto';
import { UpdateJournalVoucherStatusDto } from './dto/update-journal-voucher-status.dto';
import { UpdateJournalVoucherDto } from './dto/update-journal-voucher.dto';
import { mapJournalVoucher, mapJournalVoucherListItem } from './mappers/journal-voucher.mapper';
import { JournalVoucherInclude } from './prisma/journal-voucher.include';
import { JournalVoucherAccountingService } from './services/journal-voucher-accounting.service';
import type {
  JournalVoucherBase,
  JournalVoucherJournalEntry,
  JournalVoucherListRow,
  JournalVoucherWithEntries,
} from './types/journal-voucher-with-entries.type';
import { getJournalVoucherTotals, roundCurrency } from './utils/journal-voucher-totals.util';

const JournalVoucherModuleCode = 'JV';
const JournalVoucherReferenceType = 'JV';
const JournalEntryNumberAdvisoryLockNamespace = 7082;

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

type ResolvedJournalVoucherLine = {
  account: ChartAccount;
  input: JournalVoucherLineDto;
  party: Party | null;
  responsibilityCenter: ResponsibilityCenter | null;
};

@Injectable()
export class JournalVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCurrencyService: CompanyCurrencyService,
    private readonly accountingService: JournalVoucherAccountingService,
  ) {}

  async findAll(user: AuthUser, query: GetJournalVoucherListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.VIEW, 'You do not have permission to view journal vouchers.');

    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = await this.buildListWhere(companyId, branchUnitId, query);
    const orderBy = this.buildOrderBy(query);

    const [voucherRows, total, statistics] = await Promise.all([
      this.findListRows(where, orderBy, page, limit, skip),
      this.prisma.journalVoucher.count({ where }),
      this.getStatistics(companyId, branchUnitId),
    ]);

    return {
      vouchers: voucherRows.map(mapJournalVoucherListItem),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string, requestedBranchUnitId?: number) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.VIEW, 'You do not have permission to view journal vouchers.');

    const branchUnitId = requestedBranchUnitId ? await this.resolveBranchUnitId(companyId, requestedBranchUnitId) : undefined;
    const voucher = await this.findVoucherOrThrow(companyId, parsePositiveBigIntId(id), branchUnitId);
    const withEntries = (await this.attachJournalEntries([voucher]))[0];

    return {
      voucher: await this.mapVoucherWithAuditUsers(withEntries),
      permissions: this.getPermissions(user, companyId),
    };
  }

  async suggestTransactionNumber(user: AuthUser, requestedBranchUnitId?: number) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.CREATE, 'You do not have permission to create journal vouchers.');

    const branchUnitId = await this.resolveBranchUnitId(companyId, requestedBranchUnitId);
    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: JournalVoucherModuleCode,
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(this.prisma, companyId, branchUnitId, transactionNo, context.scope),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      moduleCode: suggestion.moduleCode,
      sequenceId: suggestion.sequenceId,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreateJournalVoucherDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.CREATE, 'You do not have permission to create journal vouchers.');

    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const normalized = await this.normalizeVoucherInput(companyId, dto);
    this.accountingService.validateSubmittedPayload({
      currencyCode: normalized.currencyCode,
      exchangeRate: normalized.exchangeRate,
      lines: dto.lines,
    });

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const lines = await this.resolveJournalVoucherLines(tx, companyId, dto.lines);
        const transactionNo = await this.resolveTransactionNumberForCreate(tx, {
          branchUnitId,
          companyId,
          requestedTransactionNo: dto.transactionNo,
        });

        const created = await tx.journalVoucher.create({
          data: {
            branchUnitId,
            companyId,
            currencyCode: normalized.currencyCode,
            createdByUserId: user.id,
            documentDate: normalized.documentDate,
            exchangeRate: normalized.exchangeRate,
            remarks: normalized.remarks,
            status: JournalVoucherStatus.DRAFT,
            transactionNo,
          },
          include: JournalVoucherInclude,
        });

        await this.replaceJournalEntries(tx, {
          branchUnitId,
          companyId,
          currencyCode: normalized.currencyCode,
          documentDate: normalized.documentDate,
          exchangeRate: normalized.exchangeRate,
          lines,
          remarks: normalized.remarks,
          status: JournalVoucherStatus.DRAFT,
          transactionNo,
          voucherId: created.id,
        });

        const saved = await tx.journalVoucher.findUniqueOrThrow({
          where: { id: created.id },
          include: JournalVoucherInclude,
        });

        return (await this.attachJournalEntries([saved], tx))[0];
      });

      return {
        message: 'Journal voucher created successfully.',
        voucher: await this.mapVoucherWithAuditUsers(voucher),
        permissions: this.getPermissions(user, companyId),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateJournalVoucherDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.UPDATE, 'You do not have permission to update journal vouchers.');

    const voucherId = parsePositiveBigIntId(id);
    const current = await this.findVoucherOrThrow(companyId, voucherId);

    if (current.status !== JournalVoucherStatus.DRAFT && current.status !== JournalVoucherStatus.FOR_APPROVAL) {
      throw new BadRequestException('Only draft or for-approval journal vouchers can be edited.');
    }

    if (dto.branchUnitId !== undefined && dto.branchUnitId !== current.branchUnitId) {
      throw new BadRequestException('Journal voucher branch cannot be changed after creation.');
    }

    const normalized = await this.normalizeVoucherInput(companyId, dto);
    this.accountingService.validateSubmittedPayload({
      currencyCode: normalized.currencyCode,
      exchangeRate: normalized.exchangeRate,
      lines: dto.lines,
    });

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const lines = await this.resolveJournalVoucherLines(tx, companyId, dto.lines);
        const transactionNo = await this.resolveTransactionNumberForUpdate(tx, {
          branchUnitId: current.branchUnitId,
          companyId,
          currentTransactionNo: current.transactionNo,
          excludedVoucherId: voucherId,
          requestedTransactionNo: dto.transactionNo,
        });

        await tx.journalVoucher.update({
          where: { id: voucherId },
          data: {
            currencyCode: normalized.currencyCode,
            documentDate: normalized.documentDate,
            exchangeRate: normalized.exchangeRate,
            remarks: normalized.remarks,
            transactionNo,
            updatedByUserId: user.id,
          },
        });

        await this.replaceJournalEntries(tx, {
          branchUnitId: current.branchUnitId,
          companyId,
          currencyCode: normalized.currencyCode,
          documentDate: normalized.documentDate,
          exchangeRate: normalized.exchangeRate,
          lines,
          remarks: normalized.remarks,
          status: current.status,
          transactionNo,
          voucherId,
        });

        const saved = await tx.journalVoucher.findUniqueOrThrow({
          where: { id: voucherId },
          include: JournalVoucherInclude,
        });

        return (await this.attachJournalEntries([saved], tx))[0];
      });

      return {
        message: 'Journal voucher updated successfully.',
        voucher: await this.mapVoucherWithAuditUsers(voucher),
        permissions: this.getPermissions(user, companyId),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateJournalVoucherStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const targetStatus = this.normalizeStatus(dto.status);
    const voucherId = parsePositiveBigIntId(id);
    const current = await this.findVoucherOrThrow(companyId, voucherId);
    const requiredAction =
      targetStatus === JournalVoucherStatus.CANCELLED
        ? PermissionAction.CANCEL
        : current.status === JournalVoucherStatus.CANCELLED && targetStatus === JournalVoucherStatus.FOR_APPROVAL
          ? PermissionAction.UNCANCEL
          : PermissionAction.UPDATE;
    ensureModuleAction(user, companyId, JournalVoucherModuleCode, requiredAction, 'You do not have permission to change journal voucher status.');

    if (current.status === targetStatus) {
      const withEntries = (await this.attachJournalEntries([current]))[0];

      return {
        message: 'Journal voucher status is already up to date.',
        voucher: await this.mapVoucherWithAuditUsers(withEntries),
        permissions: this.getPermissions(user, companyId),
      };
    }

    this.ensureStatusTransitionAllowed(current.status, targetStatus);

    const voucher = await this.prisma.$transaction(async (tx) => {
      const currentInTransaction = await tx.journalVoucher.findFirst({
        where: { id: voucherId, companyId },
        include: JournalVoucherInclude,
      });

      if (!currentInTransaction) {
        throw new NotFoundException('Journal voucher not found.');
      }

      const withEntries = (await this.attachJournalEntries([currentInTransaction], tx))[0];

      if (targetStatus === JournalVoucherStatus.POSTED) {
        this.accountingService.validatePersistedPayload(withEntries.journalEntries);
      }

      const updated = await tx.journalVoucher.update({
        where: { id: voucherId },
        data: {
          ...this.getStatusAuditData(targetStatus, user.id),
          status: targetStatus,
          updatedByUserId: user.id,
        },
        include: JournalVoucherInclude,
      });

      await tx.journalEntryHeader.updateMany({
        where: {
          companyId,
          referenceId: voucherId,
          referenceType: JournalVoucherReferenceType,
        },
        data: { status: this.getJournalEntryStatus(targetStatus) },
      });

      return (await this.attachJournalEntries([updated], tx))[0];
    });

    return {
      message: 'Journal voucher status updated successfully.',
      voucher: await this.mapVoucherWithAuditUsers(voucher),
      permissions: this.getPermissions(user, companyId),
    };
  }

  private async findListRows(
    where: Prisma.JournalVoucherWhereInput,
    orderBy: Prisma.JournalVoucherOrderByWithRelationInput[],
    page: number,
    limit: number,
    skip: number,
  ): Promise<JournalVoucherListRow[]> {
    const totalSort = orderBy.some((item) => 'totalDebit' in item || 'totalCredit' in item);

    if (!totalSort) {
      const rows = await this.prisma.journalVoucher.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: JournalVoucherInclude,
      });

      return this.attachJournalSummaries(rows);
    }

    const candidates = await this.prisma.journalVoucher.findMany({
      where,
      select: { id: true },
    });
    const candidateIds = candidates.map((candidate) => candidate.id);

    if (candidateIds.length === 0) {
      return [];
    }

    const totalSortField = orderBy.find((item) => 'totalDebit' in item || 'totalCredit' in item);
    const totalSortKey = totalSortField && 'totalCredit' in totalSortField ? 'totalCredit' : 'totalDebit';
    const totalSortDirection: Prisma.SortOrder =
      (totalSortField && 'totalCredit' in totalSortField && totalSortField.totalCredit === 'asc') ||
      (totalSortField && 'totalDebit' in totalSortField && totalSortField.totalDebit === 'asc')
        ? 'asc'
        : 'desc';
    const totalSortItem: Prisma.JournalEntryHeaderOrderByWithRelationInput =
      totalSortKey === 'totalCredit' ? { totalCredit: totalSortDirection } : { totalDebit: totalSortDirection };
    const referenceSort: Prisma.SortOrder = orderBy.find((item) => 'id' in item)?.id === 'asc' ? 'asc' : 'desc';
    const companyId = typeof where.companyId === 'number' ? where.companyId : undefined;
    const branchUnitId = typeof where.branchUnitId === 'number' ? where.branchUnitId : undefined;
    const headers = await this.prisma.journalEntryHeader.findMany({
      where: {
        ...(companyId !== undefined ? { companyId } : {}),
        ...(branchUnitId !== undefined ? { branchUnitId } : {}),
        referenceId: { in: candidateIds },
        referenceType: JournalVoucherReferenceType,
      },
      orderBy: [totalSortItem, { referenceId: referenceSort }],
      select: { referenceId: true },
      skip,
      take: limit,
    });
    const pageIds = headers.map((header) => header.referenceId);
    const rows = await this.prisma.journalVoucher.findMany({
      where: {
        ...(companyId !== undefined ? { companyId } : {}),
        ...(branchUnitId !== undefined ? { branchUnitId } : {}),
        id: { in: pageIds },
      },
      include: JournalVoucherInclude,
    });
    const rowById = new Map(rows.map((row) => [row.id.toString(), row]));
    const orderedRows = pageIds.map((id) => rowById.get(id.toString())).filter((row): row is (typeof rows)[number] => Boolean(row));

    return this.attachJournalSummaries(orderedRows);
  }

  private async attachJournalSummaries<T extends JournalVoucherBase>(vouchers: T[], client: PrismaWriteClient = this.prisma) {
    if (vouchers.length === 0) {
      return [] as Array<T & { totalDebit: Prisma.Decimal | number; totalCredit: Prisma.Decimal | number }>;
    }

    const headers = await client.journalEntryHeader.findMany({
      where: {
        companyId: vouchers[0].companyId,
        referenceId: { in: vouchers.map((voucher) => voucher.id) },
        referenceType: JournalVoucherReferenceType,
      },
      select: {
        referenceId: true,
        totalCredit: true,
        totalDebit: true,
      },
    });
    const headerByReferenceId = new Map(headers.map((header) => [header.referenceId.toString(), header]));

    return vouchers.map((voucher) => {
      const header = headerByReferenceId.get(voucher.id.toString());

      return {
        ...voucher,
        totalCredit: header?.totalCredit ?? 0,
        totalDebit: header?.totalDebit ?? 0,
      };
    });
  }

  private async attachJournalEntries<T extends JournalVoucherBase>(
    vouchers: T[],
    client: PrismaWriteClient = this.prisma,
  ): Promise<Array<T & JournalVoucherWithEntries>> {
    if (vouchers.length === 0) {
      return [];
    }

    const headers = await client.journalEntryHeader.findMany({
      where: {
        companyId: vouchers[0].companyId,
        referenceId: { in: vouchers.map((voucher) => voucher.id) },
        referenceType: JournalVoucherReferenceType,
      },
      include: {
        details: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });
    const headerByReferenceId = new Map(headers.map((header) => [header.referenceId.toString(), header]));

    return vouchers.map((voucher) => {
      const header = headerByReferenceId.get(voucher.id.toString());
      const journalEntries: JournalVoucherJournalEntry[] = header
        ? header.details.map((entry) => ({
            ...entry,
            currencyCode: header.currencyCode,
            exchangeRate: header.exchangeRate,
            particulars: entry.particulars ?? header.particulars,
            referenceId: header.referenceId,
            referenceNo: header.referenceNo,
            referenceType: header.referenceType,
          }))
        : [];

      return {
        ...voucher,
        journalEntries,
        totalCredit: header?.totalCredit ?? 0,
        totalDebit: header?.totalDebit ?? 0,
      };
    });
  }

  private async buildListWhere(companyId: number, branchUnitId: number, query: GetJournalVoucherListQueryDto): Promise<Prisma.JournalVoucherWhereInput> {
    const search = query.search?.trim();
    const documentDateFrom = query.documentDateFrom ? this.parseDate(query.documentDateFrom, 'documentDateFrom') : undefined;
    const documentDateTo = query.documentDateTo ? this.parseDate(query.documentDateTo, 'documentDateTo', true) : undefined;

    if (query.amountFrom !== undefined && query.amountTo !== undefined && query.amountFrom > query.amountTo) {
      throw new BadRequestException('Amount from cannot be greater than amount to.');
    }

    const baseWhere: Prisma.JournalVoucherWhereInput = {
      branchUnitId,
      companyId,
      ...(query.status ? { status: this.normalizeStatus(query.status) } : {}),
      ...(documentDateFrom || documentDateTo
        ? {
            documentDate: {
              ...(documentDateFrom ? { gte: documentDateFrom } : {}),
              ...(documentDateTo ? { lte: documentDateTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [{ transactionNo: { contains: search, mode: 'insensitive' } }, { remarks: { contains: search, mode: 'insensitive' } }],
          }
        : {}),
    };

    if (query.amountFrom === undefined && query.amountTo === undefined) {
      return baseWhere;
    }

    const headers = await this.prisma.journalEntryHeader.findMany({
      where: {
        branchUnitId,
        companyId,
        referenceType: JournalVoucherReferenceType,
        totalDebit: {
          ...(query.amountFrom !== undefined ? { gte: query.amountFrom } : {}),
          ...(query.amountTo !== undefined ? { lte: query.amountTo } : {}),
        },
      },
      select: { referenceId: true },
    });

    return {
      ...baseWhere,
      id: { in: headers.map((header) => header.referenceId) },
    };
  }

  private buildOrderBy(query: GetJournalVoucherListQueryDto): Prisma.JournalVoucherOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'documentDate';
    const sortDirection = query.sortDirection ?? 'desc';

    if (sortBy === 'totalDebit' || sortBy === 'totalCredit') {
      return [{ [sortBy]: sortDirection }, { id: 'desc' }] as Prisma.JournalVoucherOrderByWithRelationInput[];
    }

    return [{ [sortBy]: sortDirection }, { id: 'desc' }] as Prisma.JournalVoucherOrderByWithRelationInput[];
  }

  private async getStatistics(companyId: number, branchUnitId: number) {
    const groups = await this.prisma.journalVoucher.groupBy({
      by: ['status'],
      where: { branchUnitId, companyId },
      _count: { _all: true },
    });
    const statistics = {
      cancelledVouchers: 0,
      disapprovedVouchers: 0,
      draftVouchers: 0,
      forApprovalVouchers: 0,
      postedVouchers: 0,
      totalVouchers: 0,
    };

    for (const group of groups) {
      const count = group._count._all;
      statistics.totalVouchers += count;

      if (group.status === JournalVoucherStatus.CANCELLED) statistics.cancelledVouchers += count;
      if (group.status === JournalVoucherStatus.DISAPPROVED) statistics.disapprovedVouchers += count;
      if (group.status === JournalVoucherStatus.DRAFT) statistics.draftVouchers += count;
      if (group.status === JournalVoucherStatus.FOR_APPROVAL) statistics.forApprovalVouchers += count;
      if (group.status === JournalVoucherStatus.POSTED) statistics.postedVouchers += count;
    }

    return statistics;
  }

  private async mapVoucherWithAuditUsers(voucher: JournalVoucherWithEntries) {
    const userNames = await resolveAuditUserNames(this.prisma, [
      voucher.createdByUserId,
      voucher.updatedByUserId,
      voucher.submittedByUserId,
      voucher.postedByUserId,
      voucher.disapprovedByUserId,
      voucher.cancelledByUserId,
    ]);

    return mapJournalVoucher(voucher, userNames);
  }

  private async findVoucherOrThrow(companyId: number, voucherId: bigint, branchUnitId?: number) {
    const voucher = await this.prisma.journalVoucher.findFirst({
      where: {
        companyId,
        id: voucherId,
        ...(branchUnitId ? { branchUnitId } : {}),
      },
      include: JournalVoucherInclude,
    });

    if (!voucher) {
      throw new NotFoundException('Journal voucher not found.');
    }

    return voucher;
  }

  private async normalizeVoucherInput(companyId: number, dto: CreateJournalVoucherDto) {
    const currencyCode = cleanCurrencyCode(dto.currencyCode) ?? (await this.companyCurrencyService.getBaseCurrencyCode(companyId));

    if (!currencyCode || !/^[A-Z0-9]{3,10}$/.test(currencyCode)) {
      throw new BadRequestException('Currency is invalid.');
    }

    const exchangeRate = Number(dto.exchangeRate);

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new BadRequestException('Exchange rate must be greater than zero.');
    }

    return {
      currencyCode,
      documentDate: this.parseDate(dto.documentDate, 'documentDate'),
      exchangeRate: Number(exchangeRate.toFixed(6)),
      remarks: cleanOptional(dto.remarks),
    };
  }

  private async resolveJournalVoucherLines(
    tx: PrismaWriteClient,
    companyId: number,
    inputLines: JournalVoucherLineDto[],
  ): Promise<ResolvedJournalVoucherLine[]> {
    const lines: ResolvedJournalVoucherLine[] = [];

    for (const input of [...inputLines].sort((left, right) => left.lineNumber - right.lineNumber)) {
      const account = await this.resolvePostingAccount(tx, companyId, input);
      const party = await this.resolveParty(tx, companyId, input);
      const responsibilityCenter = await this.resolveResponsibilityCenter(tx, companyId, input);

      lines.push({ account, input, party, responsibilityCenter });
    }

    return lines;
  }

  private async resolvePostingAccount(tx: PrismaWriteClient, companyId: number, input: JournalVoucherLineDto) {
    const parsedAccountId = parseOptionalPositiveBigIntId(input.accountId, `Journal line ${input.lineNumber} account ID`);
    const normalizedCode = cleanOptional(input.accountCode);

    if (!parsedAccountId && !normalizedCode) {
      throw new BadRequestException(`Journal line ${input.lineNumber} account is required.`);
    }

    const account = await tx.chartAccount.findFirst({
      where: {
        companyId,
        deletedAt: null,
        isPostingAccount: true,
        status: ChartAccountStatus.ACTIVE,
        ...(parsedAccountId ? { id: parsedAccountId } : { accountCode: normalizedCode ?? '' }),
      },
    });

    if (!account) {
      throw new BadRequestException(`Journal line ${input.lineNumber} must use an active posting account from this company.`);
    }

    if (normalizedCode && account.accountCode.toLowerCase() !== normalizedCode.toLowerCase()) {
      throw new BadRequestException(`Journal line ${input.lineNumber} account code does not match the selected account.`);
    }

    return account;
  }

  private async resolveParty(tx: PrismaWriteClient, companyId: number, input: JournalVoucherLineDto) {
    const parsedPartyId = parseOptionalPositiveBigIntId(input.partyId, `Journal line ${input.lineNumber} party ID`);
    const normalizedCode = cleanOptional(input.partyCode);

    if (!parsedPartyId && !normalizedCode) {
      return null;
    }

    const party = await tx.party.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        ...(parsedPartyId ? { id: parsedPartyId } : { partyCodeNo: normalizedCode ?? '' }),
      },
    });

    if (!party) {
      throw new BadRequestException(`Journal line ${input.lineNumber} party is not active in this company.`);
    }

    if (normalizedCode && party.partyCodeNo.toLowerCase() !== normalizedCode.toLowerCase()) {
      throw new BadRequestException(`Journal line ${input.lineNumber} party code does not match the selected party.`);
    }

    return party;
  }

  private async resolveResponsibilityCenter(tx: PrismaWriteClient, companyId: number, input: JournalVoucherLineDto) {
    const parsedId = parseOptionalPositiveBigIntId(input.responsibilityCenterId, `Journal line ${input.lineNumber} responsibility center ID`);
    const normalizedName = cleanOptional(input.responsibilityCenter);

    if (!parsedId && !normalizedName) {
      return null;
    }

    const responsibilityCenter = await tx.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(parsedId ? { id: parsedId } : { name: normalizedName ?? '' }),
      },
    });

    if (!responsibilityCenter) {
      throw new BadRequestException(`Journal line ${input.lineNumber} responsibility center is not active in this company.`);
    }

    if (normalizedName && normalizeIdentityValue(responsibilityCenter.name) !== normalizeIdentityValue(normalizedName)) {
      throw new BadRequestException(`Journal line ${input.lineNumber} responsibility center does not match the selected center.`);
    }

    return responsibilityCenter;
  }

  private async replaceJournalEntries(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      currencyCode,
      documentDate,
      exchangeRate,
      lines,
      remarks,
      status,
      transactionNo,
      voucherId,
    }: {
      branchUnitId: number;
      companyId: number;
      currencyCode: string;
      documentDate: Date;
      exchangeRate: number;
      lines: ResolvedJournalVoucherLine[];
      remarks: string | null;
      status: JournalVoucherStatus;
      transactionNo: string;
      voucherId: bigint;
    },
  ) {
    await tx.journalEntryHeader.deleteMany({
      where: {
        companyId,
        referenceId: voucherId,
        referenceType: JournalVoucherReferenceType,
      },
    });

    const totals = getJournalVoucherTotals(lines.map(({ input }) => input));
    const jeno = await this.resolveNextJournalEntryNo(tx, companyId);

    await tx.journalEntryHeader.create({
      data: {
        branchUnitId,
        companyId,
        currencyCode,
        exchangeRate,
        jeno,
        particulars: remarks,
        referenceId: voucherId,
        referenceNo: transactionNo,
        referenceType: JournalVoucherReferenceType,
        status: this.getJournalEntryStatus(status),
        totalCredit: totals.credit,
        totalDebit: totals.debit,
        transactionDate: documentDate,
        details: {
          create: lines.map(({ account, input, party, responsibilityCenter }) => ({
            accountCodeSnapshot: account.accountCode,
            accountId: account.id,
            accountTitleSnapshot: account.accountTitle,
            atcCode: cleanOptional(input.atcCode),
            credit: roundCurrency(Number(input.credit || 0)),
            debit: roundCurrency(Number(input.debit || 0)),
            lineNumber: input.lineNumber,
            particulars: cleanOptional(input.particulars),
            partyCodeSnapshot: party?.partyCodeNo ?? cleanOptional(input.partyCode),
            partyNameSnapshot: party ? this.getPartyName(party, input.partyName) : cleanOptional(input.partyName),
            refNo: cleanOptional(input.refNo),
            responsibilityCenterId: responsibilityCenter?.id ?? null,
            responsibilityCenterSnapshot: responsibilityCenter?.name ?? null,
            vatType: cleanOptional(input.vatType),
          })),
        },
      },
    });
  }

  private async resolveNextJournalEntryNo(tx: Prisma.TransactionClient, companyId: number) {
    const lockKey = (BigInt(JournalEntryNumberAdvisoryLockNamespace) << 32n) + BigInt(companyId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const latest = await tx.journalEntryHeader.aggregate({
      where: { companyId },
      _max: { jeno: true },
    });

    return (latest._max.jeno ?? 0n) + 1n;
  }

  private async resolveTransactionNumberForCreate(
    tx: Prisma.TransactionClient,
    { branchUnitId, companyId, requestedTransactionNo }: { branchUnitId: number; companyId: number; requestedTransactionNo?: string | null },
  ) {
    return resolveTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: JournalVoucherModuleCode,
      requestedTransactionNumber: requestedTransactionNo,
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(tx, companyId, branchUnitId, transactionNo, context.scope),
    });
  }

  private async resolveTransactionNumberForUpdate(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      currentTransactionNo,
      excludedVoucherId,
      requestedTransactionNo,
    }: { branchUnitId: number; companyId: number; currentTransactionNo: string; excludedVoucherId: bigint; requestedTransactionNo?: string | null },
  ) {
    const nextTransactionNo = cleanOptional(requestedTransactionNo) ?? currentTransactionNo;

    if (nextTransactionNo === currentTransactionNo) {
      return currentTransactionNo;
    }

    const sequence = await findTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: JournalVoucherModuleCode,
    });

    if (sequence?.inputMode !== TransactionNumberInputMode.MANUAL) {
      throw new BadRequestException('JV transaction number is auto-generated for this branch and cannot be changed manually.');
    }

    const sequenceScope = await resolveTransactionNumberScopeForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: JournalVoucherModuleCode,
    });

    await this.ensureTransactionNoAvailable(tx, companyId, branchUnitId, nextTransactionNo, excludedVoucherId, sequenceScope.scope);
    return nextTransactionNo;
  }

  private async ensureTransactionNoAvailable(
    tx: PrismaWriteClient,
    companyId: number,
    branchUnitId: number,
    transactionNo: string,
    excludedVoucherId?: bigint,
    scope: 'all' | 'branch' = 'branch',
  ) {
    const existing = await tx.journalVoucher.findFirst({
      where: {
        ...(scope === 'branch' ? { branchUnitId } : {}),
        companyId,
        ...(excludedVoucherId ? { id: { not: excludedVoucherId } } : {}),
        transactionNo: { equals: transactionNo, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A journal voucher with this transaction number already exists for this branch.');
    }
  }

  private isTransactionNoIssued(tx: PrismaWriteClient, companyId: number, branchUnitId: number, transactionNo: string, scope: 'all' | 'branch' = 'branch') {
    return tx.journalVoucher
      .findFirst({
        where: {
          ...(scope === 'branch' ? { branchUnitId } : {}),
          companyId,
          transactionNo: { equals: transactionNo, mode: 'insensitive' },
        },
        select: { id: true },
      })
      .then(Boolean);
  }

  private async resolveBranchUnitId(companyId: number, branchUnitId?: number, tx: PrismaWriteClient = this.prisma) {
    const branch = await tx.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(branchUnitId ? { id: branchUnitId } : {}),
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException('Select an active branch.');
    }

    return branch.id;
  }

  private ensureStatusTransitionAllowed(currentStatus: JournalVoucherStatus, targetStatus: JournalVoucherStatus) {
    const allowedStatuses: Record<JournalVoucherStatus, JournalVoucherStatus[]> = {
      [JournalVoucherStatus.CANCELLED]: [JournalVoucherStatus.FOR_APPROVAL],
      [JournalVoucherStatus.DISAPPROVED]: [JournalVoucherStatus.FOR_APPROVAL],
      [JournalVoucherStatus.DRAFT]: [JournalVoucherStatus.CANCELLED, JournalVoucherStatus.FOR_APPROVAL],
      [JournalVoucherStatus.FOR_APPROVAL]: [JournalVoucherStatus.CANCELLED, JournalVoucherStatus.DISAPPROVED, JournalVoucherStatus.POSTED],
      [JournalVoucherStatus.POSTED]: [JournalVoucherStatus.FOR_APPROVAL],
    };

    if (!allowedStatuses[currentStatus].includes(targetStatus)) {
      throw new BadRequestException(`Cannot move JV from ${currentStatus} to ${targetStatus}.`);
    }
  }

  private getStatusAuditData(targetStatus: JournalVoucherStatus, userId: number): Prisma.JournalVoucherUncheckedUpdateInput {
    const now = new Date();
    const cleared = {
      cancelledAt: null,
      cancelledByUserId: null,
      disapprovedAt: null,
      disapprovedByUserId: null,
      postedAt: null,
      postedByUserId: null,
      submittedAt: null,
      submittedByUserId: null,
    } satisfies Prisma.JournalVoucherUncheckedUpdateInput;

    if (targetStatus === JournalVoucherStatus.FOR_APPROVAL) {
      return {
        ...cleared,
        submittedAt: now,
        submittedByUserId: userId,
      };
    }

    if (targetStatus === JournalVoucherStatus.POSTED) {
      return {
        ...cleared,
        postedAt: now,
        postedByUserId: userId,
      };
    }

    if (targetStatus === JournalVoucherStatus.DISAPPROVED) {
      return {
        ...cleared,
        disapprovedAt: now,
        disapprovedByUserId: userId,
      };
    }

    if (targetStatus === JournalVoucherStatus.CANCELLED) {
      return {
        ...cleared,
        cancelledAt: now,
        cancelledByUserId: userId,
      };
    }

    return cleared;
  }

  private normalizeStatus(status: string) {
    const normalized = status
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (!Object.values(JournalVoucherStatus).includes(normalized as JournalVoucherStatus)) {
      throw new BadRequestException('Invalid JV status.');
    }

    return normalized as JournalVoucherStatus;
  }

  private getJournalEntryStatus(status: JournalVoucherStatus) {
    return status.toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`);
  }

  private getPartyName(party: Party, fallback?: string | null) {
    const individualName = [party.firstName, party.middleName, party.lastName, party.suffixName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ');

    if (party.classification === PartyClassification.NON_INDIVIDUAL) {
      return cleanOptional(party.tradeName) ?? cleanOptional(party.partyName) ?? cleanOptional(fallback) ?? party.partyCodeNo;
    }

    return cleanOptional(individualName) ?? cleanOptional(party.partyName) ?? cleanOptional(fallback) ?? party.partyCodeNo;
  }

  private getPermissions(user: AuthUser, companyId: number) {
    const permissions = getModulePermissions(user, companyId, JournalVoucherModuleCode, { includeCancel: true });
    const canUpdate = canAccessModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.UPDATE);

    return {
      ...permissions,
      canApprove: canUpdate,
      canDisapprove: canUpdate,
      canPost: canUpdate,
      canSubmitForApproval: canUpdate,
      canUncancel: canAccessModuleAction(user, companyId, JournalVoucherModuleCode, PermissionAction.UNCANCEL),
    };
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A journal voucher with this transaction number already exists for this branch.');
    }
  }

  private parseDate(value: string, label: string, endOfDay = false) {
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }

    return date;
  }
}
