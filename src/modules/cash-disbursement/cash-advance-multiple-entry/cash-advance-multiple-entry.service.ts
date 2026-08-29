import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashAdvanceStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames, SystemGeneratedAuditLabel } from '../../../common/utils/audit-user.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCashAdvanceMultipleEntryDto,
  GetCashAdvanceMultipleEntryListQueryDto,
  UpdateCashAdvanceMultipleEntryDto,
  UpdateCashAdvanceMultipleEntryStatusDto,
} from './dto/cash-advance-multiple-entry.dto';

const BatchPrefix = 'CAME-';
const BatchTransNoPattern = /^(CAME-\d{4}-\d{6})/;

type CashAdvanceBatchRow = Prisma.CashAdvanceGetPayload<{
  include: typeof CashAdvanceMultipleEntryInclude;
}>;

const CashAdvanceMultipleEntryInclude = {
  party: {
    select: {
      id: true,
      partyCodeNo: true,
      partyName: true,
      cashAdvanceLimit: true,
    },
  },
  creditAccount: {
    select: {
      id: true,
      accountCode: true,
      accountTitle: true,
    },
  },
} satisfies Prisma.CashAdvanceInclude;

@Injectable()
export class CashAdvanceMultipleEntryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetCashAdvanceMultipleEntryListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const status = this.normalizeStatus(query.status);
    const search = query.search?.trim().toLowerCase();

    const rows = await this.prisma.cashAdvance.findMany({
      where: {
        companyId,
        deletedAt: null,
        transNo: { startsWith: BatchPrefix },
        ...(status ? { status } : {}),
      },
      include: CashAdvanceMultipleEntryInclude,
      orderBy: [{ createdAt: 'desc' }, { transNo: 'asc' }],
    });

    const records = (await this.mapGroups(rows))
      .filter((record) => {
        if (!search) return true;

        return [record.transNo, record.partyCode, record.partyName, record.accountCode, record.accountTitle, record.costCenter, record.remarks]
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));

    const total = records.length;
    const data = records.slice((page - 1) * limit, page * limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getNextTransactionNo(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    const rows = await this.prisma.cashAdvance.findMany({
      where: { companyId, transNo: { startsWith: BatchPrefix } },
      select: { transNo: true },
    });
    const year = new Date().getFullYear();
    const maxSequence = rows.reduce((max, row) => {
      const match = row.transNo.match(BatchTransNoPattern);
      const sequence = match ? Number(match[1].split('-').at(-1)) : 0;
      return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
    }, 0);

    return { nextTransNo: `${BatchPrefix}${year}-${String(maxSequence + 1).padStart(6, '0')}` };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const rows = await this.findBatchRows(companyId, id);

    if (rows.length === 0) {
      throw new NotFoundException('Cash Advance Multiple Entry record not found.');
    }

    const record = (await this.mapGroups(rows))[0];
    return { data: record };
  }

  async create(user: AuthUser, dto: CreateCashAdvanceMultipleEntryDto) {
    const companyId = this.getActiveCompanyId(user);
    const transNo = dto.transNo?.trim() || (await this.getNextTransactionNo(user)).nextTransNo;
    const existing = await this.prisma.cashAdvance.findFirst({
      where: { companyId, transNo: { startsWith: transNo }, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Cash Advance Multiple Entry transaction number already exists.');
    }

    await this.createRows(user, companyId, transNo, dto);
    return this.findOne(user, transNo);
  }

  async update(user: AuthUser, id: string, dto: UpdateCashAdvanceMultipleEntryDto) {
    const companyId = this.getActiveCompanyId(user);
    const rows = await this.findBatchRows(companyId, id);

    if (rows.length === 0) {
      throw new NotFoundException('Cash Advance Multiple Entry record not found.');
    }

    if (rows.some((row) => row.status !== CashAdvanceStatus.DRAFT)) {
      throw new BadRequestException('Only Draft Cash Advance Multiple Entry records can be updated.');
    }

    const batchNo = getBatchTransNo(rows[0].transNo);
    await this.prisma.$transaction(async (tx) => {
      await tx.cashAdvance.updateMany({
        where: { companyId, transNo: { startsWith: batchNo }, deletedAt: null },
        data: { deletedAt: new Date(), updatedByUserId: user.id },
      });
      await this.createRows(user, companyId, batchNo, dto, tx);
    });

    return this.findOne(user, batchNo);
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateCashAdvanceMultipleEntryStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    const rows = await this.findBatchRows(companyId, id);

    if (rows.length === 0) {
      throw new NotFoundException('Cash Advance Multiple Entry record not found.');
    }

    const batchNo = getBatchTransNo(rows[0].transNo);
    const actionDate = new Date();
    await this.prisma.cashAdvance.updateMany({
      where: { companyId, transNo: { startsWith: batchNo }, deletedAt: null },
      data: {
        status: dto.status,
        updatedByUserId: user.id,
        ...(dto.status === CashAdvanceStatus.POSTED ? { postedByUserId: user.id, postedAt: actionDate } : {}),
        ...(dto.status === CashAdvanceStatus.DISAPPROVED ? { disapprovedByUserId: user.id, disapprovedAt: actionDate } : {}),
        ...(dto.status === CashAdvanceStatus.CANCELLED ? { cancelledByUserId: user.id, cancelledAt: actionDate } : {}),
      },
    });

    return this.findOne(user, batchNo);
  }

  async remove(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    const rows = await this.findBatchRows(companyId, id);

    if (rows.length === 0) {
      throw new NotFoundException('Cash Advance Multiple Entry record not found.');
    }

    const batchNo = getBatchTransNo(rows[0].transNo);
    await this.prisma.cashAdvance.updateMany({
      where: { companyId, transNo: { startsWith: batchNo }, deletedAt: null },
      data: {
        status: CashAdvanceStatus.CANCELLED,
        deletedAt: new Date(),
        cancelledByUserId: user.id,
        cancelledAt: new Date(),
        updatedByUserId: user.id,
      },
    });

    return { message: 'Cash Advance Multiple Entry record cancelled successfully.' };
  }

  private async createRows(
    user: AuthUser,
    companyId: number,
    batchNo: string,
    dto: CreateCashAdvanceMultipleEntryDto,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const validItems = (dto.items ?? []).filter((item) => item.partyCode?.trim() && item.partyName?.trim());

    if (validItems.length === 0) {
      throw new BadRequestException('Add at least one cash advance entry.');
    }

    const creditAccount = await this.prisma.chartAccount.findFirst({
      where: { companyId, accountCode: dto.accountCode.trim(), deletedAt: null },
    });
    const status = dto.status ?? CashAdvanceStatus.DRAFT;

    for (const [index, item] of validItems.entries()) {
      const party = await this.prisma.party.findFirst({
        where: { companyId, partyCodeNo: item.partyCode.trim(), deletedAt: null },
      });
      const lineNo = String(index + 1).padStart(3, '0');

      await tx.cashAdvance.create({
        data: {
          companyId,
          partyId: party?.id ?? null,
          creditAccountId: creditAccount?.id ?? null,
          transNo: `${batchNo}-L${lineNo}`,
          documentDate: new Date(dto.documentDate),
          dueDate: new Date(dto.documentDate),
          partyCodeSnapshot: item.partyCode.trim(),
          partyNameSnapshot: item.partyName.trim(),
          accountCodeSnapshot: dto.accountCode.trim(),
          accountTitleSnapshot: cleanOptional(dto.accountTitle) || creditAccount?.accountTitle || null,
          costCenterSnapshot: cleanOptional(item.responsibilityCenter) || cleanOptional(dto.costCenter),
          projectNameSnapshot: cleanOptional(dto.projectName) ?? cleanOptional(dto.projectRef),
          projectCodeSnapshot: cleanOptional(dto.projectCode),
          currencyCode: dto.currency.trim() || 'PHP',
          exchangeRate: new Prisma.Decimal((dto.exchangeRate || '1.0000').replaceAll(',', '').trim() || '1.0000'),
          amount: new Prisma.Decimal((item.amount || '0.00').replaceAll(',', '').trim() || '0.00'),
          remarks: cleanOptional(item.particulars) || cleanOptional(dto.remarks),
          status,
          createdByUserId: user.id,
        },
      });
    }
  }

  private async findBatchRows(companyId: number, id: string) {
    const batchNo = getBatchTransNo(id);
    return this.prisma.cashAdvance.findMany({
      where: { companyId, deletedAt: null, transNo: { startsWith: batchNo } },
      include: CashAdvanceMultipleEntryInclude,
      orderBy: { transNo: 'asc' },
    });
  }

  private async mapGroups(rows: CashAdvanceBatchRow[]) {
    const groups = new Map<string, CashAdvanceBatchRow[]>();

    for (const row of rows) {
      const batchNo = getBatchTransNo(row.transNo);
      groups.set(batchNo, [...(groups.get(batchNo) ?? []), row]);
    }

    const userIds = new Set<number>();
    for (const row of rows) {
      if (row.createdByUserId) userIds.add(row.createdByUserId);
      if (row.updatedByUserId) userIds.add(row.updatedByUserId);
    }

    const userNames = await resolveAuditUserNames(this.prisma, [...userIds]);

    return [...groups.entries()].map(([batchNo, batchRows]) => {
      const first = batchRows[0];
      const amount = batchRows.reduce((total, row) => total + Number(row.amount), 0);
      const items = batchRows.map((row) => ({
        id: row.id.toString(),
        partyCode: row.partyCodeSnapshot,
        partyName: row.partyNameSnapshot,
        cashAdvanceBalance: '',
        cashAdvanceLimit: row.party?.cashAdvanceLimit != null ? Number(row.party.cashAdvanceLimit).toFixed(2) : '',
        particulars: row.remarks ?? '',
        remarks: row.remarks ?? '',
        amount: Number(row.amount).toFixed(2),
        responsibilityCenter: row.costCenterSnapshot ?? '',
      }));
      const accountingEntries = items.map((item, index) => ({
        id: `${batchNo}-accounting-${index + 1}`,
        accountCode: first.accountCodeSnapshot,
        accountTitle: first.accountTitleSnapshot ?? first.creditAccount?.accountTitle ?? '',
        debit: item.amount,
        credit: '',
        partyCode: item.partyCode,
        partyName: item.partyName,
        particulars: item.particulars,
        remarks: item.remarks,
        responsibilityCenter: item.responsibilityCenter,
      }));

      return {
        id: batchNo,
        transNo: batchNo,
        documentDate: first.documentDate.toISOString().slice(0, 10),
        partyCode: first.partyCodeSnapshot,
        partyName: first.partyNameSnapshot,
        projectCode: first.projectCodeSnapshot ?? '',
        projectName: first.projectNameSnapshot ?? '',
        accountCode: first.accountCodeSnapshot,
        accountTitle: first.accountTitleSnapshot ?? first.creditAccount?.accountTitle ?? '',
        costCenter: first.costCenterSnapshot ?? '',
        amount,
        remarks: first.remarks ?? '',
        status: first.status,
        formValues: {
          accountCode: first.accountCodeSnapshot,
          accountTitle: first.accountTitleSnapshot ?? first.creditAccount?.accountTitle ?? '',
          accountingEntries,
          attachments: [],
          contractNo: '',
          costCenter: first.costCenterSnapshot ?? '',
          currency: first.currencyCode,
          documentDate: first.documentDate.toISOString().slice(0, 10),
          exchangeRate: Number(first.exchangeRate).toFixed(2),
          items,
          partyCode: first.partyCodeSnapshot,
          partyName: first.partyNameSnapshot,
          projectCode: first.projectCodeSnapshot ?? '',
          projectName: first.projectNameSnapshot ?? '',
          projectRef: first.projectNameSnapshot ?? '',
          remarks: first.remarks ?? '',
          status: first.status,
          totalAmount: amount.toFixed(2),
          transNo: batchNo,
        },
        createdBy: first.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(first.createdByUserId) ?? null),
        createdAt: first.createdAt.toISOString(),
        updatedBy: (first.updatedByUserId && userNames.get(first.updatedByUserId)) ?? null,
        updatedAt: first.updatedAt.toISOString(),
      };
    });
  }

  private normalizeStatus(status?: string) {
    if (!status?.trim() || status === 'all') {
      return null;
    }

    const normalized = status.trim().toUpperCase().replaceAll(' ', '_');
    return Object.values(CashAdvanceStatus).includes(normalized as CashAdvanceStatus) ? (normalized as CashAdvanceStatus) : null;
  }

  private getActiveCompanyId(user: AuthUser): number {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }
    return user.companyId;
  }
}

function getBatchTransNo(value: string) {
  const match = value.trim().match(BatchTransNoPattern);
  return match ? match[1] : value.trim();
}
