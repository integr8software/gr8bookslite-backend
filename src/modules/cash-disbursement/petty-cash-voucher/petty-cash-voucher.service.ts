import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChartAccount,
  CompanyUnitType,
  Party,
  PartyAddress,
  PettyCashVoucherStatus,
  PettyCashReplenishmentStatus,
  Prisma,
  ResponsibilityCenter,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../common/utils/module-permissions.util';
import { roundMoney } from '../../../common/utils/money.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto';
import { GetPettyCashVoucherCopyFromCandidatesQueryDto } from './copy-from/dto/get-petty-cash-voucher-copy-from-candidates-query.dto';
import { GetPettyCashVoucherListQueryDto } from './dto/get-petty-cash-voucher-list-query.dto';
import { PettyCashVoucherDetailDto } from './dto/petty-cash-voucher-detail.dto';
import { UpdatePettyCashVoucherDto } from './dto/update-petty-cash-voucher.dto';
import { UpdatePettyCashVoucherStatusDto } from './dto/update-petty-cash-voucher-status.dto';
import { PettyCashVoucherMapper } from './mappers/petty-cash-voucher.mapper';
import { PettyCashVoucherInclude } from './prisma/petty-cash-voucher.include';
export const PettyCashVoucherModuleCode = 'PCV';
export const PettyCashVoucherCopySourceLabel = 'Petty Cash Voucher';

type PartyWithAddresses = Party & { addresses: PartyAddress[] };

