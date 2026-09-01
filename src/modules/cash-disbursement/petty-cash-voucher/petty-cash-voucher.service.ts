import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ChartAccount, CompanyUnitType, Party, PartyAddress, PettyCashVoucherStatus, Prisma, ResponsibilityCenter } from '@prisma/client';
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
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto';
import { GetPettyCashVoucherListQueryDto } from './dto/get-petty-cash-voucher-list-query.dto';

import { UpdatePettyCashVoucherDto } from './dto/update-petty-cash-voucher.dto';
import { UpdatePettyCashVoucherStatusDto } from './dto/update-petty-cash-voucher-status.dto';
import { PettyCashVoucherMapper } from './mappers/petty-cash-voucher.mapper';
import { PettyCashVoucherInclude } from './prisma/petty-cash-voucher.include';
export const PettyCashVoucherModuleCode = 'PCV';

type PartyWithAddresses = Party & { addresses: PartyAddress[] };

@Injectable()
export class PettyCashVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCurrencyService: CompanyCurrencyService,
  ) {}

  async findAll(user: AuthUser, query: GetPettyCashVoucherListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.VIEW, 'You do not have permission to view PettyCashVoucher records.');
    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, branchUnitId, query);
    const orderBy = this.buildOrderBy(query);

    const [records, total] = await Promise.all([
      this.prisma.pettyCashVoucher.findMany({
        where,
        include: PettyCashVoucherInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.pettyCashVoucher.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: records.map((record) => PettyCashVoucherMapper.toResponseDto(record)),
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
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.VIEW, 'You do not have permission to view PettyCashVoucher records.');

    const recordId = parsePositiveBigIntId(id, 'PettyCashVoucher ID');
    const record = await this.prisma.pettyCashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: PettyCashVoucherInclude,
    });

    if (!record) {
      throw new NotFoundException(`PettyCashVoucher #${id} not found.`);
    }

    return PettyCashVoucherMapper.toResponseDto(record);
  }

  async suggestTransactionNumber(user: AuthUser, branchUnitId?: number) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const resolvedBranchId = await this.resolveBranchUnitId(companyId, branchUnitId);

    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId: resolvedBranchId,
      companyId,
      moduleCode: PettyCashVoucherModuleCode,
    });

    return {
      branchUnitId: resolvedBranchId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreatePettyCashVoucherDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.CREATE, 'You do not have permission to create PettyCashVoucher records.');

    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const resolvedReferences = await this.resolveReferences(companyId, dto);

    return this.prisma.$transaction(async (tx) => {
      const inputNo = cleanOptional(dto.voucherNo ?? dto.transactionNo);
      const assignedNo = await resolveTransactionNumberForCompanyBranch(tx, {
        branchUnitId,
        companyId,
        moduleCode: PettyCashVoucherModuleCode,
        requestedTransactionNumber: inputNo,
      });

      const existing = await tx.pettyCashVoucher.findFirst({
        where: { companyId, voucherNo: assignedNo, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`PettyCashVoucher number "${assignedNo}" already exists.`);
      }

      const currencyCode = cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? 'PHP';

      const grossAmount = dto.grossAmount ?? dto.amount ?? 0;
      const vatAmount = dto.vatAmount ?? 0;
      const ewtAmount = dto.ewtAmount ?? 0;
      const netAmount = dto.netAmount ?? grossAmount - ewtAmount;
      const amount = dto.amount ?? netAmount;
      const targetStatus = dto.status ?? PettyCashVoucherStatus.DRAFT;

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertPettyCashVoucherReady({
          partyCodeSnapshot: resolvedReferences.party?.partyCodeNo ?? dto.partyCode ?? '',
          partyNameSnapshot: resolvedReferences.party?.partyName ?? dto.partyName ?? '',
          accountCodeSnapshot: resolvedReferences.creditAccount?.accountCode ?? dto.accountCode ?? '',
          accountTitleSnapshot: resolvedReferences.creditAccount?.accountTitle ?? dto.accountTitle ?? '',
          grossAmount: new Prisma.Decimal(grossAmount),
        });
      }

      const created = await tx.pettyCashVoucher.create({
        data: {
          companyId,
          branchUnitId,
          voucherNo: assignedNo,
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
          grossAmount,
          amount,
          netAmount,
          vatType: cleanOptional(dto.vatType) ?? undefined,
          vatable: cleanOptional(dto.vatable) ?? undefined,
          vatRate: cleanOptional(dto.vatRate) ?? undefined,
          vatPercent: dto.vatPercent ?? 0,
          vatAmount,
          ewtCode: cleanOptional(dto.ewtCode) ?? undefined,
          ewtRate: cleanOptional(dto.ewtRate) ?? undefined,
          ewtPercent: dto.ewtPercent ?? 0,
          ewtAmount,
          remarks: cleanOptional(dto.remarks) ?? undefined,
          status: targetStatus,
          createdByUserId: user.id,
        },
      });

      const reloaded = await tx.pettyCashVoucher.findUniqueOrThrow({
        where: { id: created.id },
        include: PettyCashVoucherInclude,
      });

      return PettyCashVoucherMapper.toResponseDto(reloaded);
    });
  }

  async update(user: AuthUser, id: string, dto: UpdatePettyCashVoucherDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.UPDATE, 'You do not have permission to update PettyCashVoucher records.');

    const recordId = parsePositiveBigIntId(id, 'PettyCashVoucher ID');
    const existing = await this.prisma.pettyCashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: PettyCashVoucherInclude,
    });

    if (!existing) {
      throw new NotFoundException(`PettyCashVoucher #${id} not found.`);
    }

    if (existing.status === PettyCashVoucherStatus.POSTED || existing.status === PettyCashVoucherStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a PettyCashVoucher in ${existing.status} status.`);
    }

    const branchUnitId = dto.branchUnitId !== undefined ? await this.resolveBranchUnitId(companyId, dto.branchUnitId) : existing.branchUnitId;

    const resolvedReferences = await this.resolveReferences(companyId, dto as CreatePettyCashVoucherDto);

    return this.prisma.$transaction(async (tx) => {
      const currencyCode =
        dto.currencyCode || dto.currency ? (cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? existing.currencyCode) : existing.currencyCode;

      const grossAmount = dto.grossAmount ?? (dto.amount !== undefined ? dto.amount : Number(existing.grossAmount));
      const vatAmount = dto.vatAmount ?? Number(existing.vatAmount);
      const ewtAmount = dto.ewtAmount ?? Number(existing.ewtAmount);
      const netAmount = dto.netAmount ?? grossAmount - ewtAmount;
      const amount = dto.amount ?? netAmount;
      const targetStatus = dto.status ?? existing.status;

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertPettyCashVoucherReady({
          partyCodeSnapshot: resolvedReferences.party?.partyCodeNo ?? dto.partyCode ?? existing.partyCodeSnapshot,
          partyNameSnapshot: resolvedReferences.party?.partyName ?? dto.partyName ?? existing.partyNameSnapshot,
          accountCodeSnapshot: resolvedReferences.creditAccount?.accountCode ?? dto.accountCode ?? existing.accountCodeSnapshot,
          accountTitleSnapshot: resolvedReferences.creditAccount?.accountTitle ?? dto.accountTitle ?? existing.accountTitleSnapshot,
          grossAmount: new Prisma.Decimal(grossAmount),
        });
      }

      await tx.pettyCashVoucher.update({
        where: { id: recordId },
        data: {
          branchUnitId,
          voucherNo: dto.voucherNo ? (cleanOptional(dto.voucherNo) ?? undefined) : existing.voucherNo,
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
          grossAmount,
          amount,
          netAmount,
          vatType: dto.vatType !== undefined ? (cleanOptional(dto.vatType) ?? undefined) : (existing.vatType ?? undefined),
          vatable: dto.vatable !== undefined ? (cleanOptional(dto.vatable) ?? undefined) : (existing.vatable ?? undefined),
          vatRate: dto.vatRate !== undefined ? (cleanOptional(dto.vatRate) ?? undefined) : (existing.vatRate ?? undefined),
          vatPercent: dto.vatPercent ?? existing.vatPercent,
          vatAmount,
          ewtCode: dto.ewtCode !== undefined ? (cleanOptional(dto.ewtCode) ?? undefined) : (existing.ewtCode ?? undefined),
          ewtRate: dto.ewtRate !== undefined ? (cleanOptional(dto.ewtRate) ?? undefined) : (existing.ewtRate ?? undefined),
          ewtPercent: dto.ewtPercent ?? existing.ewtPercent,
          ewtAmount,
          remarks: dto.remarks !== undefined ? (cleanOptional(dto.remarks) ?? undefined) : (existing.remarks ?? undefined),
          status: targetStatus,
          updatedByUserId: user.id,
        },
      });

      const reloaded = await tx.pettyCashVoucher.findUniqueOrThrow({
        where: { id: recordId },
        include: PettyCashVoucherInclude,
      });

      return PettyCashVoucherMapper.toResponseDto(reloaded);
    });
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdatePettyCashVoucherStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.UPDATE, 'You do not have permission to update PettyCashVoucher status.');

    const recordId = parsePositiveBigIntId(id, 'PettyCashVoucher ID');
    const existing = await this.prisma.pettyCashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: PettyCashVoucherInclude,
    });

    if (!existing) {
      throw new NotFoundException(`PettyCashVoucher #${id} not found.`);
    }

    if (this.isSubmittedStatus(dto.status)) {
      this.assertPettyCashVoucherReady(existing);
    }

    const now = new Date();
    const statusData: Prisma.PettyCashVoucherUncheckedUpdateInput = {
      status: dto.status,
      updatedByUserId: user.id,
    };

    if (dto.status === PettyCashVoucherStatus.APPROVED) {
      statusData.approvedByUserId = user.id;
      statusData.approvedAt = now;
    } else if (dto.status === PettyCashVoucherStatus.DISAPPROVED) {
      statusData.disapprovedByUserId = user.id;
      statusData.disapprovedAt = now;
    } else if (dto.status === PettyCashVoucherStatus.POSTED) {
      statusData.postedByUserId = user.id;
      statusData.postedAt = now;
    } else if (dto.status === PettyCashVoucherStatus.CANCELLED) {
      statusData.cancelledByUserId = user.id;
      statusData.cancelledAt = now;
    }

    const updated = await this.prisma.pettyCashVoucher.update({
      where: { id: recordId },
      data: statusData,
      include: PettyCashVoucherInclude,
    });

    return PettyCashVoucherMapper.toResponseDto(updated);
  }

  async remove(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashVoucherModuleCode,
      PermissionAction.CANCEL,
      'You do not have permission to cancel/delete PettyCashVoucher records.',
    );

    const recordId = parsePositiveBigIntId(id, 'PettyCashVoucher ID');
    const existing = await this.prisma.pettyCashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`PettyCashVoucher #${id} not found.`);
    }

    if (existing.status === PettyCashVoucherStatus.POSTED) {
      throw new BadRequestException('Cannot delete a posted record.');
    }

    await this.prisma.pettyCashVoucher.update({
      where: { id: recordId },
      data: { deletedAt: new Date(), updatedByUserId: user.id },
    });

    return { success: true, message: `PettyCashVoucher #${id} deleted successfully.` };
  }

  private isSubmittedStatus(status: PettyCashVoucherStatus) {
    return status === PettyCashVoucherStatus.FOR_APPROVAL || status === PettyCashVoucherStatus.APPROVED || status === PettyCashVoucherStatus.POSTED;
  }

  private assertPettyCashVoucherReady(record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    accountTitleSnapshot: string | null;
    grossAmount: Prisma.Decimal;
  }) {
    if (!record.partyCodeSnapshot?.trim() || !record.partyNameSnapshot?.trim()) {
      throw new BadRequestException('Select a party before submitting this Petty Cash Voucher.');
    }
    if (!record.accountCodeSnapshot?.trim() || !record.accountTitleSnapshot?.trim()) {
      throw new BadRequestException('Select an account before submitting this Petty Cash Voucher.');
    }
    if (Number(record.grossAmount) <= 0) {
      throw new BadRequestException('Enter a gross amount greater than zero before submitting this Petty Cash Voucher.');
    }
  }

  private buildListWhere(companyId: number, branchUnitId: number | null, query: GetPettyCashVoucherListQueryDto): Prisma.PettyCashVoucherWhereInput {
    const where: Prisma.PettyCashVoucherWhereInput = {
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
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { accountCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { accountTitleSnapshot: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(query: GetPettyCashVoucherListQueryDto): Prisma.PettyCashVoucherOrderByWithRelationInput[] {
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortBy = query.sortBy ?? 'createdAt';

    switch (sortBy) {
      case 'voucherNo':
      case 'transactionNo':
        return [{ voucherNo: sortOrder }, { id: 'desc' }];
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

  private async resolveReferences(companyId: number, dto: CreatePettyCashVoucherDto) {
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
