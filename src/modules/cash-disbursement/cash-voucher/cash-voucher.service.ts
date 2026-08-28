import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashVoucherStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { CreateCashVoucherDto } from './dto/create-cash-voucher.dto';
import { GetCashVoucherListQueryDto } from './dto/get-cash-voucher-list-query.dto';
import { UpdateCashVoucherDto } from './dto/update-cash-voucher.dto';
import { UpdateCashVoucherStatusDto } from './dto/update-cash-voucher-status.dto';
import { mapCashVoucher } from './mappers/cash-voucher.mapper';
import { CashVoucherInclude, CashVoucherWithPayload } from './prisma/cash-voucher.include';

@Injectable()
export class CashVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tablePreferencesService: TablePreferencesService,
  ) {}

  async findAll(user: AuthUser, query: GetCashVoucherListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;

    const where: Prisma.CashVoucherWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (query.branchUnitId) {
      where.branchUnitId = query.branchUnitId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { voucherReferenceNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status?.trim()) {
      const statusUpper = query.status.trim().toUpperCase().replace(/[\s-]/g, '_');
      if (Object.values(CashVoucherStatus).includes(statusUpper as CashVoucherStatus)) {
        where.status = statusUpper as CashVoucherStatus;
      }
    }

    if (query.partyCode?.trim()) {
      where.partyCodeSnapshot = { equals: query.partyCode.trim(), mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      where.voucherDate = {};
      if (query.startDate) where.voucherDate.gte = new Date(query.startDate);
      if (query.endDate) where.voucherDate.lte = new Date(query.endDate);
    }

    if (query.amountFrom !== undefined || query.amountTo !== undefined) {
      where.amount = {};
      if (query.amountFrom !== undefined) where.amount.gte = query.amountFrom;
      if (query.amountTo !== undefined) where.amount.lte = query.amountTo;
    }

    const sortDirection = query.sortOrder || 'desc';
    let orderBy: Prisma.CashVoucherOrderByWithRelationInput = { createdAt: sortDirection };

    if (query.sortBy === 'voucherNo') {
      orderBy = { voucherNo: sortDirection };
    } else if (query.sortBy === 'voucherDate') {
      orderBy = { voucherDate: sortDirection };
    } else if (query.sortBy === 'partyName') {
      orderBy = { partyNameSnapshot: sortDirection };
    } else if (query.sortBy === 'partyCode') {
      orderBy = { partyCodeSnapshot: sortDirection };
    } else if (query.sortBy === 'amount') {
      orderBy = { amount: sortDirection };
    } else if (query.sortBy === 'status') {
      orderBy = { status: sortDirection };
    } else if (query.sortBy === 'updatedAt') {
      orderBy = { updatedAt: sortDirection };
    }

    const [records, total, statistics] = await Promise.all([
      this.prisma.cashVoucher.findMany({
        where,
        include: CashVoucherInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.cashVoucher.count({ where }),
      this.getStatistics(companyId, query.branchUnitId),
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
      statistics,
    };
  }

  async getStatistics(companyId: number, branchUnitId?: number) {
    const baseWhere: Prisma.CashVoucherWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (branchUnitId) {
      baseWhere.branchUnitId = branchUnitId;
    }

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

  async getNextTransactionNo(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const count = await this.prisma.cashVoucher.count({ where: { companyId } });
    const sequenceNumber = (count + 1).toString().padStart(6, '0');
    const year = new Date().getFullYear();
    const nextTransNo = `CV-${year}-${sequenceNumber}`;

    return { nextTransNo };
  }

  async findParties(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const parties = await this.prisma.party.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        partyCodeNo: true,
        partyName: true,
        firstName: true,
        lastName: true,
        tradeName: true,
      },
      orderBy: { partyCodeNo: 'asc' },
    });

    return {
      parties: parties.map((party) => {
        const name = party.partyName?.trim() || [party.firstName, party.lastName].filter(Boolean).join(' ') || party.tradeName || party.partyCodeNo;
        return {
          id: party.id.toString(),
          partyCode: party.partyCodeNo,
          partyName: name,
          name,
          label: party.partyCodeNo,
          value: party.partyCodeNo,
        };
      }),
    };
  }

  async findAccounts(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const accounts = await this.prisma.chartAccount.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
      },
      orderBy: { accountCode: 'asc' },
    });

    return {
      accounts: accounts.map((acc) => ({
        id: acc.id.toString(),
        accountCode: acc.accountCode,
        accountTitle: acc.accountTitle,
        label: acc.accountCode,
        name: acc.accountTitle,
        value: acc.accountCode,
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
      },
      orderBy: { code: 'asc' },
    });

    return {
      responsibilityCenters: centers.map((rc) => ({
        id: rc.id.toString(),
        code: rc.code,
        name: rc.name,
        category: rc.category,
        label: rc.code,
        value: rc.name,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const recordId = parsePositiveBigIntId(id);
    const record = await this.prisma.cashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: CashVoucherInclude,
    });

    if (!record) {
      throw new NotFoundException('Cash Voucher record not found.');
    }

    const mapped = (await this.mapWithAuditUsers([record]))[0];
    return { data: mapped };
  }

  async create(user: AuthUser, dto: CreateCashVoucherDto) {
    const companyId = this.getActiveCompanyId(user);
    const userId = user.id ? Number(user.id) : null;

    let voucherNo = cleanOptional(dto.voucherNo);
    if (!voucherNo) {
      const next = await this.getNextTransactionNo(user);
      voucherNo = next.nextTransNo;
    }

    const existing = await this.prisma.cashVoucher.findUnique({
      where: {
        companyId_voucherNo: {
          companyId,
          voucherNo,
        },
      },
    });

    if (existing && !existing.deletedAt) {
      throw new BadRequestException(`Cash Voucher No. "${voucherNo}" already exists for this company.`);
    }

    const partyId = parseOptionalPositiveBigIntId(dto.partyId);
    const creditAccountId = parseOptionalPositiveBigIntId(dto.creditAccountId);
    const currencyCode = cleanCurrencyCode(dto.currency) || 'PHP';
    const exchangeRate = new Prisma.Decimal(dto.fxRate ? String(dto.fxRate) : '1.00');

    // Calculate total amount from details if not provided
    const detailLines = dto.details || [];
    const calculatedAmount = detailLines.reduce((sum, line) => {
      const debit = Number(line.debit || 0);
      const gross = Number(line.grossAmount || 0);
      return sum + (debit > 0 ? debit : gross);
    }, 0);
    const amount = new Prisma.Decimal(dto.amount ? String(dto.amount) : String(calculatedAmount || 0));

    const status = dto.status || CashVoucherStatus.DRAFT;

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.cashVoucher.create({
        data: {
          companyId,
          branchUnitId: dto.branchUnitId ?? null,
          partyId: partyId ?? null,
          creditAccountId: creditAccountId ?? null,
          voucherNo,
          voucherDate: new Date(dto.voucherDate),
          paymentDueDate: dto.paymentDueDate ? new Date(dto.paymentDueDate) : null,
          referenceNo: cleanOptional(dto.referenceNo),
          referenceModule: cleanOptional(dto.referenceModule),
          voucherReferenceNo: cleanOptional(dto.voucherReferenceNo),
          invoiceReferenceNo: cleanOptional(dto.invoiceReferenceNo),
          paymentMethod: cleanOptional(dto.paymentMethod) || 'Cash',
          disbursementType: cleanOptional(dto.disbursementType),
          partyCodeSnapshot: dto.partyCode.trim(),
          partyNameSnapshot: dto.partyName.trim(),
          costCenter: cleanOptional(dto.costCenter),
          projectName: cleanOptional(dto.projectName),
          preparedBy: cleanOptional(dto.preparedBy),
          currencyCode,
          exchangeRate,
          amount,
          remarks: cleanOptional(dto.remarks),
          status,
          createdByUserId: userId,
          details: {
            create: detailLines.map((line, index) => {
              const lineAccountId = parseOptionalPositiveBigIntId(line.accountId);
              const linePartyId = parseOptionalPositiveBigIntId(line.partyId);
              const rcId = parseOptionalPositiveBigIntId(line.responsibilityCenterId);

              return {
                companyId,
                branchUnitId: dto.branchUnitId ?? null,
                lineNumber: line.lineNumber || index + 1,
                accountId: lineAccountId ?? null,
                accountCodeSnapshot: (line.accountCode || '').trim(),
                accountTitleSnapshot: (line.accountTitle || '').trim(),
                particulars: cleanOptional(line.particulars),
                remarks: cleanOptional(line.remarks),
                debit: new Prisma.Decimal(String(line.debit || 0)),
                credit: new Prisma.Decimal(String(line.credit || 0)),
                grossAmount: new Prisma.Decimal(String(line.grossAmount || 0)),
                netAmount: new Prisma.Decimal(String(line.netAmount || 0)),
                vatType: cleanOptional(line.vatType),
                vatCode: cleanOptional(line.vatCode),
                vatPercent: new Prisma.Decimal(String(line.vatPercent || 0)),
                vatAmount: new Prisma.Decimal(String(line.vatAmount || 0)),
                ewtCode: cleanOptional(line.ewtCode),
                ewtPercent: new Prisma.Decimal(String(line.ewtPercent || 0)),
                ewtAmount: new Prisma.Decimal(String(line.ewtAmount || 0)),
                disburseAmount: new Prisma.Decimal(String(line.disburseAmount || 0)),
                partyId: linePartyId ?? null,
                partyCodeSnapshot: cleanOptional(line.partyCode),
                partyNameSnapshot: cleanOptional(line.partyName),
                responsibilityCenterId: rcId ?? null,
                responsibilityCenterSnapshot: cleanOptional(line.responsibilityCenter),
                refId: cleanOptional(line.refId),
                checkDate: line.checkDate ? new Date(line.checkDate) : null,
                checkNo: cleanOptional(line.checkNo),
                checkStatus: cleanOptional(line.checkStatus),
              };
            }),
          },
        },
        include: CashVoucherInclude,
      });
    });

    const mapped = (await this.mapWithAuditUsers([created]))[0];
    return { data: mapped };
  }

  async update(user: AuthUser, id: string, dto: UpdateCashVoucherDto) {
    const companyId = this.getActiveCompanyId(user);
    const userId = user.id ? Number(user.id) : null;
    const recordId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
      include: { details: true },
    });

    if (!existing) {
      throw new NotFoundException('Cash Voucher record not found.');
    }

    const partyId = dto.partyId !== undefined ? parseOptionalPositiveBigIntId(dto.partyId) : existing.partyId;
    const creditAccountId = dto.creditAccountId !== undefined ? parseOptionalPositiveBigIntId(dto.creditAccountId) : existing.creditAccountId;
    const currencyCode = dto.currency ? cleanCurrencyCode(dto.currency) || existing.currencyCode : existing.currencyCode;
    const exchangeRate = dto.fxRate !== undefined ? new Prisma.Decimal(String(dto.fxRate)) : existing.exchangeRate;

    const detailLines = dto.details;
    let amount = existing.amount;

    if (dto.amount !== undefined) {
      amount = new Prisma.Decimal(String(dto.amount));
    } else if (detailLines) {
      const calculatedAmount = detailLines.reduce((sum, line) => {
        const debit = Number(line.debit || 0);
        const gross = Number(line.grossAmount || 0);
        return sum + (debit > 0 ? debit : gross);
      }, 0);
      amount = new Prisma.Decimal(String(calculatedAmount || 0));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (detailLines) {
        await tx.cashVoucherDetail.deleteMany({
          where: { voucherId: recordId },
        });
      }

      return tx.cashVoucher.update({
        where: { id: recordId },
        data: {
          branchUnitId: dto.branchUnitId !== undefined ? dto.branchUnitId : existing.branchUnitId,
          partyId: partyId ?? null,
          creditAccountId: creditAccountId ?? null,
          voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : existing.voucherDate,
          paymentDueDate: dto.paymentDueDate !== undefined ? (dto.paymentDueDate ? new Date(dto.paymentDueDate) : null) : existing.paymentDueDate,
          referenceNo: dto.referenceNo !== undefined ? cleanOptional(dto.referenceNo) : existing.referenceNo,
          referenceModule: dto.referenceModule !== undefined ? cleanOptional(dto.referenceModule) : existing.referenceModule,
          voucherReferenceNo: dto.voucherReferenceNo !== undefined ? cleanOptional(dto.voucherReferenceNo) : existing.voucherReferenceNo,
          invoiceReferenceNo: dto.invoiceReferenceNo !== undefined ? cleanOptional(dto.invoiceReferenceNo) : existing.invoiceReferenceNo,
          paymentMethod: dto.paymentMethod !== undefined ? cleanOptional(dto.paymentMethod) || 'Cash' : existing.paymentMethod,
          disbursementType: dto.disbursementType !== undefined ? cleanOptional(dto.disbursementType) : existing.disbursementType,
          partyCodeSnapshot: dto.partyCode ? dto.partyCode.trim() : existing.partyCodeSnapshot,
          partyNameSnapshot: dto.partyName ? dto.partyName.trim() : existing.partyNameSnapshot,
          costCenter: dto.costCenter !== undefined ? cleanOptional(dto.costCenter) : existing.costCenter,
          projectName: dto.projectName !== undefined ? cleanOptional(dto.projectName) : existing.projectName,
          preparedBy: dto.preparedBy !== undefined ? cleanOptional(dto.preparedBy) : existing.preparedBy,
          currencyCode,
          exchangeRate,
          amount,
          remarks: dto.remarks !== undefined ? cleanOptional(dto.remarks) : existing.remarks,
          status: dto.status || existing.status,
          updatedByUserId: userId,
          ...(detailLines
            ? {
                details: {
                  create: detailLines.map((line, index) => {
                    const lineAccountId = parseOptionalPositiveBigIntId(line.accountId);
                    const linePartyId = parseOptionalPositiveBigIntId(line.partyId);
                    const rcId = parseOptionalPositiveBigIntId(line.responsibilityCenterId);

                    return {
                      companyId,
                      branchUnitId: dto.branchUnitId ?? existing.branchUnitId,
                      lineNumber: line.lineNumber || index + 1,
                      accountId: lineAccountId ?? null,
                      accountCodeSnapshot: (line.accountCode || '').trim(),
                      accountTitleSnapshot: (line.accountTitle || '').trim(),
                      particulars: cleanOptional(line.particulars),
                      remarks: cleanOptional(line.remarks),
                      debit: new Prisma.Decimal(String(line.debit || 0)),
                      credit: new Prisma.Decimal(String(line.credit || 0)),
                      grossAmount: new Prisma.Decimal(String(line.grossAmount || 0)),
                      netAmount: new Prisma.Decimal(String(line.netAmount || 0)),
                      vatType: cleanOptional(line.vatType),
                      vatCode: cleanOptional(line.vatCode),
                      vatPercent: new Prisma.Decimal(String(line.vatPercent || 0)),
                      vatAmount: new Prisma.Decimal(String(line.vatAmount || 0)),
                      ewtCode: cleanOptional(line.ewtCode),
                      ewtPercent: new Prisma.Decimal(String(line.ewtPercent || 0)),
                      ewtAmount: new Prisma.Decimal(String(line.ewtAmount || 0)),
                      disburseAmount: new Prisma.Decimal(String(line.disburseAmount || 0)),
                      partyId: linePartyId ?? null,
                      partyCodeSnapshot: cleanOptional(line.partyCode),
                      partyNameSnapshot: cleanOptional(line.partyName),
                      responsibilityCenterId: rcId ?? null,
                      responsibilityCenterSnapshot: cleanOptional(line.responsibilityCenter),
                      refId: cleanOptional(line.refId),
                      checkDate: line.checkDate ? new Date(line.checkDate) : null,
                      checkNo: cleanOptional(line.checkNo),
                      checkStatus: cleanOptional(line.checkStatus),
                    };
                  }),
                },
              }
            : {}),
        },
        include: CashVoucherInclude,
      });
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return { data: mapped };
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateCashVoucherStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    const userId = user.id ? Number(user.id) : null;
    const recordId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Cash Voucher record not found.');
    }

    const now = new Date();
    const data: Prisma.CashVoucherUpdateInput = {
      status: dto.status,
      updatedByUserId: userId,
    };

    if (dto.status === CashVoucherStatus.APPROVED) {
      data.approvedByUserId = userId;
      data.approvedAt = now;
    } else if (dto.status === CashVoucherStatus.POSTED) {
      data.postedByUserId = userId;
      data.postedAt = now;
    } else if (dto.status === CashVoucherStatus.DISAPPROVED) {
      data.disapprovedByUserId = userId;
      data.disapprovedAt = now;
    } else if (dto.status === CashVoucherStatus.CANCELLED) {
      data.cancelledByUserId = userId;
      data.cancelledAt = now;
    }

    const updated = await this.prisma.cashVoucher.update({
      where: { id: recordId },
      data,
      include: CashVoucherInclude,
    });

    const mapped = (await this.mapWithAuditUsers([updated]))[0];
    return { data: mapped };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const userId = user.id ? Number(user.id) : null;
    const recordId = parsePositiveBigIntId(id);

    const existing = await this.prisma.cashVoucher.findFirst({
      where: { id: recordId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Cash Voucher record not found.');
    }

    await this.prisma.cashVoucher.update({
      where: { id: recordId },
      data: {
        deletedAt: new Date(),
        status: CashVoucherStatus.CANCELLED,
        cancelledByUserId: userId,
        cancelledAt: new Date(),
        updatedByUserId: userId,
      },
    });

    return { message: 'Cash Voucher record cancelled successfully.' };
  }

  private async mapWithAuditUsers(records: CashVoucherWithPayload[]) {
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

  private getActiveCompanyId(user: AuthUser): number {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }
    return user.companyId;
  }
}
