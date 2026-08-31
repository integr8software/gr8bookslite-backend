import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdvanceToSupplierPaymentType, AdvanceToSupplierStatus, CompanyUnitType, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreateAdvanceToSupplierDto } from './dto/create-advance-to-supplier.dto';
import { GetAdvanceToSupplierListQueryDto } from './dto/get-advance-to-supplier-list-query.dto';
import { UpdateAdvanceToSupplierStatusDto } from './dto/update-advance-to-supplier-status.dto';
import { UpdateAdvanceToSupplierDto } from './dto/update-advance-to-supplier.dto';
import { mapAdvanceToSupplier } from './mappers/advance-to-supplier.mapper';
import { AdvanceToSupplierInclude, AdvanceToSupplierWithPayload } from './prisma/advance-to-supplier.include';

const AdvancesToSuppliersModuleCode = 'ATS';

@Injectable()
export class AdvancesToSuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetAdvanceToSupplierListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [records, total] = await Promise.all([
      this.prisma.advanceToSupplier.findMany({
        where,
        include: AdvanceToSupplierInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.advanceToSupplier.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: await this.mapWithAuditUsers(records),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id, 'Advances to Suppliers ID');
    const record = await this.prisma.advanceToSupplier.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: AdvanceToSupplierInclude,
    });

    if (!record) {
      throw new NotFoundException('Advances to Suppliers record not found.');
    }

    const mapped = (await this.mapWithAuditUsers([record]))[0];
    return mapped;
  }

  async suggestTransactionNumber(user: AuthUser, requestedBranchUnitId?: number | string) {
    const companyId = this.getActiveCompanyId(user);
    const branchUnitId = await this.resolveBranchUnitId(companyId, requestedBranchUnitId);
    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: AdvancesToSuppliersModuleCode,
      isIssued: (transactionNo) => this.isTransactionNoIssued(companyId, transactionNo),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      nextTransactionNo: suggestion.transactionNumber,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreateAdvanceToSupplierDto) {
    const companyId = this.getActiveCompanyId(user);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const references = await this.resolveReferences(companyId, dto);
    const partyCode = dto.partyCode?.trim() ?? '';
    const accountCode = dto.accountCode?.trim() ?? '';
    const transactionNo = await resolveTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: AdvancesToSuppliersModuleCode,
      requestedTransactionNumber: cleanOptional(dto.transactionNo),
      isIssued: (value) => this.isTransactionNoIssued(companyId, value),
    });
    const targetStatus = dto.status ?? AdvanceToSupplierStatus.DRAFT;

    const existing = await this.prisma.advanceToSupplier.findFirst({
      where: { companyId, transNo: transactionNo, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Advances to Suppliers number "${transactionNo}" already exists.`);
    }

    if (this.isSubmittedStatus(targetStatus)) {
      this.assertAdvanceToSupplierReady({
        partyCodeSnapshot: references.party?.partyCodeNo ?? partyCode,
        partyNameSnapshot: references.party?.partyName ?? dto.partyName?.trim() ?? '',
        accountCodeSnapshot: references.creditAccount?.accountCode ?? accountCode,
        poReference: dto.poReference?.trim() ?? '',
        totalPoAmount: this.toDecimal(dto.totalPoAmount, '0.00'),
        amount: this.toDecimal(dto.advancePaymentAmount, '0.00'),
      });
    }

    const created = await this.prisma.advanceToSupplier.create({
      data: {
        companyId,
        branchUnitId,
        partyId: references.party?.id ?? null,
        creditAccountId: references.creditAccount?.id ?? null,
        transNo: transactionNo,
        documentDate: new Date(dto.documentDate),
        partyCodeSnapshot: references.party?.partyCodeNo ?? partyCode,
        partyNameSnapshot: references.party?.partyName ?? dto.partyName?.trim() ?? '',
        accountCodeSnapshot: references.creditAccount?.accountCode ?? accountCode,
        accountTitleSnapshot: references.creditAccount?.accountTitle ?? cleanOptional(dto.accountTitle),
        responsibilityCenterSnapshot: cleanOptional(dto.responsibilityCenter),
        responsibilityCenterCodeSnapshot: cleanOptional(dto.responsibilityCenterCode),
        projectNameSnapshot: cleanOptional(dto.projectName),
        projectCodeSnapshot: cleanOptional(dto.projectCode),
        currencyCode: dto.currency?.trim() || 'PHP',
        exchangeRate: this.toDecimal(dto.exchangeRate, '1.0000'),
        poReference: dto.poReference?.trim() ?? '',
        totalPoAmount: this.toDecimal(dto.totalPoAmount, '0.00'),
        advancePaymentType: dto.advancePaymentType ?? AdvanceToSupplierPaymentType.PERCENTAGE,
        advancePaymentPercentage: this.toDecimal(dto.advancePaymentPercentage, '0.00'),
        amount: this.toDecimal(dto.advancePaymentAmount, '0.00'),
        remarks: cleanOptional(dto.remarks),
        status: targetStatus,
        createdByUserId: user.id,
      },
      include: AdvanceToSupplierInclude,
    });

    const mapped = (await this.mapWithAuditUsers([created]))[0];
    return mapped;
  }

  async update(user: AuthUser, id: string, dto: UpdateAdvanceToSupplierDto) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id, 'Advances to Suppliers ID');
    const existing = await this.prisma.advanceToSupplier.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Advances to Suppliers record not found.');
    }
    if (existing.status !== AdvanceToSupplierStatus.DRAFT) {
      throw new BadRequestException('Only Draft Advances to Suppliers records can be updated.');
    }

    const references = await this.resolveReferences(companyId, dto);
    if (dto.status && this.isSubmittedStatus(dto.status)) {
      this.assertAdvanceToSupplierReady({
        partyCodeSnapshot: references.party?.partyCodeNo ?? dto.partyCode ?? existing.partyCodeSnapshot,
        partyNameSnapshot: references.party?.partyName ?? dto.partyName ?? existing.partyNameSnapshot,
        accountCodeSnapshot: references.creditAccount?.accountCode ?? dto.accountCode ?? existing.accountCodeSnapshot,
        poReference: dto.poReference ?? existing.poReference,
        totalPoAmount: dto.totalPoAmount ? this.toDecimal(dto.totalPoAmount, '0.00') : existing.totalPoAmount,
        amount: dto.advancePaymentAmount ? this.toDecimal(dto.advancePaymentAmount, '0.00') : existing.amount,
      });
    }

    const updated = await this.prisma.advanceToSupplier.update({
      where: { id: recordId },
      data: {
        ...(references.party ? { partyId: references.party.id } : {}),
        ...(references.creditAccount ? { creditAccountId: references.creditAccount.id } : {}),
        ...(dto.documentDate ? { documentDate: new Date(dto.documentDate) } : {}),
        ...(dto.partyCode ? { partyCodeSnapshot: references.party?.partyCodeNo ?? dto.partyCode.trim() } : {}),
        ...(dto.partyName ? { partyNameSnapshot: references.party?.partyName ?? dto.partyName.trim() } : {}),
        ...(dto.accountCode ? { accountCodeSnapshot: references.creditAccount?.accountCode ?? dto.accountCode.trim() } : {}),
        ...(dto.accountTitle !== undefined ? { accountTitleSnapshot: references.creditAccount?.accountTitle ?? cleanOptional(dto.accountTitle) } : {}),
        ...(dto.responsibilityCenter !== undefined ? { responsibilityCenterSnapshot: cleanOptional(dto.responsibilityCenter) } : {}),
        ...(dto.responsibilityCenterCode !== undefined ? { responsibilityCenterCodeSnapshot: cleanOptional(dto.responsibilityCenterCode) } : {}),
        ...(dto.projectName !== undefined ? { projectNameSnapshot: cleanOptional(dto.projectName) } : {}),
        ...(dto.projectCode !== undefined ? { projectCodeSnapshot: cleanOptional(dto.projectCode) } : {}),
        ...(dto.currency ? { currencyCode: dto.currency.trim() } : {}),
        ...(dto.exchangeRate ? { exchangeRate: this.toDecimal(dto.exchangeRate, '1.0000') } : {}),
        ...(dto.poReference ? { poReference: dto.poReference.trim() } : {}),
        ...(dto.totalPoAmount ? { totalPoAmount: this.toDecimal(dto.totalPoAmount, '0.00') } : {}),
        ...(dto.advancePaymentType ? { advancePaymentType: dto.advancePaymentType } : {}),
        ...(dto.advancePaymentPercentage ? { advancePaymentPercentage: this.toDecimal(dto.advancePaymentPercentage, '0.00') } : {}),
        ...(dto.advancePaymentAmount ? { amount: this.toDecimal(dto.advancePaymentAmount, '0.00') } : {}),
        ...(dto.remarks !== undefined ? { remarks: cleanOptional(dto.remarks) } : {}),
        updatedByUserId: user.id,
      },
      include: AdvanceToSupplierInclude,
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return mapped;
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateAdvanceToSupplierStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id, 'Advances to Suppliers ID');
    const existing = await this.prisma.advanceToSupplier.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Advances to Suppliers record not found.');
    }

    if (this.isSubmittedStatus(dto.status)) {
      this.assertAdvanceToSupplierReady(existing);
    }

    const actionDate = new Date();
    const updated = await this.prisma.advanceToSupplier.update({
      where: { id: recordId },
      data: {
        status: dto.status,
        updatedByUserId: user.id,
        ...(dto.status === AdvanceToSupplierStatus.APPROVED ? { approvedByUserId: user.id, approvedAt: actionDate } : {}),
        ...(dto.status === AdvanceToSupplierStatus.POSTED ? { postedByUserId: user.id, postedAt: actionDate } : {}),
        ...(dto.status === AdvanceToSupplierStatus.DISAPPROVED ? { disapprovedByUserId: user.id, disapprovedAt: actionDate } : {}),
        ...(dto.status === AdvanceToSupplierStatus.CANCELLED ? { cancelledByUserId: user.id, cancelledAt: actionDate } : {}),
      },
      include: AdvanceToSupplierInclude,
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return mapped;
  }

  async submitApproval(user: AuthUser, id: string) {
    return this.updateStatus(user, id, { status: AdvanceToSupplierStatus.FOR_APPROVAL });
  }

  async remove(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id, 'Advances to Suppliers ID');
    const existing = await this.prisma.advanceToSupplier.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Advances to Suppliers record not found.');
    }

    await this.prisma.advanceToSupplier.update({
      where: { id: recordId },
      data: {
        deletedAt: new Date(),
        status: AdvanceToSupplierStatus.CANCELLED,
        cancelledByUserId: user.id,
        cancelledAt: new Date(),
      },
    });

    return { success: true, message: 'Advances to Suppliers record cancelled successfully.' };
  }

  async findParties(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const parties = await this.prisma.party.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        partyCodeNo: true,
        partyName: true,
        tradeName: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { partyCodeNo: 'asc' },
    });

    return {
      parties: parties.map((party) => {
        const partyName = party.partyName?.trim() || [party.firstName, party.lastName].filter(Boolean).join(' ') || party.tradeName || party.partyCodeNo;
        return {
          id: party.id.toString(),
          partyId: party.id.toString(),
          partyCode: party.partyCodeNo,
          partyName,
          label: party.partyCodeNo,
          name: partyName,
          value: party.partyCodeNo,
        };
      }),
    };
  }

  async findPostingAccounts(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        isPostingAccount: true,
      },
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountType: true,
        accountNature: true,
      },
      orderBy: { accountCode: 'asc' },
    });

    return {
      accounts: accounts.map((account) => ({
        id: account.id.toString(),
        accountId: account.id.toString(),
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
        accountType: account.accountType ?? null,
        accountNature: account.accountNature ?? null,
        label: account.accountCode,
        name: account.accountTitle,
        value: account.accountCode,
      })),
    };
  }

  async findResponsibilityCenters(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const centers = await this.prisma.responsibilityCenter.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        type: { select: { name: true } },
      },
      orderBy: { code: 'asc' },
    });

    return {
      responsibilityCenters: centers.map((center) => ({
        id: center.id.toString(),
        centerId: center.id.toString(),
        code: center.code,
        name: center.name,
        category: center.category,
        typeName: center.type.name,
        label: center.code,
        value: center.code,
      })),
    };
  }

  private buildListWhere(companyId: number, query: GetAdvanceToSupplierListQueryDto): Prisma.AdvanceToSupplierWhereInput {
    const where: Prisma.AdvanceToSupplierWhereInput = { companyId, deletedAt: null };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { transNo: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { accountCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { accountTitleSnapshot: { contains: search, mode: 'insensitive' } },
        { poReference: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status?.trim()) {
      const statusUpper = query.status.trim().toUpperCase();
      if (Object.values(AdvanceToSupplierStatus).includes(statusUpper as AdvanceToSupplierStatus)) {
        where.status = statusUpper as AdvanceToSupplierStatus;
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

    return where;
  }

  private buildOrderBy(query: GetAdvanceToSupplierListQueryDto): Prisma.AdvanceToSupplierOrderByWithRelationInput {
    const allowedSortFields = new Set(['transNo', 'documentDate', 'partyCodeSnapshot', 'partyNameSnapshot', 'amount', 'createdAt', 'updatedAt', 'status']);
    const sortBy = query.sortBy && allowedSortFields.has(query.sortBy) ? query.sortBy : 'createdAt';
    return { [sortBy]: query.sortOrder ?? 'desc' };
  }

  private async resolveReferences(companyId: number, dto: Partial<CreateAdvanceToSupplierDto>) {
    const party = dto.partyId
      ? await this.prisma.party.findFirst({ where: { id: parsePositiveBigIntId(dto.partyId), companyId, deletedAt: null } })
      : dto.partyCode
        ? await this.prisma.party.findFirst({ where: { companyId, partyCodeNo: dto.partyCode.trim(), deletedAt: null } })
        : null;

    const creditAccount = dto.creditAccountId
      ? await this.prisma.chartAccount.findFirst({ where: { id: parsePositiveBigIntId(dto.creditAccountId), companyId, deletedAt: null } })
      : dto.accountCode
        ? await this.prisma.chartAccount.findFirst({ where: { companyId, accountCode: dto.accountCode.trim(), deletedAt: null } })
        : null;

    return { party, creditAccount };
  }

  private async isTransactionNoIssued(companyId: number, transactionNo: string) {
    const count = await this.prisma.advanceToSupplier.count({
      where: { companyId, transNo: transactionNo, deletedAt: null },
    });
    return count > 0;
  }

  private toDecimal(value: string | undefined, fallback: string) {
    return new Prisma.Decimal((value ?? fallback).replaceAll(',', '').trim() || fallback);
  }

  private isSubmittedStatus(status: AdvanceToSupplierStatus) {
    return status === AdvanceToSupplierStatus.FOR_APPROVAL || status === AdvanceToSupplierStatus.APPROVED || status === AdvanceToSupplierStatus.POSTED;
  }

  private assertAdvanceToSupplierReady(record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    poReference: string | null;
    totalPoAmount: Prisma.Decimal;
    amount: Prisma.Decimal;
  }) {
    if (!record.partyCodeSnapshot?.trim() || !record.partyNameSnapshot?.trim()) {
      throw new BadRequestException('Select a supplier before submitting this Advances to Suppliers record.');
    }
    if (!record.accountCodeSnapshot?.trim()) {
      throw new BadRequestException('Select a default account before submitting this Advances to Suppliers record.');
    }
    if (!record.poReference?.trim()) {
      throw new BadRequestException('Select a PO reference before submitting this Advances to Suppliers record.');
    }
    if (Number(record.totalPoAmount) <= 0) {
      throw new BadRequestException('Enter a total PO amount greater than zero before submitting this Advances to Suppliers record.');
    }
    if (Number(record.amount) <= 0) {
      throw new BadRequestException('Enter an advance payment amount greater than zero before submitting this Advances to Suppliers record.');
    }
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

  private async mapWithAuditUsers(records: AdvanceToSupplierWithPayload[]) {
    const userIds = new Set<number>();
    for (const record of records) {
      if (record.createdByUserId) userIds.add(record.createdByUserId);
      if (record.updatedByUserId) userIds.add(record.updatedByUserId);
    }

    const userNames = await resolveAuditUserNames(this.prisma, [...userIds]);
    return records.map((record) => mapAdvanceToSupplier(record, userNames));
  }
}
