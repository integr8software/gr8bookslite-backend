import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ChartAccount, CompanyUnitType, Party, PartyAddress, RevolvingFundReplenishmentStatus, Prisma, ResponsibilityCenter } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../common/utils/module-permissions.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreateRevolvingFundReplenishmentDto } from './dto/create-revolving-fund-replenishment.dto';
import { GetRevolvingFundReplenishmentListQueryDto } from './dto/get-revolving-fund-replenishment-list-query.dto';
import { RevolvingFundReplenishmentDetailDto } from './dto/revolving-fund-replenishment-detail.dto';
import { UpdateRevolvingFundReplenishmentDto } from './dto/update-revolving-fund-replenishment.dto';
import { UpdateRevolvingFundReplenishmentStatusDto } from './dto/update-revolving-fund-replenishment-status.dto';
import { RevolvingFundReplenishmentMapper } from './mappers/revolving-fund-replenishment.mapper';
import { RevolvingFundReplenishmentInclude } from './prisma/revolving-fund-replenishment.include';
export const RevolvingFundReplenishmentModuleCode = 'RFR';

type PartyWithAddresses = Party & { addresses: PartyAddress[] };

@Injectable()
export class RevolvingFundReplenishmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCurrencyService: CompanyCurrencyService,
  ) {}

  async findAll(user: AuthUser, query: GetRevolvingFundReplenishmentListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.VIEW,
      'You do not have permission to view RevolvingFundReplenishment records.',
    );
    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, branchUnitId, query);
    const orderBy = this.buildOrderBy(query);

    const [records, total] = await Promise.all([
      this.prisma.revolvingFundReplenishment.findMany({
        where,
        include: RevolvingFundReplenishmentInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.revolvingFundReplenishment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: records.map((record) => RevolvingFundReplenishmentMapper.toResponseDto(record)),
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
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.VIEW,
      'You do not have permission to view RevolvingFundReplenishment records.',
    );

    const recordId = parsePositiveBigIntId(id, 'RevolvingFundReplenishment ID');
    const record = await this.prisma.revolvingFundReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: RevolvingFundReplenishmentInclude,
    });

    if (!record) {
      throw new NotFoundException(`RevolvingFundReplenishment #${id} not found.`);
    }

    return RevolvingFundReplenishmentMapper.toResponseDto(record);
  }

  async suggestTransactionNumber(user: AuthUser, branchUnitId?: number) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const resolvedBranchId = await this.resolveBranchUnitId(companyId, branchUnitId);

    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId: resolvedBranchId,
      companyId,
      moduleCode: RevolvingFundReplenishmentModuleCode,
    });

    return {
      branchUnitId: resolvedBranchId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreateRevolvingFundReplenishmentDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.CREATE,
      'You do not have permission to create RevolvingFundReplenishment records.',
    );

    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const resolvedReferences = await this.resolveReferences(companyId, dto);

    return this.prisma.$transaction(async (tx) => {
      const inputNo = cleanOptional(dto.transactionNo);
      const assignedNo = await resolveTransactionNumberForCompanyBranch(tx, {
        branchUnitId,
        companyId,
        moduleCode: RevolvingFundReplenishmentModuleCode,
        requestedTransactionNumber: inputNo,
      });

      const existing = await tx.revolvingFundReplenishment.findFirst({
        where: { companyId, transactionNo: assignedNo, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`RevolvingFundReplenishment number "${assignedNo}" already exists.`);
      }

      const currencyCode = cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? 'PHP';

      let calculatedAmount = dto.amount ?? 0;
      if (dto.details && dto.details.length > 0) {
        calculatedAmount = dto.details.reduce((sum, detail) => sum + (detail.amount ?? detail.disburseAmount ?? 0), 0);
      }
      const targetStatus = dto.status ?? RevolvingFundReplenishmentStatus.DRAFT;

      const created = await tx.revolvingFundReplenishment.create({
        data: {
          companyId,
          branchUnitId,
          transactionNo: assignedNo,
          documentDate: new Date(dto.documentDate),
          partyId: resolvedReferences.party?.id ?? null,
          partyCodeSnapshot: resolvedReferences.party?.partyCodeNo ?? dto.partyCode ?? '',
          partyNameSnapshot: resolvedReferences.party?.partyName ?? dto.partyName ?? '',
          creditAccountId: resolvedReferences.creditAccount?.id ?? null,
          accountCodeSnapshot: resolvedReferences.creditAccount?.accountCode ?? dto.accountCode ?? '',
          accountTitleSnapshot: resolvedReferences.creditAccount?.accountTitle ?? dto.accountTitle ?? '',
          responsibilityCenterId: resolvedReferences.responsibilityCenter?.id ?? null,
          responsibilityCenterCodeSnapshot: resolvedReferences.responsibilityCenter
            ? resolvedReferences.responsibilityCenter.code
            : (cleanOptional(dto.responsibilityCenterCode) ?? undefined),
          responsibilityCenterSnapshot: resolvedReferences.responsibilityCenter
            ? resolvedReferences.responsibilityCenter.name
            : (cleanOptional(dto.responsibilityCenter) ?? undefined),
          projectCode: cleanOptional(dto.projectCode) ?? undefined,
          projectName: cleanOptional(dto.projectName) ?? undefined,
          currencyCode,
          exchangeRate: dto.exchangeRate ?? 1.0,
          amount: calculatedAmount,
          remarks: cleanOptional(dto.remarks) ?? undefined,
          status: targetStatus,
          createdByUserId: user.id,
        },
      });

      if (dto.details && dto.details.length > 0) {
        await this.createDetails(tx, companyId, branchUnitId, created.id, dto.details);
      }

      const reloaded = await tx.revolvingFundReplenishment.findUniqueOrThrow({
        where: { id: created.id },
        include: RevolvingFundReplenishmentInclude,
      });

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertRevolvingFundReplenishmentReady(reloaded);
      }

      return RevolvingFundReplenishmentMapper.toResponseDto(reloaded);
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateRevolvingFundReplenishmentDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.UPDATE,
      'You do not have permission to update RevolvingFundReplenishment records.',
    );

    const recordId = parsePositiveBigIntId(id, 'RevolvingFundReplenishment ID');
    const existing = await this.prisma.revolvingFundReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: RevolvingFundReplenishmentInclude,
    });

    if (!existing) {
      throw new NotFoundException(`RevolvingFundReplenishment #${id} not found.`);
    }

    if (existing.status === RevolvingFundReplenishmentStatus.POSTED || existing.status === RevolvingFundReplenishmentStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a RevolvingFundReplenishment in ${existing.status} status.`);
    }

    const branchUnitId = dto.branchUnitId !== undefined ? await this.resolveBranchUnitId(companyId, dto.branchUnitId) : existing.branchUnitId;

    const resolvedReferences = await this.resolveReferences(companyId, dto as CreateRevolvingFundReplenishmentDto);

    return this.prisma.$transaction(async (tx) => {
      const currencyCode =
        dto.currencyCode || dto.currency ? (cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? existing.currencyCode) : existing.currencyCode;

      let calculatedAmount = dto.amount !== undefined ? dto.amount : Number(existing.amount);
      if (dto.details && dto.details.length > 0) {
        calculatedAmount = dto.details.reduce((sum, detail) => sum + (detail.amount ?? detail.disburseAmount ?? 0), 0);
      }
      const targetStatus = dto.status ?? existing.status;

      await tx.revolvingFundReplenishment.update({
        where: { id: recordId },
        data: {
          branchUnitId,
          transactionNo: dto.transactionNo ? (cleanOptional(dto.transactionNo) ?? undefined) : existing.transactionNo,
          documentDate: dto.documentDate ? new Date(dto.documentDate) : existing.documentDate,
          partyId: resolvedReferences.party ? resolvedReferences.party.id : existing.partyId,
          partyCodeSnapshot: resolvedReferences.party?.partyCodeNo ?? dto.partyCode ?? existing.partyCodeSnapshot,
          partyNameSnapshot: resolvedReferences.party?.partyName ?? dto.partyName ?? existing.partyNameSnapshot,
          creditAccountId: resolvedReferences.creditAccount ? resolvedReferences.creditAccount.id : existing.creditAccountId,
          accountCodeSnapshot: resolvedReferences.creditAccount?.accountCode ?? dto.accountCode ?? existing.accountCodeSnapshot,
          accountTitleSnapshot: resolvedReferences.creditAccount?.accountTitle ?? dto.accountTitle ?? existing.accountTitleSnapshot,
          responsibilityCenterId: resolvedReferences.responsibilityCenter ? resolvedReferences.responsibilityCenter.id : existing.responsibilityCenterId,
          responsibilityCenterCodeSnapshot: resolvedReferences.responsibilityCenter
            ? resolvedReferences.responsibilityCenter.code
            : dto.responsibilityCenterCode !== undefined
              ? (cleanOptional(dto.responsibilityCenterCode) ?? undefined)
              : (existing.responsibilityCenterCodeSnapshot ?? undefined),
          responsibilityCenterSnapshot: resolvedReferences.responsibilityCenter
            ? resolvedReferences.responsibilityCenter.name
            : dto.responsibilityCenter !== undefined
              ? (cleanOptional(dto.responsibilityCenter) ?? undefined)
              : (existing.responsibilityCenterSnapshot ?? undefined),
          projectCode: dto.projectCode !== undefined ? (cleanOptional(dto.projectCode) ?? undefined) : (existing.projectCode ?? undefined),
          projectName: dto.projectName !== undefined ? (cleanOptional(dto.projectName) ?? undefined) : (existing.projectName ?? undefined),
          currencyCode,
          exchangeRate: dto.exchangeRate ?? existing.exchangeRate,
          amount: calculatedAmount,
          remarks: dto.remarks !== undefined ? (cleanOptional(dto.remarks) ?? undefined) : (existing.remarks ?? undefined),
          status: targetStatus,
          updatedByUserId: user.id,
        },
      });

      if (dto.details !== undefined) {
        await tx.revolvingFundReplenishmentDetail.deleteMany({ where: { replenishmentId: recordId } });
        if (dto.details.length > 0) {
          await this.createDetails(tx, companyId, branchUnitId, recordId, dto.details);
        }
      }

      const reloaded = await tx.revolvingFundReplenishment.findUniqueOrThrow({
        where: { id: recordId },
        include: RevolvingFundReplenishmentInclude,
      });

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertRevolvingFundReplenishmentReady(reloaded);
      }

      return RevolvingFundReplenishmentMapper.toResponseDto(reloaded);
    });
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateRevolvingFundReplenishmentStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.UPDATE,
      'You do not have permission to update RevolvingFundReplenishment status.',
    );

    const recordId = parsePositiveBigIntId(id, 'RevolvingFundReplenishment ID');
    const existing = await this.prisma.revolvingFundReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: RevolvingFundReplenishmentInclude,
    });

    if (!existing) {
      throw new NotFoundException(`RevolvingFundReplenishment #${id} not found.`);
    }

    if (this.isSubmittedStatus(dto.status)) {
      this.assertRevolvingFundReplenishmentReady(existing);
    }

    const now = new Date();
    const statusData: Prisma.RevolvingFundReplenishmentUncheckedUpdateInput = {
      status: dto.status,
      updatedByUserId: user.id,
    };

    if (dto.status === RevolvingFundReplenishmentStatus.APPROVED) {
      statusData.approvedByUserId = user.id;
      statusData.approvedAt = now;
    } else if (dto.status === RevolvingFundReplenishmentStatus.DISAPPROVED) {
      statusData.disapprovedByUserId = user.id;
      statusData.disapprovedAt = now;
    } else if (dto.status === RevolvingFundReplenishmentStatus.POSTED) {
      statusData.postedByUserId = user.id;
      statusData.postedAt = now;
    } else if (dto.status === RevolvingFundReplenishmentStatus.CANCELLED) {
      statusData.cancelledByUserId = user.id;
      statusData.cancelledAt = now;
    }

    const updated = await this.prisma.revolvingFundReplenishment.update({
      where: { id: recordId },
      data: statusData,
      include: RevolvingFundReplenishmentInclude,
    });

    return RevolvingFundReplenishmentMapper.toResponseDto(updated);
  }

  async remove(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      RevolvingFundReplenishmentModuleCode,
      PermissionAction.CANCEL,
      'You do not have permission to cancel/delete RevolvingFundReplenishment records.',
    );

    const recordId = parsePositiveBigIntId(id, 'RevolvingFundReplenishment ID');
    const existing = await this.prisma.revolvingFundReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`RevolvingFundReplenishment #${id} not found.`);
    }

    if (existing.status === RevolvingFundReplenishmentStatus.POSTED) {
      throw new BadRequestException('Cannot delete a posted record.');
    }

    await this.prisma.revolvingFundReplenishment.update({
      where: { id: recordId },
      data: { deletedAt: new Date(), updatedByUserId: user.id },
    });

    return { success: true, message: `RevolvingFundReplenishment #${id} deleted successfully.` };
  }

  private isSubmittedStatus(status: RevolvingFundReplenishmentStatus) {
    return (
      status === RevolvingFundReplenishmentStatus.FOR_APPROVAL ||
      status === RevolvingFundReplenishmentStatus.APPROVED ||
      status === RevolvingFundReplenishmentStatus.POSTED
    );
  }

  private assertRevolvingFundReplenishmentReady(record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    accountTitleSnapshot: string | null;
    amount: Prisma.Decimal;
    details?: Array<{
      supplierNameSnapshot: string | null;
      amount: Prisma.Decimal;
    }>;
  }) {
    if (!record.partyCodeSnapshot?.trim() || !record.partyNameSnapshot?.trim()) {
      throw new BadRequestException('Select a party before submitting this Revolving Fund Replenishment.');
    }
    if (!record.accountCodeSnapshot?.trim() || !record.accountTitleSnapshot?.trim()) {
      throw new BadRequestException('Select an account before submitting this Revolving Fund Replenishment.');
    }
    if (Number(record.amount) <= 0) {
      throw new BadRequestException('Enter a gross amount greater than zero before submitting this Revolving Fund Replenishment.');
    }

    const details = record.details ?? [];
    const validDetails = details.filter((detail) => detail.supplierNameSnapshot?.trim() && Number(detail.amount) > 0);
    if (validDetails.length === 0) {
      throw new BadRequestException(
        'Add at least one detail row with a supplier and non-zero gross amount before submitting this Revolving Fund Replenishment.',
      );
    }
  }

  private async createDetails(
    tx: Prisma.TransactionClient,
    companyId: number,
    branchUnitId: number | null,
    replenishmentId: bigint,
    details: RevolvingFundReplenishmentDetailDto[],
  ) {
    for (let i = 0; i < details.length; i++) {
      const line = details[i];
      const lineNumber = line.lineNumber ?? i + 1;
      const amount = line.amount ?? line.disburseAmount ?? 0;
      const vatAmount = line.vatAmount ?? 0;
      const ewtAmount = line.ewtAmount ?? 0;
      const netAmount = line.netAmount ?? amount - ewtAmount;
      const disburseAmount = line.disburseAmount ?? amount;

      let detailPartyId: bigint | null = null;
      if (line.partyId) {
        detailPartyId = parsePositiveBigIntId(line.partyId, 'Detail Party ID');
      }

      let detailRcId: bigint | null = null;
      if (line.responsibilityCenterId) {
        detailRcId = parsePositiveBigIntId(line.responsibilityCenterId, 'Detail RC ID');
      }

      await tx.revolvingFundReplenishmentDetail.create({
        data: {
          replenishmentId,
          companyId,
          branchUnitId,
          lineNumber,
          revolvingFundDate: line.revolvingFundDate ? new Date(line.revolvingFundDate) : line.date ? new Date(line.date) : null,
          revolvingFundNo: cleanOptional(line.revolvingFundNo ?? line.voucherNo) ?? undefined,
          partyId: detailPartyId,
          supplierCodeSnapshot: line.supplierCodeSnapshot ?? line.supplierCode ?? null,
          supplierNameSnapshot: line.supplierNameSnapshot ?? line.supplierName ?? null,
          particulars: cleanOptional(line.particulars) ?? undefined,
          remarks: cleanOptional(line.remarks) ?? undefined,
          amount,
          netAmount,
          vatType: cleanOptional(line.vatType) ?? undefined,
          vatPercent: line.vatPercent ?? 0,
          vatAmount,
          ewtCode: cleanOptional(line.ewtCode) ?? undefined,
          ewtPercent: line.ewtPercent ?? 0,
          ewtAmount,
          disburseAmount,
          responsibilityCenterId: detailRcId,
          responsibilityCenterCodeSnapshot: cleanOptional(line.responsibilityCenterCodeSnapshot ?? line.responsibilityCenterCode) ?? undefined,
          responsibilityCenterSnapshot: cleanOptional(line.responsibilityCenterSnapshot ?? line.responsibilityCenter) ?? undefined,
        },
      });
    }
  }

  private buildListWhere(
    companyId: number,
    branchUnitId: number | null,
    query: GetRevolvingFundReplenishmentListQueryDto,
  ): Prisma.RevolvingFundReplenishmentWhereInput {
    const where: Prisma.RevolvingFundReplenishmentWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (branchUnitId !== null) {
      where.branchUnitId = branchUnitId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.partyCode) {
      where.partyCodeSnapshot = { contains: query.partyCode, mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      where.documentDate = {};
      if (query.startDate) {
        where.documentDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.documentDate.lte = new Date(query.endDate);
      }
    }

    if (query.amountFrom !== undefined || query.amountTo !== undefined) {
      where.amount = {};
      if (query.amountFrom !== undefined) {
        where.amount.gte = query.amountFrom;
      }
      if (query.amountTo !== undefined) {
        where.amount.lte = query.amountTo;
      }
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { transactionNo: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { accountCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { accountTitleSnapshot: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(query: GetRevolvingFundReplenishmentListQueryDto): Prisma.RevolvingFundReplenishmentOrderByWithRelationInput[] {
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortBy = query.sortBy ?? 'createdAt';

    switch (sortBy) {
      case 'transactionNo':
      case 'voucherNo':
        return [{ transactionNo: sortOrder }, { id: 'desc' }];
      case 'documentDate':
        return [{ documentDate: sortOrder }, { id: 'desc' }];
      case 'partyName':
      case 'partyNameSnapshot':
        return [{ partyNameSnapshot: sortOrder }, { id: 'desc' }];
      case 'amount':
        return [{ amount: sortOrder }, { id: 'desc' }];
      case 'status':
        return [{ status: sortOrder }, { id: 'desc' }];
      default:
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  private async resolveReferences(companyId: number, dto: CreateRevolvingFundReplenishmentDto) {
    let party: PartyWithAddresses | null = null;
    let creditAccount: ChartAccount | null = null;
    let responsibilityCenter: ResponsibilityCenter | null = null;

    if (dto.partyId) {
      const partyId = parsePositiveBigIntId(dto.partyId, 'Party ID');
      party = await this.prisma.party.findFirst({
        where: { id: partyId, companyId, deletedAt: null },
        include: { addresses: true },
      });
    } else if (dto.partyCode) {
      party = await this.prisma.party.findFirst({
        where: { partyCodeNo: dto.partyCode, companyId, deletedAt: null },
        include: { addresses: true },
      });
    }

    const accountId = dto.creditAccountId ?? dto.accountId;
    if (accountId) {
      const parsedAccountId = parsePositiveBigIntId(accountId, 'Account ID');
      creditAccount = await this.prisma.chartAccount.findFirst({
        where: { id: parsedAccountId, companyId, deletedAt: null },
      });
    } else if (dto.accountCode) {
      creditAccount = await this.prisma.chartAccount.findFirst({
        where: { accountCode: dto.accountCode, companyId, deletedAt: null },
      });
    }

    if (dto.responsibilityCenterId) {
      const rcId = parsePositiveBigIntId(dto.responsibilityCenterId, 'Responsibility Center ID');
      responsibilityCenter = await this.prisma.responsibilityCenter.findFirst({
        where: { id: rcId, companyId, deletedAt: null },
      });
    } else if (dto.responsibilityCenterCode) {
      responsibilityCenter = await this.prisma.responsibilityCenter.findFirst({
        where: { code: dto.responsibilityCenterCode, companyId, deletedAt: null },
      });
    }

    return { party, creditAccount, responsibilityCenter };
  }

  private async resolveBranchUnitId(companyId: number, branchUnitId?: number): Promise<number> {
    const unit = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(branchUnitId ? { id: branchUnitId } : {}),
        type: { in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE] },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
    if (!unit) {
      throw new BadRequestException('Select an active branch.');
    }

    return unit.id;
  }
}
