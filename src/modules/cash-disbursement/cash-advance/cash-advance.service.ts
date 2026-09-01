import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashAdvanceStatus, CompanyUnitType, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import {
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreateCashAdvanceDto } from './dto/create-cash-advance.dto';
import { GetCashAdvanceListQueryDto } from './dto/get-cash-advance-list-query.dto';
import { UpdateCashAdvanceStatusDto } from './dto/update-cash-advance-status.dto';
import { UpdateCashAdvanceDto } from './dto/update-cash-advance.dto';
import { mapCashAdvance } from './mappers/cash-advance.mapper';
import { CashAdvanceInclude, CashAdvanceWithPayload } from './prisma/cash-advance.include';

const CashAdvanceModuleCode = 'CA';
const CashAdvanceMultipleEntryPrefix = 'CAME-';

@Injectable()
export class CashAdvanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tablePreferencesService: TablePreferencesService,
  ) {}

  async findAll(user: AuthUser, query: GetCashAdvanceListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;

    const where: Prisma.CashAdvanceWhereInput = {
      companyId,
      deletedAt: null,
      NOT: { transNo: { startsWith: CashAdvanceMultipleEntryPrefix } },
    };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { transNo: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status?.trim()) {
      const statusUpper = query.status.trim().toUpperCase();
      if (Object.values(CashAdvanceStatus).includes(statusUpper as CashAdvanceStatus)) {
        where.status = statusUpper as CashAdvanceStatus;
      }
    }

    if (query.partyCode?.trim()) {
      where.partyCodeSnapshot = { equals: query.partyCode.trim(), mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      where.documentDate = {};
      if (query.startDate) where.documentDate.gte = new Date(query.startDate);
      if (query.endDate) where.documentDate.lte = new Date(query.endDate);
    }

    const orderByField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder || 'desc';
    const orderBy: Prisma.CashAdvanceOrderByWithRelationInput = {
      [orderByField]: sortDirection,
    };

    const [records, total] = await Promise.all([
      this.prisma.cashAdvance.findMany({
        where,
        include: CashAdvanceInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.cashAdvance.count({ where }),
    ]);

    const mapped = await this.mapWithAuditUsers(records);

    return {
      data: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async suggestTransactionNumber(user: AuthUser, requestedBranchUnitId?: number | string) {
    const companyId = this.getActiveCompanyId(user);
    const branchUnitId = await this.resolveBranchUnitId(companyId, requestedBranchUnitId);
    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: CashAdvanceModuleCode,
      isIssued: (transactionNo) =>
        this.prisma.cashAdvance
          .count({
            where: {
              companyId,
              transNo: transactionNo,
              deletedAt: null,
              NOT: { transNo: { startsWith: CashAdvanceMultipleEntryPrefix } },
            },
          })
          .then((count) => count > 0),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  private async resolveTransactionNoForCreate(dto: CreateCashAdvanceDto, companyId: number, branchUnitId: number) {
    return resolveTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: CashAdvanceModuleCode,
      requestedTransactionNumber: cleanOptional(dto.transNo),
      isIssued: (transactionNo) =>
        this.prisma.cashAdvance
          .count({
            where: {
              companyId,
              transNo: transactionNo,
              deletedAt: null,
              NOT: { transNo: { startsWith: CashAdvanceMultipleEntryPrefix } },
            },
          })
          .then((count) => count > 0),
    });
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id);
    const record = await this.prisma.cashAdvance.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: CashAdvanceInclude,
    });

    if (!record) {
      throw new NotFoundException('Cash Advance record not found.');
    }

    const mapped = (await this.mapWithAuditUsers([record]))[0];
    return { data: mapped };
  }

  async create(user: AuthUser, dto: CreateCashAdvanceDto) {
    const companyId = this.getActiveCompanyId(user);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);

    const partyCode = dto.partyCode?.trim() ?? '';
    const accountCode = dto.accountCode?.trim() ?? '';
    const party = dto.partyId
      ? await this.prisma.party.findFirst({
          where: { id: parsePositiveBigIntId(dto.partyId), companyId, deletedAt: null },
        })
      : partyCode
        ? await this.prisma.party.findFirst({
            where: { companyId, partyCodeNo: partyCode, deletedAt: null },
          })
        : null;

    const creditAccount = dto.creditAccountId
      ? await this.prisma.chartAccount.findFirst({
          where: { id: parsePositiveBigIntId(dto.creditAccountId), companyId, deletedAt: null },
        })
      : accountCode
        ? await this.prisma.chartAccount.findFirst({
            where: { companyId, accountCode, deletedAt: null },
          })
        : null;

    const transNo = await this.resolveTransactionNoForCreate(dto, companyId, branchUnitId);

    const record = await this.prisma.cashAdvance.create({
      data: {
        companyId,
        branchUnitId,
        partyId: party?.id ?? null,
        creditAccountId: creditAccount?.id ?? null,
        transNo,
        documentDate: new Date(dto.documentDate),
        dueDate: dto.documentDate ? new Date(dto.documentDate) : null,
        partyCodeSnapshot: partyCode,
        partyNameSnapshot: dto.partyName?.trim() ?? '',
        accountCodeSnapshot: accountCode,
        accountTitleSnapshot: cleanOptional(dto.accountTitle) || creditAccount?.accountTitle || null,
        costCenterSnapshot: cleanOptional(dto.costCenter),
        costCenterCodeSnapshot: cleanOptional(dto.costCenterCode),
        projectNameSnapshot: cleanOptional(dto.projectName) ?? cleanOptional(dto.projectRef),
        projectCodeSnapshot: cleanOptional(dto.projectCode),
        currencyCode: dto.currency?.trim() || 'PHP',
        exchangeRate: new Prisma.Decimal(dto.fxRate?.replaceAll(',', '').trim() || '1.0000'),
        amount: new Prisma.Decimal(dto.amount?.replaceAll(',', '').trim() || '0.00'),
        remarks: cleanOptional(dto.remarks),
        status: CashAdvanceStatus.DRAFT,
        createdByUserId: user.id,
      },
      include: CashAdvanceInclude,
    });

    const mapped = (await this.mapWithAuditUsers([record]))[0];
    return { message: 'Cash Advance created successfully.', data: mapped };
  }

  async update(user: AuthUser, id: string, dto: UpdateCashAdvanceDto) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashAdvance.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Cash Advance record not found.');
    }
    if (existing.status !== CashAdvanceStatus.DRAFT) {
      throw new BadRequestException('Only Draft Cash Advance records can be updated.');
    }

    const party = dto.partyId
      ? await this.prisma.party.findFirst({
          where: { id: parsePositiveBigIntId(dto.partyId), companyId, deletedAt: null },
        })
      : dto.partyCode
        ? await this.prisma.party.findFirst({
            where: { companyId, partyCodeNo: dto.partyCode.trim(), deletedAt: null },
          })
        : null;

    const creditAccount = dto.creditAccountId
      ? await this.prisma.chartAccount.findFirst({
          where: { id: parsePositiveBigIntId(dto.creditAccountId), companyId, deletedAt: null },
        })
      : dto.accountCode
        ? await this.prisma.chartAccount.findFirst({
            where: { companyId, accountCode: dto.accountCode.trim(), deletedAt: null },
          })
        : null;

    const updated = await this.prisma.cashAdvance.update({
      where: { id: recordId },
      data: {
        ...(party ? { partyId: party.id } : {}),
        ...(creditAccount ? { creditAccountId: creditAccount.id } : {}),
        ...(dto.partyCode ? { partyCodeSnapshot: dto.partyCode.trim() } : {}),
        ...(dto.partyName ? { partyNameSnapshot: dto.partyName.trim() } : {}),
        ...(dto.accountCode ? { accountCodeSnapshot: dto.accountCode.trim() } : {}),
        ...(dto.accountTitle !== undefined ? { accountTitleSnapshot: cleanOptional(dto.accountTitle) } : {}),
        ...(dto.costCenter !== undefined ? { costCenterSnapshot: cleanOptional(dto.costCenter) } : {}),
        ...(dto.costCenterCode !== undefined ? { costCenterCodeSnapshot: cleanOptional(dto.costCenterCode) } : {}),
        ...(dto.projectName !== undefined || dto.projectRef !== undefined
          ? { projectNameSnapshot: cleanOptional(dto.projectName) ?? cleanOptional(dto.projectRef) }
          : {}),
        ...(dto.projectCode !== undefined ? { projectCodeSnapshot: cleanOptional(dto.projectCode) } : {}),
        ...(dto.currency ? { currencyCode: dto.currency.trim() } : {}),
        ...(dto.fxRate ? { exchangeRate: new Prisma.Decimal(dto.fxRate.replaceAll(',', '').trim() || '1.0000') } : {}),
        ...(dto.amount ? { amount: new Prisma.Decimal(dto.amount.replaceAll(',', '').trim() || '0.00') } : {}),
        ...(dto.documentDate ? { documentDate: new Date(dto.documentDate), dueDate: new Date(dto.documentDate) } : {}),
        ...(dto.remarks !== undefined ? { remarks: cleanOptional(dto.remarks) } : {}),
        updatedByUserId: user.id,
      },
      include: CashAdvanceInclude,
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return { message: 'Cash Advance updated successfully.', data: mapped };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashAdvance.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Cash Advance record not found.');
    }

    await this.prisma.cashAdvance.update({
      where: { id: recordId },
      data: {
        deletedAt: new Date(),
        status: CashAdvanceStatus.CANCELLED,
        cancelledByUserId: user.id,
        cancelledAt: new Date(),
      },
    });

    return { message: 'Cash Advance record cancelled successfully.' };
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateCashAdvanceStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id);
    const existing = await this.prisma.cashAdvance.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: CashAdvanceInclude,
    });

    if (!existing) {
      throw new NotFoundException('Cash Advance record not found.');
    }

    if (this.isSubmittedStatus(dto.status)) {
      this.assertCashAdvanceReady(existing);
    }

    const actionDate = new Date();
    const updated = await this.prisma.cashAdvance.update({
      where: { id: recordId },
      data: {
        status: dto.status,
        updatedByUserId: user.id,
        ...(dto.status === CashAdvanceStatus.POSTED ? { postedByUserId: user.id, postedAt: actionDate } : {}),
        ...(dto.status === CashAdvanceStatus.DISAPPROVED ? { disapprovedByUserId: user.id, disapprovedAt: actionDate } : {}),
        ...(dto.status === CashAdvanceStatus.CANCELLED ? { cancelledByUserId: user.id, cancelledAt: actionDate } : {}),
      },
      include: CashAdvanceInclude,
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return { message: 'Cash Advance status updated successfully.', data: mapped };
  }

  async submitApproval(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashAdvance.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: CashAdvanceInclude,
    });

    if (!existing) {
      throw new NotFoundException('Cash Advance record not found.');
    }

    if (existing.status !== CashAdvanceStatus.DRAFT) {
      throw new BadRequestException('Only Draft records can be submitted for approval.');
    }
    this.assertCashAdvanceReady(existing);

    const updated = await this.prisma.cashAdvance.update({
      where: { id: recordId },
      data: {
        status: CashAdvanceStatus.FOR_APPROVAL,
        updatedByUserId: user.id,
      },
      include: CashAdvanceInclude,
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return { message: 'Cash Advance submitted for approval.', data: mapped };
  }

  private getActiveCompanyId(user: AuthUser): number {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }
    return user.companyId;
  }

  private async resolveBranchUnitId(companyId: number, requestedBranchUnitId?: number | string | null): Promise<number> {
    const parsedBranchUnitId = requestedBranchUnitId ? Number(requestedBranchUnitId) : undefined;

    if (parsedBranchUnitId !== undefined && !Number.isInteger(parsedBranchUnitId)) {
      throw new BadRequestException('Select an active branch.');
    }

    const branch = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(parsedBranchUnitId ? { id: parsedBranchUnitId } : {}),
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

  private async mapWithAuditUsers(records: CashAdvanceWithPayload[]) {
    const userIds = new Set<number>();
    for (const record of records) {
      if (record.createdByUserId) userIds.add(record.createdByUserId);
      if (record.updatedByUserId) userIds.add(record.updatedByUserId);
    }

    const userNames = await resolveAuditUserNames(this.prisma, [...userIds]);
    return records.map((record) => mapCashAdvance(record, userNames));
  }

  private isSubmittedStatus(status: CashAdvanceStatus) {
    return status === CashAdvanceStatus.FOR_APPROVAL || status === CashAdvanceStatus.APPROVED || status === CashAdvanceStatus.POSTED;
  }

  private assertCashAdvanceReady(record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    amount: Prisma.Decimal;
  }) {
    if (!record.partyCodeSnapshot?.trim() || !record.partyNameSnapshot?.trim()) {
      throw new BadRequestException('Select a party before submitting this Cash Advance.');
    }
    if (!record.accountCodeSnapshot?.trim()) {
      throw new BadRequestException('Select a default account before submitting this Cash Advance.');
    }
    if (Number(record.amount) <= 0) {
      throw new BadRequestException('Enter an amount greater than zero before submitting this Cash Advance.');
    }
  }
}