function getPettyCashVoucherDetailConsumptionKey(sourceId: string, supplierCode?: string | null, supplierName?: string | null) {
  return [sourceId, cleanOptional(supplierCode)?.toLowerCase() ?? '', cleanOptional(supplierName)?.toLowerCase() ?? ''].join(':');
}

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

  async findCopyFromCandidates(user: AuthUser, query: GetPettyCashVoucherCopyFromCandidatesQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.VIEW, 'You do not have permission to view PettyCashVoucher records.');

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const search = cleanOptional(query.search);
    const partyId = query.partyId ? parsePositiveBigIntId(query.partyId, 'partyId') : null;
    const partyCode = cleanOptional(query.partyCode);
    const branchUnitId = query.branchUnitId;
    const partyFilter: Prisma.PettyCashVoucherWhereInput | null = partyId
      ? { partyId }
      : partyCode
        ? {
            OR: [{ partyCodeSnapshot: { equals: partyCode, mode: 'insensitive' } }, { party: { partyCodeNo: { equals: partyCode, mode: 'insensitive' } } }],
          }
        : null;
    const searchFilter: Prisma.PettyCashVoucherWhereInput | null = search
      ? {
          OR: [
            { transactionNo: { contains: search, mode: 'insensitive' } },
            { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
            { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
            { remarks: { contains: search, mode: 'insensitive' } },
          ],
        }
      : null;
    const where: Prisma.PettyCashVoucherWhereInput = {
      companyId,
      deletedAt: null,
      status: PettyCashVoucherStatus.POSTED,
      ...(branchUnitId ? { branchUnitId } : {}),
      ...(partyFilter || searchFilter ? { AND: [partyFilter, searchFilter].filter(Boolean) as Prisma.PettyCashVoucherWhereInput[] } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.pettyCashVoucher.findMany({
        where,
        include: { party: true, details: { orderBy: { lineNumber: 'asc' } } },
        orderBy: [{ documentDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.pettyCashVoucher.count({ where }),
    ]);
    const consumedDetailAmounts = await this.getReplenishmentConsumedDetailAmounts(
      records.map((record) => ({ id: record.id.toString(), transactionNo: record.transactionNo })),
      companyId,
    );

    const candidates = records
      .map((record) => {
        const sourceId = record.id.toString();
        const allDetails = record.details.map((detail) => {
          const detailGrossAmount = Number(detail.grossAmount || detail.amount || 0);
          const detailDisburseAmount = Number(detail.disburseAmount || detail.amount || detail.grossAmount || 0);
          const consumptionKey = getPettyCashVoucherDetailConsumptionKey(sourceId, detail.supplierCodeSnapshot, detail.supplierNameSnapshot);
          const remainingConsumedDetail = consumedDetailAmounts.get(consumptionKey) ?? {
            gross: 0,
            disburse: 0,
          };
          const consumedDetail = {
            gross: roundMoney(Math.min(detailGrossAmount, remainingConsumedDetail.gross)),
            disburse: roundMoney(Math.min(detailDisburseAmount, remainingConsumedDetail.disburse)),
          };
          consumedDetailAmounts.set(consumptionKey, {
            gross: roundMoney(remainingConsumedDetail.gross - consumedDetail.gross),
            disburse: roundMoney(remainingConsumedDetail.disburse - consumedDetail.disburse),
          });
          const availableGrossAmount = roundMoney(detailGrossAmount - consumedDetail.gross);
          const availableAmount = roundMoney(detailDisburseAmount - consumedDetail.disburse);

          return {
            date: detail.date ? detail.date.toISOString().slice(0, 10) : null,
            disburseAmount: detailDisburseAmount,
            consumedAmount: consumedDetail.disburse,
            availableAmount,
            ewtAmount: Number(detail.ewtAmount),
            ewtCode: detail.ewtCode,
            ewtPercent: Number(detail.ewtPercent),
            grossAmount: detailGrossAmount,
            consumedGrossAmount: consumedDetail.gross,
            availableGrossAmount,
            id: detail.id.toString(),
            lineNumber: detail.lineNumber,
            netAmount: Number(detail.netAmount),
            particulars: detail.particulars,
            remarks: detail.remarks,
            responsibilityCenter: detail.responsibilityCenterSnapshot,
            responsibilityCenterCode: detail.responsibilityCenterCodeSnapshot,
            responsibilityCenterId: detail.responsibilityCenterId?.toString() ?? null,
            supplierCode: detail.supplierCodeSnapshot,
            supplierName: detail.supplierNameSnapshot,
            vatAmount: Number(detail.vatAmount),
            vatPercent: Number(detail.vatPercent),
            vatType: detail.vatType,
          };
        });
        const details = allDetails.filter((detail) => detail.availableGrossAmount > 0 && detail.availableAmount > 0);
        const amount = roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.grossAmount || detail.amount || 0), 0));
        const disburseAmount = roundMoney(
          record.details.reduce((sum, detail) => sum + Number(detail.disburseAmount || detail.amount || detail.grossAmount || 0), 0),
        );
        const consumedGrossAmount = roundMoney(allDetails.reduce((sum, detail) => sum + detail.consumedGrossAmount, 0));
        const consumedAmount = roundMoney(allDetails.reduce((sum, detail) => sum + detail.consumedAmount, 0));
        const availableGrossAmount = roundMoney(details.reduce((sum, detail) => sum + detail.availableGrossAmount, 0));
        const availableAmount = roundMoney(details.reduce((sum, detail) => sum + detail.availableAmount, 0));

        return {
          accountCode: record.accountCodeSnapshot,
          accountTitle: record.accountTitleSnapshot,
          amount,
          availableAmount,
          availableGrossAmount,
          consumedAmount,
          consumedGrossAmount,
          currency: record.currencyCode,
          details,
          disburseAmount,
          documentDate: record.documentDate.toISOString().slice(0, 10),
          exchangeRate: Number(record.exchangeRate),
          id: sourceId,
          partyCode: record.party?.partyCodeNo ?? record.partyCodeSnapshot,
          partyId: record.partyId?.toString() ?? null,
          partyName: record.party?.partyName ?? record.partyNameSnapshot,
          projectCode: record.projectCode,
          projectName: record.projectName,
          remarks: record.remarks,
          responsibilityCenter: record.responsibilityCenterSnapshot,
          responsibilityCenterCode: record.responsibilityCenterCodeSnapshot,
          responsibilityCenterId: record.responsibilityCenterId?.toString() ?? null,
          source: PettyCashVoucherCopySourceLabel,
          sourceNo: record.transactionNo,
          transactionNo: record.transactionNo,
        };
      })
      .filter((record) => record.availableGrossAmount > 0 && record.availableAmount > 0 && record.details.length > 0);

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

  async create(user: AuthUser, dto: CreatePettyCashVoucherDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, PettyCashVoucherModuleCode, PermissionAction.CREATE, 'You do not have permission to create PettyCashVoucher records.');

    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const resolvedReferences = await this.resolveReferences(companyId, dto);

    return this.prisma.$transaction(async (tx) => {
      const inputNo = cleanOptional(dto.transactionNo);
      const assignedNo = await resolveTransactionNumberForCompanyBranch(tx, {
        branchUnitId,
        companyId,
        moduleCode: PettyCashVoucherModuleCode,
        requestedTransactionNumber: inputNo,
      });

      const existing = await tx.pettyCashVoucher.findFirst({
        where: { companyId, transactionNo: assignedNo, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`PettyCashVoucher number "${assignedNo}" already exists.`);
      }

      const currencyCode = cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? 'PHP';

      let calculatedAmount = dto.amount ?? 0;
      if (dto.details && dto.details.length > 0) {
        calculatedAmount = dto.details.reduce((sum, detail) => sum + (detail.grossAmount ?? detail.amount ?? detail.disburseAmount ?? 0), 0);
      }
      const targetStatus = dto.status ?? PettyCashVoucherStatus.DRAFT;

      const created = await tx.pettyCashVoucher.create({
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

      const reloaded = await tx.pettyCashVoucher.findUniqueOrThrow({
        where: { id: created.id },
        include: PettyCashVoucherInclude,
      });

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertPettyCashVoucherReady(reloaded);
      }

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

      let calculatedAmount = dto.amount !== undefined ? dto.amount : Number(existing.amount);
      if (dto.details && dto.details.length > 0) {
        calculatedAmount = dto.details.reduce((sum, detail) => sum + (detail.grossAmount ?? detail.amount ?? detail.disburseAmount ?? 0), 0);
      }
      const targetStatus = dto.status ?? existing.status;

      await tx.pettyCashVoucher.update({
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
        await tx.pettyCashVoucherDetail.deleteMany({ where: { voucherId: recordId } });
        if (dto.details.length > 0) {
          await this.createDetails(tx, companyId, branchUnitId, recordId, dto.details);
        }
      }

      const reloaded = await tx.pettyCashVoucher.findUniqueOrThrow({
        where: { id: recordId },
        include: PettyCashVoucherInclude,
      });

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertPettyCashVoucherReady(reloaded);
      }

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

    if (dto.status === PettyCashVoucherStatus.POSTED) {
      statusData.approvedByUserId = user.id;
      statusData.approvedAt = now;
      statusData.postedByUserId = user.id;
      statusData.postedAt = now;
    } else if (dto.status === PettyCashVoucherStatus.DISAPPROVED) {
      statusData.disapprovedByUserId = user.id;
      statusData.disapprovedAt = now;
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

  private async createDetails(
    tx: Prisma.TransactionClient,
    companyId: number,
    branchUnitId: number | null,
    voucherId: bigint,
    details: PettyCashVoucherDetailDto[],
  ) {
    for (let i = 0; i < details.length; i++) {
      const line = details[i];
      const lineNumber = line.lineNumber ?? i + 1;
      const amount = line.amount ?? line.grossAmount ?? line.disburseAmount ?? 0;
      const grossAmount = line.grossAmount ?? amount;
      const vatAmount = line.vatAmount ?? 0;
      const ewtAmount = line.ewtAmount ?? 0;
      const netAmount = line.netAmount ?? grossAmount - vatAmount;
      const disburseAmount = line.disburseAmount ?? grossAmount - ewtAmount;

      let detailPartyId: bigint | null = null;
      if (line.partyId) {
        detailPartyId = parsePositiveBigIntId(line.partyId, 'Detail Party ID');
      }

      let detailRcId: bigint | null = null;
      if (line.responsibilityCenterId) {
        detailRcId = parsePositiveBigIntId(line.responsibilityCenterId, 'Detail RC ID');
      }

      await tx.pettyCashVoucherDetail.create({
        data: {
          voucherId,
          companyId,
          branchUnitId,
          lineNumber,
          date: line.date || line.itemDate ? new Date(line.date ?? line.itemDate!) : null,
          partyId: detailPartyId,
          supplierCodeSnapshot: line.supplierCodeSnapshot ?? line.supplierCode ?? null,
          supplierNameSnapshot: line.supplierNameSnapshot ?? line.supplierName ?? null,
          orNo: cleanOptional(line.orNo) ?? undefined,
          tinNo: cleanOptional(line.tinNo) ?? undefined,
          particulars: cleanOptional(line.particulars) ?? undefined,
          remarks: cleanOptional(line.remarks) ?? undefined,
          amount,
          grossAmount,
          netAmount,
          disburseAmount,
          vatType: cleanOptional(line.vatType) ?? undefined,
          vatPercent: line.vatPercent ?? 0,
          vatAmount,
          ewtCode: cleanOptional(line.ewtCode) ?? undefined,
          ewtPercent: line.ewtPercent ?? 0,
          ewtAmount,
          expenseType: cleanOptional(line.expenseType) ?? undefined,
          responsibilityCenterId: detailRcId,
          responsibilityCenterCodeSnapshot: cleanOptional(line.responsibilityCenterCodeSnapshot ?? line.responsibilityCenterCode) ?? undefined,
          responsibilityCenterSnapshot: cleanOptional(line.responsibilityCenterSnapshot ?? line.responsibilityCenter) ?? undefined,
        },
      });
    }
  }

  private async getReplenishmentConsumedAmounts(sources: Array<{ id: string; transactionNo: string }>, companyId: number) {
    const consumed = {
      disburse: new Map<string, number>(),
      gross: new Map<string, number>(),
    };
    if (sources.length === 0) {
      return consumed;
    }

    const sourceIdByReference = new Map<string, string>();
    for (const source of sources) {
      sourceIdByReference.set(source.id, source.id);
      sourceIdByReference.set(formatPettyCashVoucherReference(source.transactionNo), source.id);
      sourceIdByReference.set(source.transactionNo, source.id);
    }

    const details = await this.prisma.pettyCashReplenishmentDetail.findMany({
      where: {
        companyId,
        pettyCashNo: { in: [...sourceIdByReference.keys()] },
        replenishment: {
          deletedAt: null,
          status: {
            in: [PettyCashReplenishmentStatus.DRAFT, PettyCashReplenishmentStatus.FOR_APPROVAL, PettyCashReplenishmentStatus.POSTED],
          },
        },
      },
      select: { amount: true, disburseAmount: true, pettyCashNo: true },
    });

    for (const detail of details) {
      const reference = cleanOptional(detail.pettyCashNo);
      if (!reference) {
        continue;
      }

      const sourceId = sourceIdByReference.get(reference);
      if (!sourceId) {
        continue;
      }

      consumed.gross.set(sourceId, roundMoney((consumed.gross.get(sourceId) ?? 0) + Number(detail.amount || 0)));
      consumed.disburse.set(sourceId, roundMoney((consumed.disburse.get(sourceId) ?? 0) + Number(detail.disburseAmount || detail.amount || 0)));
    }

    return consumed;
  }

  private async getReplenishmentConsumedDetailAmounts(sources: Array<{ id: string; transactionNo: string }>, companyId: number) {
    const consumed = new Map<string, { gross: number; disburse: number }>();
    if (sources.length === 0) {
      return consumed;
    }

    const sourceIdByReference = new Map<string, string>();
    for (const source of sources) {
      sourceIdByReference.set(source.id, source.id);
      sourceIdByReference.set(formatPettyCashVoucherReference(source.transactionNo), source.id);
      sourceIdByReference.set(source.transactionNo, source.id);
    }

    const details = await this.prisma.pettyCashReplenishmentDetail.findMany({
      where: {
        companyId,
        pettyCashNo: { in: [...sourceIdByReference.keys()] },
        replenishment: {
          deletedAt: null,
          status: {
            in: [PettyCashReplenishmentStatus.DRAFT, PettyCashReplenishmentStatus.FOR_APPROVAL, PettyCashReplenishmentStatus.POSTED],
          },
        },
      },
      select: {
        amount: true,
        disburseAmount: true,
        pettyCashNo: true,
        supplierCodeSnapshot: true,
        supplierNameSnapshot: true,
      },
    });

    for (const detail of details) {
      const reference = cleanOptional(detail.pettyCashNo);
      if (!reference) {
        continue;
      }

      const sourceId = sourceIdByReference.get(reference);
      if (!sourceId) {
        continue;
      }

      const key = getPettyCashVoucherDetailConsumptionKey(sourceId, detail.supplierCodeSnapshot, detail.supplierNameSnapshot);
      const current = consumed.get(key) ?? { gross: 0, disburse: 0 };
      consumed.set(key, {
        gross: roundMoney(current.gross + Number(detail.amount || 0)),
        disburse: roundMoney(current.disburse + Number(detail.disburseAmount || detail.amount || 0)),
      });
    }

    return consumed;
  }

  private isSubmittedStatus(status: PettyCashVoucherStatus) {
    return status === PettyCashVoucherStatus.FOR_APPROVAL || status === PettyCashVoucherStatus.POSTED;
  }

  private assertPettyCashVoucherReady(record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    accountTitleSnapshot: string | null;
    amount: Prisma.Decimal;
    details?: Array<{
      supplierNameSnapshot: string | null;
      grossAmount: Prisma.Decimal;
      amount: Prisma.Decimal;
    }>;
  }) {
    if (!record.partyCodeSnapshot?.trim() || !record.partyNameSnapshot?.trim()) {
      throw new BadRequestException('Select a party before submitting this Petty Cash Voucher.');
    }
    if (!record.accountCodeSnapshot?.trim() || !record.accountTitleSnapshot?.trim()) {
      throw new BadRequestException('Select an account before submitting this Petty Cash Voucher.');
    }
    if (Number(record.amount) <= 0) {
      throw new BadRequestException('Enter a gross amount greater than zero before submitting this Petty Cash Voucher.');
    }

    const details = record.details ?? [];
    const validDetails = details.filter((detail) => detail.supplierNameSnapshot?.trim() && Number(detail.grossAmount ?? detail.amount) > 0);
    if (validDetails.length === 0) {
      throw new BadRequestException('Add at least one detail row with a supplier and non-zero gross amount before submitting this Petty Cash Voucher.');
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

  private buildOrderBy(query: GetPettyCashVoucherListQueryDto): Prisma.PettyCashVoucherOrderByWithRelationInput[] {
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

export function formatPettyCashVoucherReference(transactionNo: string) {
  return `PCV:${transactionNo.trim()}`;
}
