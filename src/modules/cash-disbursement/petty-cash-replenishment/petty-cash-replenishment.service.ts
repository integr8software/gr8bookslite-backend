import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChartAccount,
  CompanyUnitType,
  Party,
  PartyAddress,
  PettyCashFundStatus,
  PettyCashReplenishmentStatus,
  PettyCashVoucherStatus,
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
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { roundMoney } from '../../../common/utils/money.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { formatPettyCashFundReference } from '../petty-cash-fund/petty-cash-fund.service';
import { formatPettyCashVoucherReference } from '../petty-cash-voucher/petty-cash-voucher.service';
import {
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreatePettyCashReplenishmentDto } from './dto/create-petty-cash-replenishment.dto';
import { GetPettyCashReplenishmentListQueryDto } from './dto/get-petty-cash-replenishment-list-query.dto';
import { PettyCashReplenishmentDetailDto } from './dto/petty-cash-replenishment-detail.dto';
import { UpdatePettyCashReplenishmentDto } from './dto/update-petty-cash-replenishment.dto';
import { UpdatePettyCashReplenishmentStatusDto } from './dto/update-petty-cash-replenishment-status.dto';
import { PettyCashReplenishmentMapper } from './mappers/petty-cash-replenishment.mapper';
import { PettyCashReplenishmentInclude } from './prisma/petty-cash-replenishment.include';

export { PettyCashReplenishmentCopySourceLabel, formatPettyCashReplenishmentReference } from './copy-from/petty-cash-replenishment-copy-source.service';

export const PettyCashReplenishmentModuleCode = 'PCR';

type PartyWithAddresses = Party & { addresses: PartyAddress[] };
type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

const PettyCashSourceAllocationLockNamespace = 7093n;
const ActivePettyCashReplenishmentStatuses = [
  PettyCashReplenishmentStatus.DRAFT,
  PettyCashReplenishmentStatus.FOR_APPROVAL,
  PettyCashReplenishmentStatus.POSTED,
];

