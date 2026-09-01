import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashAdvanceStatus, CompanyUnitType, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames, SystemGeneratedAuditLabel } from '../../../common/utils/audit-user.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import {
  CreateCashAdvanceMultipleEntryDto,
  GetCashAdvanceMultipleEntryListQueryDto,
  UpdateCashAdvanceMultipleEntryDto,
  UpdateCashAdvanceMultipleEntryStatusDto,
} from './dto/cash-advance-multiple-entry.dto';

const BatchPrefix = 'CAME-';
const BatchTransNoPattern = /^(CAME-\d{4}-\d{6})/;
const CashAdvanceMultipleEntryModuleCode = 'CAME';

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

  async suggestTransactionNumber(user: AuthUser, requestedBranchUnitId?: number | string) {
    const companyId = this.getActiveCompanyId(user);
    const branchUnitId = await this.resolveBranchUnitId(companyId, requestedBranchUnitId);
    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: CashAdvanceMultipleEntryModuleCode,
      isIssued: (transactionNo) => this.isBatchNoIssued(companyId, transactionNo),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
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
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const transNo = await resolveTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: CashAdvanceMultipleEntryModuleCode,
      requestedTransactionNumber: cleanOptional(dto.transNo),
      isIssued: (transactionNo) => this.isBatchNoIssued(companyId, transactionNo),
    });
    const existing = await this.prisma.cashAdvance.findFirst({
      where: { companyId, transNo: { startsWith: transNo }, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Cash Advance Multiple Entry transaction number already exists.');
    }

    const status = dto.status ?? CashAdvanceStatus.DRAFT;
    if (this.isSubmittedStatus(status)) {
      this.assertCashAdvanceMultipleEntryDtoReady(dto);
    }

    await this.createRows(user, companyId, branchUnitId, transNo, dto);
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
    const status = dto.status ?? CashAdvanceStatus.DRAFT;
    if (this.isSubmittedStatus(status)) {
      this.assertCashAdvanceMultipleEntryDtoReady(dto);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cashAdvance.updateMany({
        where: { companyId, transNo: { startsWith: batchNo }, deletedAt: null },
        data: { deletedAt: new Date(), updatedByUserId: user.id },
      });
      const branchUnitId = rows[0].branchUnitId ?? (await this.resolveBranchUnitId(companyId, dto.branchUnitId));
      await this.createRows(user, companyId, branchUnitId, batchNo, dto, tx);
    });

    return this.findOne(user, batchNo);
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateCashAdvanceMultipleEntryStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    const rows = await this.findBatchRows(companyId, id);

    if (rows.length === 0) {
      throw new NotFoundException('Cash Advance Multiple Entry record not found.');
    }

    if (this.isSubmittedStatus(dto.status)) {
      this.assertCashAdvanceMultipleEntryRowsReady(rows);
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
    branchUnitId: number,
    batchNo: string,
    dto: CreateCashAdvanceMultipleEntryDto,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const status = dto.status ?? CashAdvanceStatus.DRAFT;
    const sourceItems =
      status === CashAdvanceStatus.DRAFT
        ? ((dto.items ?? []).filter((item) => item.partyCode?.trim() || item.partyName?.trim() || item.amount?.trim()) ?? [])
        : (dto.items ?? []).filter((item) => item.partyCode?.trim() && item.partyName?.trim());
    const validItems = sourceItems.length > 0 ? sourceItems : status === CashAdvanceStatus.DRAFT ? [{ partyCode: '', partyName: '', amount: '0.00' }] : [];

    if (validItems.length === 0) {
      throw new BadRequestException('Add at least one cash advance entry.');
    }

    const accountCode = dto.accountCode?.trim() ?? '';
    const creditAccount = accountCode
      ? await this.prisma.chartAccount.findFirst({
          where: { companyId, accountCode, deletedAt: null },
        })
      : null;

    for (const [index, item] of validItems.entries()) {
      const partyCode = item.partyCode?.trim() ?? '';
      const partyName = item.partyName?.trim() ?? '';
      const party = partyCode
        ? await this.prisma.party.findFirst({
            where: { companyId, partyCodeNo: partyCode, deletedAt: null },
          })
        : null;
      const lineNo = String(index + 1).padStart(3, '0');

      await tx.cashAdvance.create({
        data: {
          companyId,
          branchUnitId,
          partyId: party?.id ?? null,
          creditAccountId: creditAccount?.id ?? null,
          transNo: `${batchNo}-L${lineNo}`,
          documentDate: new Date(dto.documentDate),
          dueDate: new Date(dto.documentDate),
          partyCodeSnapshot: partyCode,
          partyNameSnapshot: partyName,
          accountCodeSnapshot: accountCode,
          accountTitleSnapshot: cleanOptional(dto.accountTitle) || creditAccount?.accountTitle || null,
          costCenterSnapshot: cleanOptional(item.responsibilityCenter) || cleanOptional(dto.costCenter),
          projectNameSnapshot: cleanOptional(dto.projectName) ?? cleanOptional(dto.projectRef),
          projectCodeSnapshot: cleanOptional(dto.projectCode),
          currencyCode: dto.currency?.trim() || 'PHP',
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

  private async isBatchNoIssued(companyId: number, transactionNo: string) {
    const batchNo = getBatchTransNo(transactionNo);
    const count = await this.prisma.cashAdvance.count({
      where: { companyId, transNo: { startsWith: batchNo }, deletedAt: null },
    });
    return count > 0;
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

  private isSubmittedStatus(status: CashAdvanceStatus) {
    return status === CashAdvanceStatus.FOR_APPROVAL || status === CashAdvanceStatus.APPROVED || status === CashAdvanceStatus.POSTED;
  }

  private assertCashAdvanceMultipleEntryDtoReady(dto: CreateCashAdvanceMultipleEntryDto) {
    if (!dto.accountCode?.trim()) {
      throw new BadRequestException('Select a default account before submitting this Cash Advance Multiple Entry.');
    }

    const validItems = (dto.items ?? []).filter(
      (item) => item.partyCode?.trim() && item.partyName?.trim() && Number((item.amount ?? '0').replaceAll(',', '')) > 0,
    );
    if (validItems.length === 0) {
      throw new BadRequestException('Add at least one cash advance entry with a party and non-zero amount before submitting.');
    }
  }

  private assertCashAdvanceMultipleEntryRowsReady(rows: CashAdvanceBatchRow[]) {
    if (rows.some((row) => !row.accountCodeSnapshot?.trim())) {
      throw new BadRequestException('Select a default account before submitting this Cash Advance Multiple Entry.');
    }

    const validRows = rows.filter((row) => row.partyCodeSnapshot?.trim() && row.partyNameSnapshot?.trim() && Number(row.amount) > 0);
    if (validRows.length === 0) {
      throw new BadRequestException('Add at least one cash advance entry with a party and non-zero amount before submitting.');
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
}

function getBatchTransNo(value: string) {
  const match = value.trim().match(BatchTransNoPattern);
  return match ? match[1] : value.trim();
}
