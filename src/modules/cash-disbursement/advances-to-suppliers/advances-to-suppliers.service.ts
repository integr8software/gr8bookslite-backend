import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdvanceToSupplierPaymentType, AdvanceToSupplierStatus, CompanyUnitType, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { roundMoney } from '../../../common/utils/money.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { formatPurchaseOrderReference } from '../../purchasing/purchase-order/purchase-order.service';
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

export { AdvanceToSupplierCopySourceLabel, formatAdvanceToSupplierReference } from './copy-from/advance-to-supplier-copy-source.service';

const AdvancesToSuppliersModuleCode = 'ATS';
const PurchaseOrderAllocationLockNamespace = 7096n;
const ActiveAdvanceToSupplierStatuses = [
  AdvanceToSupplierStatus.DRAFT,
  AdvanceToSupplierStatus.FOR_APPROVAL,
  AdvanceToSupplierStatus.POSTED,
  AdvanceToSupplierStatus.POSTED,
];

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;

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

    const created = await this.prisma.$transaction(async (tx) => {
      await this.validatePurchaseOrderCopyReference(tx, {
        branchUnitId,
        companyId,
        currencyCode: dto.currency?.trim() || 'PHP',
        partyCode: references.party?.partyCodeNo ?? partyCode,
        partyId: references.party?.id ?? null,
        poReference: dto.poReference,
        requestedAmount: this.toDecimal(dto.advancePaymentAmount, '0.00'),
        totalPoAmount: this.toDecimal(dto.totalPoAmount, '0.00'),
      });

      return tx.advanceToSupplier.create({
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
          poReference: normalizePurchaseOrderReference(dto.poReference),
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

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.validatePurchaseOrderCopyReference(tx, {
        branchUnitId: existing.branchUnitId ?? (await this.resolveBranchUnitId(companyId, dto.branchUnitId)),
        companyId,
        currencyCode: dto.currency ?? existing.currencyCode,
        currentTargetId: recordId,
        partyCode: references.party?.partyCodeNo ?? dto.partyCode ?? existing.partyCodeSnapshot,
        partyId: references.party?.id ?? existing.partyId,
        poReference: dto.poReference ?? existing.poReference,
        requestedAmount: dto.advancePaymentAmount ? this.toDecimal(dto.advancePaymentAmount, '0.00') : existing.amount,
        totalPoAmount: dto.totalPoAmount ? this.toDecimal(dto.totalPoAmount, '0.00') : existing.totalPoAmount,
      });

      return tx.advanceToSupplier.update({
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
          ...(dto.poReference ? { poReference: normalizePurchaseOrderReference(dto.poReference) } : {}),
          ...(dto.totalPoAmount ? { totalPoAmount: this.toDecimal(dto.totalPoAmount, '0.00') } : {}),
          ...(dto.advancePaymentType ? { advancePaymentType: dto.advancePaymentType } : {}),
          ...(dto.advancePaymentPercentage ? { advancePaymentPercentage: this.toDecimal(dto.advancePaymentPercentage, '0.00') } : {}),
          ...(dto.advancePaymentAmount ? { amount: this.toDecimal(dto.advancePaymentAmount, '0.00') } : {}),
          ...(dto.remarks !== undefined ? { remarks: cleanOptional(dto.remarks) } : {}),
          updatedByUserId: user.id,
        },
        include: AdvanceToSupplierInclude,
      });
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

    const updated = await this.prisma.$transaction(async (tx) => {
      if (this.isSubmittedStatus(dto.status)) {
        await this.validatePurchaseOrderCopyReference(tx, {
          branchUnitId: existing.branchUnitId,
          companyId,
          currencyCode: existing.currencyCode,
          currentTargetId: recordId,
          partyCode: existing.partyCodeSnapshot,
          partyId: existing.partyId,
          poReference: existing.poReference,
          requestedAmount: existing.amount,
          totalPoAmount: existing.totalPoAmount,
        });
      }

      const actionDate = new Date();
      return tx.advanceToSupplier.update({
        where: { id: recordId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
          ...(dto.status === AdvanceToSupplierStatus.POSTED ? { approvedByUserId: user.id, approvedAt: actionDate } : {}),
          ...(dto.status === AdvanceToSupplierStatus.POSTED ? { postedByUserId: user.id, postedAt: actionDate } : {}),
          ...(dto.status === AdvanceToSupplierStatus.DISAPPROVED ? { disapprovedByUserId: user.id, disapprovedAt: actionDate } : {}),
          ...(dto.status === AdvanceToSupplierStatus.CANCELLED ? { cancelledByUserId: user.id, cancelledAt: actionDate } : {}),
        },
        include: AdvanceToSupplierInclude,
      });
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
    return status === AdvanceToSupplierStatus.FOR_APPROVAL || status === AdvanceToSupplierStatus.POSTED;
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

  private async validatePurchaseOrderCopyReference(
    tx: PrismaWriteClient,
    input: {
      branchUnitId: number | null;
      companyId: number;
      currencyCode: string;
      currentTargetId?: bigint;
      partyCode: string;
      partyId?: bigint | null;
      poReference?: string | null;
      requestedAmount: Prisma.Decimal;
      totalPoAmount: Prisma.Decimal;
    },
  ) {
    const poReference = cleanOptional(input.poReference);
    if (!poReference) {
      return;
    }

    const transactionNo = parsePurchaseOrderReference(poReference);
    const source = await tx.purchaseOrder.findFirst({
      where: {
        companyId: input.companyId,
        deletedAt: null,
        transNo: { equals: transactionNo, mode: 'insensitive' },
        ...(input.branchUnitId ? { branchUnitId: input.branchUnitId } : {}),
      },
      include: {
        entries: true,
      },
    });

    if (!source) {
      throw new BadRequestException('Select a valid Purchase Order for this Advances to Suppliers record.');
    }

    await this.lockPurchaseOrderAllocation(tx, source.id);

    if (source.status !== PurchaseOrderStatus.POSTED) {
      throw new BadRequestException(`PO ${source.transNo} is not available for Advances to Suppliers copying.`);
    }

    if (input.branchUnitId && source.branchUnitId !== input.branchUnitId) {
      throw new BadRequestException(`PO ${source.transNo} belongs to a different branch.`);
    }

    if (input.partyId && source.partyId !== input.partyId) {
      throw new BadRequestException(`PO ${source.transNo} belongs to a different supplier.`);
    }

    if (!input.partyId && input.partyCode && source.partyCodeSnapshot.trim().toLowerCase() !== input.partyCode.trim().toLowerCase()) {
      throw new BadRequestException(`PO ${source.transNo} belongs to a different supplier.`);
    }

    if (source.currencyCode.trim().toUpperCase() !== input.currencyCode.trim().toUpperCase()) {
      throw new BadRequestException(`PO ${source.transNo} uses ${source.currencyCode}, not ${input.currencyCode}.`);
    }

    const sourceAmount = roundMoney(source.entries.reduce((sum, entry) => sum + Number(entry.netAmount), 0));
    if (!input.totalPoAmount.equals(0) && Math.abs(Number(input.totalPoAmount) - sourceAmount) > 0.01) {
      throw new BadRequestException(`PO ${source.transNo} total amount has changed. Copy the Purchase Order again.`);
    }

    const consumedAmount = await this.getPurchaseOrderConsumedAmount(tx, input.companyId, source.transNo, input.currentTargetId);
    const availableAmount = roundMoney(sourceAmount - consumedAmount);
    if (Number(input.requestedAmount) > availableAmount) {
      throw new BadRequestException(`PO ${source.transNo} only has ${availableAmount.toFixed(2)} available for supplier advances.`);
    }
  }

  private async getPurchaseOrderConsumedAmount(tx: PrismaWriteClient, companyId: number, transactionNo: string, currentTargetId?: bigint) {
    const refs = [transactionNo, formatPurchaseOrderReference(transactionNo)];
    const rows = await tx.advanceToSupplier.aggregate({
      where: {
        companyId,
        deletedAt: null,
        poReference: { in: refs },
        status: { in: ActiveAdvanceToSupplierStatuses },
        ...(currentTargetId ? { id: { not: currentTargetId } } : {}),
      },
      _sum: { amount: true },
    });

    return roundMoney(Number(rows._sum.amount ?? 0));
  }

  private async lockPurchaseOrderAllocation(tx: PrismaWriteClient, purchaseOrderId: bigint) {
    if (!('$executeRaw' in tx)) {
      return;
    }

    const lockKey = (PurchaseOrderAllocationLockNamespace << 32n) + purchaseOrderId;
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey})`);
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

function normalizePurchaseOrderReference(reference?: string | null) {
  const normalized = cleanOptional(reference);
  if (!normalized) {
    return '';
  }

  return formatPurchaseOrderReference(parsePurchaseOrderReference(normalized));
}

function parsePurchaseOrderReference(reference: string) {
  const separatorIndex = reference.indexOf(':');
  if (separatorIndex < 0) {
    return reference.trim();
  }

  const prefix = reference.slice(0, separatorIndex).trim().toUpperCase();
  const transactionNo = reference.slice(separatorIndex + 1).trim();
  if (prefix !== 'PO' || !transactionNo) {
    throw new BadRequestException('Purchase Order reference must use PO:<transactionNo>.');
  }

  return transactionNo;
}