@Injectable()
export class PettyCashReplenishmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCurrencyService: CompanyCurrencyService,
  ) {}

  async findAll(user: AuthUser, query: GetPettyCashReplenishmentListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashReplenishmentModuleCode,
      PermissionAction.VIEW,
      'You do not have permission to view PettyCashReplenishment records.',
    );
    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, branchUnitId, query);
    const orderBy = this.buildOrderBy(query);

    const [records, total] = await Promise.all([
      this.prisma.pettyCashReplenishment.findMany({
        where,
        include: PettyCashReplenishmentInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.pettyCashReplenishment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: records.map((record) => PettyCashReplenishmentMapper.toResponseDto(record)),
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
      PettyCashReplenishmentModuleCode,
      PermissionAction.VIEW,
      'You do not have permission to view PettyCashReplenishment records.',
    );

    const recordId = parsePositiveBigIntId(id, 'PettyCashReplenishment ID');
    const record = await this.prisma.pettyCashReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: PettyCashReplenishmentInclude,
    });

    if (!record) {
      throw new NotFoundException(`PettyCashReplenishment #${id} not found.`);
    }

    return PettyCashReplenishmentMapper.toResponseDto(record);
  }

  async suggestTransactionNumber(user: AuthUser, branchUnitId?: number) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const resolvedBranchId = await this.resolveBranchUnitId(companyId, branchUnitId);

    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId: resolvedBranchId,
      companyId,
      moduleCode: PettyCashReplenishmentModuleCode,
    });

    return {
      branchUnitId: resolvedBranchId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreatePettyCashReplenishmentDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashReplenishmentModuleCode,
      PermissionAction.CREATE,
      'You do not have permission to create PettyCashReplenishment records.',
    );

    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const resolvedReferences = await this.resolveReferences(companyId, dto);

    return this.prisma.$transaction(async (tx) => {
      const inputNo = cleanOptional(dto.transactionNo);
      const assignedNo = await resolveTransactionNumberForCompanyBranch(tx, {
        branchUnitId,
        companyId,
        moduleCode: PettyCashReplenishmentModuleCode,
        requestedTransactionNumber: inputNo,
      });

      const existing = await tx.pettyCashReplenishment.findFirst({
        where: { companyId, transactionNo: assignedNo, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`PettyCashReplenishment number "${assignedNo}" already exists.`);
      }

      const currencyCode = cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? 'PHP';

      let calculatedAmount = dto.amount ?? 0;
      if (dto.details && dto.details.length > 0) {
        calculatedAmount = dto.details.reduce((sum, detail) => sum + (detail.amount ?? detail.disburseAmount ?? 0), 0);
      }
      const targetStatus = dto.status ?? PettyCashReplenishmentStatus.DRAFT;
      this.assertUniquePettyCashVoucherNumbers(dto.details);
      await this.validatePettyCashSourceDetails(tx, {
        branchUnitId,
        companyId,
        currencyCode,
        details: dto.details,
        partyCode: resolvedReferences.party?.partyCodeNo ?? dto.partyCode ?? '',
        partyId: resolvedReferences.party?.id ?? null,
      });

      const created = await tx.pettyCashReplenishment.create({
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

      const reloaded = await tx.pettyCashReplenishment.findUniqueOrThrow({
        where: { id: created.id },
        include: PettyCashReplenishmentInclude,
      });

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertPettyCashReplenishmentReady(reloaded);
      }

      return PettyCashReplenishmentMapper.toResponseDto(reloaded);
    });
  }

  async update(user: AuthUser, id: string, dto: UpdatePettyCashReplenishmentDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashReplenishmentModuleCode,
      PermissionAction.UPDATE,
      'You do not have permission to update PettyCashReplenishment records.',
    );

    const recordId = parsePositiveBigIntId(id, 'PettyCashReplenishment ID');
    const existing = await this.prisma.pettyCashReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: PettyCashReplenishmentInclude,
    });

    if (!existing) {
      throw new NotFoundException(`PettyCashReplenishment #${id} not found.`);
    }

    if (existing.status === PettyCashReplenishmentStatus.POSTED || existing.status === PettyCashReplenishmentStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a PettyCashReplenishment in ${existing.status} status.`);
    }

    const branchUnitId = dto.branchUnitId !== undefined ? await this.resolveBranchUnitId(companyId, dto.branchUnitId) : existing.branchUnitId;

    const resolvedReferences = await this.resolveReferences(companyId, dto as CreatePettyCashReplenishmentDto);

    return this.prisma.$transaction(async (tx) => {
      const currencyCode =
        dto.currencyCode || dto.currency ? (cleanCurrencyCode(dto.currencyCode ?? dto.currency ?? 'PHP') ?? existing.currencyCode) : existing.currencyCode;

      let calculatedAmount = dto.amount !== undefined ? dto.amount : Number(existing.amount);
      if (dto.details && dto.details.length > 0) {
        calculatedAmount = dto.details.reduce((sum, detail) => sum + (detail.amount ?? detail.disburseAmount ?? 0), 0);
      }
      const targetStatus = dto.status ?? existing.status;
      this.assertUniquePettyCashVoucherNumbers(dto.details);
      await this.validatePettyCashSourceDetails(tx, {
        branchUnitId,
        companyId,
        currencyCode,
        currentTargetId: recordId,
        details: dto.details,
        partyCode: resolvedReferences.party?.partyCodeNo ?? dto.partyCode ?? existing.partyCodeSnapshot,
        partyId: resolvedReferences.party?.id ?? existing.partyId,
      });

      await tx.pettyCashReplenishment.update({
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
        await tx.pettyCashReplenishmentDetail.deleteMany({ where: { replenishmentId: recordId } });
        if (dto.details.length > 0) {
          await this.createDetails(tx, companyId, branchUnitId, recordId, dto.details);
        }
      }

      const reloaded = await tx.pettyCashReplenishment.findUniqueOrThrow({
        where: { id: recordId },
        include: PettyCashReplenishmentInclude,
      });

      if (this.isSubmittedStatus(targetStatus)) {
        this.assertPettyCashReplenishmentReady(reloaded);
      }

      return PettyCashReplenishmentMapper.toResponseDto(reloaded);
    });
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdatePettyCashReplenishmentStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashReplenishmentModuleCode,
      PermissionAction.UPDATE,
      'You do not have permission to update PettyCashReplenishment status.',
    );

    const recordId = parsePositiveBigIntId(id, 'PettyCashReplenishment ID');
    const existing = await this.prisma.pettyCashReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: PettyCashReplenishmentInclude,
    });

    if (!existing) {
      throw new NotFoundException(`PettyCashReplenishment #${id} not found.`);
    }

    if (this.isSubmittedStatus(dto.status)) {
      this.assertPettyCashReplenishmentReady(existing);
    }

    const now = new Date();
    const statusData: Prisma.PettyCashReplenishmentUncheckedUpdateInput = {
      status: dto.status,
      updatedByUserId: user.id,
    };

    if (dto.status === PettyCashReplenishmentStatus.POSTED) {
      statusData.approvedByUserId = user.id;
      statusData.approvedAt = now;
      statusData.postedByUserId = user.id;
      statusData.postedAt = now;
    } else if (dto.status === PettyCashReplenishmentStatus.DISAPPROVED) {
      statusData.disapprovedByUserId = user.id;
      statusData.disapprovedAt = now;
    } else if (dto.status === PettyCashReplenishmentStatus.CANCELLED) {
      statusData.cancelledByUserId = user.id;
      statusData.cancelledAt = now;
    }

    const updated = await this.prisma.pettyCashReplenishment.update({
      where: { id: recordId },
      data: statusData,
      include: PettyCashReplenishmentInclude,
    });

    return PettyCashReplenishmentMapper.toResponseDto(updated);
  }

  async remove(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(
      user,
      companyId,
      PettyCashReplenishmentModuleCode,
      PermissionAction.CANCEL,
      'You do not have permission to cancel/delete PettyCashReplenishment records.',
    );

    const recordId = parsePositiveBigIntId(id, 'PettyCashReplenishment ID');
    const existing = await this.prisma.pettyCashReplenishment.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`PettyCashReplenishment #${id} not found.`);
    }

    if (existing.status === PettyCashReplenishmentStatus.POSTED) {
      throw new BadRequestException('Cannot delete a posted record.');
    }

    await this.prisma.pettyCashReplenishment.update({
      where: { id: recordId },
      data: { deletedAt: new Date(), updatedByUserId: user.id },
    });

    return { success: true, message: `PettyCashReplenishment #${id} deleted successfully.` };
  }

  private isSubmittedStatus(status: PettyCashReplenishmentStatus) {
    return status === PettyCashReplenishmentStatus.FOR_APPROVAL || status === PettyCashReplenishmentStatus.POSTED;
  }

  private assertPettyCashReplenishmentReady(record: {
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
      throw new BadRequestException('Select a party before submitting this Petty Cash Replenishment.');
    }
    if (!record.accountCodeSnapshot?.trim() || !record.accountTitleSnapshot?.trim()) {
      throw new BadRequestException('Select an account before submitting this Petty Cash Replenishment.');
    }
    if (Number(record.amount) <= 0) {
      throw new BadRequestException('Enter a gross amount greater than zero before submitting this Petty Cash Replenishment.');
    }

    const details = record.details ?? [];
    const validDetails = details.filter((detail) => detail.supplierNameSnapshot?.trim() && Number(detail.amount) > 0);
    if (validDetails.length === 0) {
      throw new BadRequestException('Add at least one detail row with a supplier and non-zero gross amount before submitting this Petty Cash Replenishment.');
    }
  }

  private assertUniquePettyCashVoucherNumbers(details: PettyCashReplenishmentDetailDto[] = []) {
    const voucherNumbers = details
      .map((detail) => cleanOptional(detail.pettyCashNo ?? detail.voucherNo)?.toLowerCase())
      .filter((pettyCashNo): pettyCashNo is string => Boolean(pettyCashNo?.startsWith('pcv:')));
    if (new Set(voucherNumbers).size !== voucherNumbers.length) {
      throw new BadRequestException('Petty Cash Voucher Numbers must be unique.');
    }
  }

  private async createDetails(
    tx: Prisma.TransactionClient,
    companyId: number,
    branchUnitId: number | null,
    replenishmentId: bigint,
    details: PettyCashReplenishmentDetailDto[],
  ) {
    for (let i = 0; i < details.length; i++) {
      const line = details[i];
      const lineNumber = line.lineNumber ?? i + 1;
      const amount = line.amount ?? line.disburseAmount ?? 0;
      const vatAmount = line.vatAmount ?? 0;
      const ewtAmount = line.ewtAmount ?? 0;
      const netAmount = line.netAmount ?? amount - vatAmount;
      const disburseAmount = line.disburseAmount ?? amount - ewtAmount;

      let detailPartyId: bigint | null = null;
      if (line.partyId) {
        detailPartyId = parsePositiveBigIntId(line.partyId, 'Detail Party ID');
      }

      let detailRcId: bigint | null = null;
      if (line.responsibilityCenterId) {
        detailRcId = parsePositiveBigIntId(line.responsibilityCenterId, 'Detail RC ID');
      }

      await tx.pettyCashReplenishmentDetail.create({
        data: {
          replenishmentId,
          companyId,
          branchUnitId,
          lineNumber,
          pettyCashDate: line.pettyCashDate ? new Date(line.pettyCashDate) : line.date ? new Date(line.date) : null,
          pettyCashNo: cleanOptional(line.pettyCashNo ?? line.voucherNo) ?? undefined,
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

  private async validatePettyCashSourceDetails(
    tx: Prisma.TransactionClient,
    input: {
      branchUnitId: number | null;
      companyId: number;
      currencyCode: string;
      currentTargetId?: bigint;
      details?: PettyCashReplenishmentDetailDto[];
      partyCode: string;
      partyId?: bigint | null;
    },
  ) {
    const allocations = this.getPettyCashSourceDetailAmounts(input.details);
    if (allocations.length === 0) {
      return;
    }

    const pcvNos = allocations.filter((allocation) => allocation.source === 'PCV').map((allocation) => allocation.transactionNo);
    const pcfNos = allocations.filter((allocation) => allocation.source === 'PCF').map((allocation) => allocation.transactionNo);
    const pcvs =
      pcvNos.length > 0
        ? await tx.pettyCashVoucher.findMany({
            where: { companyId: input.companyId, deletedAt: null, voucherNo: { in: pcvNos } },
            select: {
              branchUnitId: true,
              currencyCode: true,
              grossAmount: true,
              id: true,
              netAmount: true,
              partyCodeSnapshot: true,
              partyId: true,
              status: true,
              voucherNo: true,
            },
          })
        : [];
    const pcfs =
      pcfNos.length > 0
        ? await tx.pettyCashFund.findMany({
            where: { companyId: input.companyId, deletedAt: null, transactionNo: { in: pcfNos } },
            select: {
              branchUnitId: true,
              currencyCode: true,
              details: { select: { amount: true, disburseAmount: true, grossAmount: true } },
              id: true,
              partyCodeSnapshot: true,
              partyId: true,
              status: true,
              transactionNo: true,
            },
          })
        : [];

    for (const pcv of pcvs) {
      await this.lockAllocation(tx, PettyCashSourceAllocationLockNamespace, pcv.id);
    }
    for (const pcf of pcfs) {
      await this.lockAllocation(tx, PettyCashSourceAllocationLockNamespace, pcf.id);
    }

    const pcvByNo = new Map(pcvs.map((record) => [record.voucherNo, record] as const));
    const pcfByNo = new Map(pcfs.map((record) => [record.transactionNo, record] as const));
    const consumedAmounts = await this.getPettyCashReplenishmentConsumedAmounts(
      tx,
      input.companyId,
      [
        ...pcvs.map((record) => ({ source: 'PCV' as const, transactionNo: record.voucherNo })),
        ...pcfs.map((record) => ({ source: 'PCF' as const, transactionNo: record.transactionNo })),
      ],
      input.currentTargetId,
    );

    for (const allocation of allocations) {
      if (!input.partyId && !input.partyCode) {
        throw new BadRequestException(`Party is required when copying from ${allocation.source}.`);
      }

      const sourceSummary =
        allocation.source === 'PCV'
          ? (() => {
              const record = pcvByNo.get(allocation.transactionNo);
              if (!record) return null;
              return {
                branchUnitId: record.branchUnitId,
                currencyCode: record.currencyCode,
                disburseAmount: roundMoney(Number(record.netAmount)),
                grossAmount: roundMoney(Number(record.grossAmount)),
                isAvailable: record.status === PettyCashVoucherStatus.POSTED,
                partyCodeSnapshot: record.partyCodeSnapshot,
                partyId: record.partyId,
              };
            })()
          : (() => {
              const record = pcfByNo.get(allocation.transactionNo);
              if (!record) return null;
              return {
                branchUnitId: record.branchUnitId,
                currencyCode: record.currencyCode,
                disburseAmount: roundMoney(
                  record.details.reduce((sum, detail) => sum + Number(detail.disburseAmount || detail.amount || detail.grossAmount || 0), 0),
                ),
                grossAmount: roundMoney(record.details.reduce((sum, detail) => sum + Number(detail.grossAmount || detail.amount || 0), 0)),
                isAvailable: record.status === PettyCashFundStatus.POSTED,
                partyCodeSnapshot: record.partyCodeSnapshot,
                partyId: record.partyId,
              };
            })();
      if (!sourceSummary) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} was not found.`);
      }
      if (input.branchUnitId && sourceSummary.branchUnitId !== input.branchUnitId) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} belongs to a different branch.`);
      }
      if (input.partyId && sourceSummary.partyId !== input.partyId) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} belongs to a different party.`);
      }
      if (!input.partyId && input.partyCode && sourceSummary.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} belongs to a different party.`);
      }
      if (sourceSummary.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} uses ${sourceSummary.currencyCode}, not ${input.currencyCode}.`);
      }

      const sourceGrossAmount = sourceSummary.grossAmount;
      const sourceDisburseAmount = sourceSummary.disburseAmount;
      const consumed = consumedAmounts.get(`${allocation.source}:${allocation.transactionNo}`) ?? { grossAmount: 0, disburseAmount: 0 };
      const availableGrossAmount = roundMoney(sourceGrossAmount - consumed.grossAmount);
      const availableAmount = roundMoney(sourceDisburseAmount - consumed.disburseAmount);

      if (allocation.grossAmount > availableGrossAmount) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} only has ${availableGrossAmount.toFixed(2)} gross amount remaining.`);
      }
      if (allocation.disburseAmount > availableAmount) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} only has ${availableAmount.toFixed(2)} disburse amount remaining.`);
      }
      if (!sourceSummary.isAvailable) {
        throw new BadRequestException(`${allocation.source} ${allocation.transactionNo} is not available for replenishment copying.`);
      }
    }
  }

  private getPettyCashSourceDetailAmounts(details: PettyCashReplenishmentDetailDto[] = []) {
    const amountsByReference = new Map<string, { disburseAmount: number; grossAmount: number; source: 'PCF' | 'PCV'; transactionNo: string }>();
    for (const detail of details) {
      const reference = cleanOptional(detail.pettyCashNo ?? detail.voucherNo);
      if (!reference || (!reference.toUpperCase().startsWith('PCV:') && !reference.toUpperCase().startsWith('PCF:'))) {
        continue;
      }

      const source = reference.toUpperCase().startsWith('PCV:') ? 'PCV' : 'PCF';
      const transactionNo = reference.slice(4).trim();
      if (!transactionNo) {
        continue;
      }

      const key = `${source}:${transactionNo}`;
      const current = amountsByReference.get(key) ?? { disburseAmount: 0, grossAmount: 0, source, transactionNo };
      amountsByReference.set(key, {
        ...current,
        grossAmount: roundMoney(current.grossAmount + Number(detail.amount || 0)),
        disburseAmount: roundMoney(current.disburseAmount + Number(detail.disburseAmount || detail.amount || 0)),
      });
    }

    return [...amountsByReference.values()];
  }

  private async getPettyCashReplenishmentConsumedAmounts(
    tx: PrismaWriteClient,
    companyId: number,
    sources: Array<{ source: 'PCF' | 'PCV'; transactionNo: string }>,
    currentTargetId?: bigint,
  ) {
    const consumed = new Map<string, { disburseAmount: number; grossAmount: number }>();
    if (sources.length === 0) {
      return consumed;
    }

    const sourceKeyByReference = new Map<string, string>();
    for (const source of sources) {
      const reference = source.source === 'PCV' ? formatPettyCashVoucherReference(source.transactionNo) : formatPettyCashFundReference(source.transactionNo);
      sourceKeyByReference.set(reference, `${source.source}:${source.transactionNo}`);
      sourceKeyByReference.set(source.transactionNo, `${source.source}:${source.transactionNo}`);
    }

    const details = await tx.pettyCashReplenishmentDetail.findMany({
      where: {
        companyId,
        pettyCashNo: { in: [...sourceKeyByReference.keys()] },
        replenishment: {
          deletedAt: null,
          status: { in: ActivePettyCashReplenishmentStatuses },
          ...(currentTargetId ? { id: { not: currentTargetId } } : {}),
        },
      },
      select: { amount: true, disburseAmount: true, pettyCashNo: true },
    });

    for (const detail of details) {
      const reference = cleanOptional(detail.pettyCashNo);
      if (!reference) {
        continue;
      }
      const sourceKey = sourceKeyByReference.get(reference);
      if (!sourceKey) {
        continue;
      }
      const current = consumed.get(sourceKey) ?? { grossAmount: 0, disburseAmount: 0 };
      consumed.set(sourceKey, {
        grossAmount: roundMoney(current.grossAmount + Number(detail.amount || 0)),
        disburseAmount: roundMoney(current.disburseAmount + Number(detail.disburseAmount || detail.amount || 0)),
      });
    }

    return consumed;
  }

  private async lockAllocation(tx: Prisma.TransactionClient, namespace: bigint, sourceId: bigint) {
    const lockKey = (namespace << 32n) + sourceId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }

  private buildListWhere(
    companyId: number,
    branchUnitId: number | null,
    query: GetPettyCashReplenishmentListQueryDto,
  ): Prisma.PettyCashReplenishmentWhereInput {
    const where: Prisma.PettyCashReplenishmentWhereInput = {
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

  private buildOrderBy(query: GetPettyCashReplenishmentListQueryDto): Prisma.PettyCashReplenishmentOrderByWithRelationInput[] {
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

  private async resolveReferences(companyId: number, dto: CreatePettyCashReplenishmentDto) {
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
