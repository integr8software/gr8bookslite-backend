import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChartAccount, ChartAccountStatus, CompanyUnitType, MembershipRole, MembershipStatus, Party, PartyAddress, PartyStatus, PartyType, Prisma, ResponsibilityCenter, ResponsibilityCenterStatus, OfficialReceiptStatus, Term, TermStatus, TransactionNumberInputMode } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { findTransactionNumberForCompanyBranch, resolveTransactionNumberForCompanyBranch, resolveTransactionNumberScopeForCompanyBranch, suggestTransactionNumberForCompanyBranch } from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreateOfficialReceiptDto } from './dto/create-official-receipt.dto';
import { GetOfficialReceiptListQueryDto } from './dto/get-official-receipt-list-query.dto';
import { OfficialReceiptDetailDto } from './dto/official-receipt-detail.dto';
import { OfficialReceiptJournalEntryDto } from './dto/official-receipt-journal-entry.dto';
import { UpdateOfficialReceiptStatusDto } from './dto/update-official-receipt-status.dto';
import { UpdateOfficialReceiptDto } from './dto/update-official-receipt.dto';
import { mapOfficialReceipt } from './mappers/official-receipt.mapper';
import { OfficialReceiptInclude } from './prisma/official-receipt.include';
import { OfficialReceiptAccountingService } from './services/official-receipt-accounting.service';
import type { OfficialReceiptWithDetails } from './types/official-receipt-with-details.type';

const OfficialReceiptModuleCode = 'OR';
const OfficialReceiptReferenceType = 'OR';
const JournalEntryNumberAdvisoryLockNamespace = 9081;
const CustomerPartyTypes = new Set<PartyType>([PartyType.CUSTOMER, PartyType.MEMBER]);

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;
type PartyWithAddresses = Party & { addresses: PartyAddress[] };

type ResolvedDetailLine = {
  input: OfficialReceiptDetailDto;
  responsibilityCenter: ResponsibilityCenter | null;
};

type ResolvedJournalEntry = {
  account: ChartAccount | null;
  input: OfficialReceiptJournalEntryDto;
  responsibilityCenter: ResponsibilityCenter | null;
};

@Injectable()
export class OfficialReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: OfficialReceiptAccountingService,
  ) {}

  async findAll(user: AuthUser, query: GetOfficialReceiptListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const where = this.buildListWhere(companyId, branchUnitId, query);

    const [receiptRows, total, statistics] = await Promise.all([
      this.prisma.officialReceipt.findMany({
        where,
        include: OfficialReceiptInclude,
        orderBy: this.buildOrderBy(query),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.officialReceipt.count({ where }),
      this.getStatistics(companyId, branchUnitId),
    ]);
    const receipts = await this.attachJournalEntries(receiptRows);

    return {
      receipts: await this.mapReceiptsWithAuditUsers(receipts),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.getPermissions(user, companyId),
      statistics,
    };
  }

  async findOne(user: AuthUser, id: string, requestedBranchUnitId?: number) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const branchUnitId = requestedBranchUnitId ? await this.resolveBranchUnitId(companyId, requestedBranchUnitId) : undefined;
    const receipt = await this.findReceiptOrThrow(companyId, parsePositiveBigIntId(id), branchUnitId);

    return {
      receipt: (await this.mapReceiptsWithAuditUsers([receipt]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async suggestTransactionNumber(user: AuthUser, requestedBranchUnitId?: number) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const branchUnitId = await this.resolveBranchUnitId(companyId, requestedBranchUnitId);
    const suggestion = await suggestTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: OfficialReceiptModuleCode,
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(this.prisma, companyId, branchUnitId, transactionNo, context.scope),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreateOfficialReceiptDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const normalized = this.normalizeReceiptInput(dto);

    this.accountingService.validateSubmittedPayload({
      currencyCode: normalized.currencyCode,
      details: dto.details,
      exchangeRate: normalized.exchangeRate,
      grossAmount: normalized.grossAmount,
      journalEntries: dto.journalEntries,
    });

    try {
      const receipt = await this.prisma.$transaction(async (tx) => {
        const references = await this.resolveReceiptReferences(tx, companyId, dto);
        const transactionNo = await this.resolveTransactionNumberForCreate(tx, {
          branchUnitId,
          companyId,
          requestedTransactionNo: dto.transactionNo,
        });

        const created = await tx.officialReceipt.create({
          data: {
            addressSnapshot: (references.party ? this.getPartyAddress(references.party) : null) ?? cleanOptional(dto.address),
            billToNameSnapshot: cleanOptional(dto.billToName),
            branchUnitId,
            businessStyle: cleanOptional(dto.businessStyle),
            companyId,
            contactNoSnapshot: cleanOptional(dto.contactNo),
            contactPersonSnapshot: cleanOptional(dto.contactPerson),
            createdByUserId: user.id,
            currencyCode: normalized.currencyCode,
            discountAmount: normalized.discountAmount,
            documentDate: normalized.documentDate,
            dueDate: normalized.dueDate,
            ewtAmount: normalized.ewtAmount,
            exchangeRate: normalized.exchangeRate,
            grossAmount: normalized.grossAmount,
            receiptNo: cleanOptional(dto.receiptNo),
            netAmount: normalized.netAmount,
            partyCodeSnapshot: references.party?.partyCodeNo ?? cleanOptional(dto.customerCode) ?? 'MANUAL',
            partyId: references.party?.id ?? null,
            partyNameSnapshot:
              (references.party ? this.getPartyName(references.party, dto.customerName) : null) ??
              cleanOptional(dto.customerName) ??
              cleanOptional(dto.billToName) ??
              cleanOptional(dto.customerCode) ??
              'Manual customer',
            projectCode: cleanOptional(dto.projectCode),
            projectName: cleanOptional(dto.projectName),
            projectRef: cleanOptional(dto.projectRef),
            receivableAccountId: references.receivableAccount?.id ?? null,
            referenceNo: cleanOptional(dto.referenceNo),
            remarks: cleanOptional(dto.remarks),
            salesAssociate: cleanOptional(dto.salesAssociate),
            status: OfficialReceiptStatus.DRAFT,
            teamAssigned: cleanOptional(dto.teamAssigned),
            termId: references.term?.id ?? null,
            transactionNo,
            vatAmount: normalized.vatAmount,
            wvatAmount: normalized.wvatAmount,
          },
          include: OfficialReceiptInclude,
        });

        await this.replaceDetails(tx, created.id, companyId, branchUnitId, references.details);
        await this.replaceJournalEntries(tx, created.id, companyId, branchUnitId, normalized.currencyCode, normalized.exchangeRate, references.journalEntries);

        const saved = await tx.officialReceipt.findUniqueOrThrow({ where: { id: created.id }, include: OfficialReceiptInclude });
        return (await this.attachJournalEntries([saved], tx))[0];
      });

      return {
        receipt: (await this.mapReceiptsWithAuditUsers([receipt]))[0],
        message: 'official receipt created successfully.',
        permissions: this.getPermissions(user, companyId),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateOfficialReceiptDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const officialReceiptId = parsePositiveBigIntId(id);
    const current = await this.findReceiptOrThrow(companyId, officialReceiptId);

    if (current.status !== OfficialReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft official receipts can be edited.');
    }

    if (dto.branchUnitId !== undefined && dto.branchUnitId !== current.branchUnitId) {
      throw new BadRequestException('official receipt branch cannot be changed after creation.');
    }

    const fullDto = this.requireCompleteUpdateDto(dto);
    const normalized = this.normalizeReceiptInput(fullDto);

    this.accountingService.validateSubmittedPayload({
      currencyCode: normalized.currencyCode,
      details: fullDto.details,
      exchangeRate: normalized.exchangeRate,
      grossAmount: normalized.grossAmount,
      journalEntries: fullDto.journalEntries,
    });

    try {
      const receipt = await this.prisma.$transaction(async (tx) => {
        const references = await this.resolveReceiptReferences(tx, companyId, fullDto);
        const transactionNo = await this.resolveTransactionNumberForUpdate(tx, {
          branchUnitId: current.branchUnitId,
          companyId,
          currentTransactionNo: current.transactionNo,
          excludedReceiptId: officialReceiptId,
          requestedTransactionNo: fullDto.transactionNo,
        });

        await tx.officialReceipt.update({
          where: { id: officialReceiptId },
          data: {
            addressSnapshot: (references.party ? this.getPartyAddress(references.party) : null) ?? cleanOptional(fullDto.address),
            billToNameSnapshot: cleanOptional(fullDto.billToName),
            businessStyle: cleanOptional(fullDto.businessStyle),
            contactNoSnapshot: cleanOptional(fullDto.contactNo),
            contactPersonSnapshot: cleanOptional(fullDto.contactPerson),
            currencyCode: normalized.currencyCode,
            discountAmount: normalized.discountAmount,
            documentDate: normalized.documentDate,
            dueDate: normalized.dueDate,
            ewtAmount: normalized.ewtAmount,
            exchangeRate: normalized.exchangeRate,
            grossAmount: normalized.grossAmount,
            receiptNo: cleanOptional(fullDto.receiptNo),
            netAmount: normalized.netAmount,
            partyCodeSnapshot: references.party?.partyCodeNo ?? cleanOptional(fullDto.customerCode) ?? 'MANUAL',
            partyId: references.party?.id ?? null,
            partyNameSnapshot:
              (references.party ? this.getPartyName(references.party, fullDto.customerName) : null) ??
              cleanOptional(fullDto.customerName) ??
              cleanOptional(fullDto.billToName) ??
              cleanOptional(fullDto.customerCode) ??
              'Manual customer',
            projectCode: cleanOptional(fullDto.projectCode),
            projectName: cleanOptional(fullDto.projectName),
            projectRef: cleanOptional(fullDto.projectRef),
            receivableAccountId: references.receivableAccount?.id ?? null,
            referenceNo: cleanOptional(fullDto.referenceNo),
            remarks: cleanOptional(fullDto.remarks),
            salesAssociate: cleanOptional(fullDto.salesAssociate),
            teamAssigned: cleanOptional(fullDto.teamAssigned),
            termId: references.term?.id ?? null,
            transactionNo,
            updatedByUserId: user.id,
            vatAmount: normalized.vatAmount,
            wvatAmount: normalized.wvatAmount,
          },
        });

        await this.replaceDetails(tx, officialReceiptId, companyId, current.branchUnitId, references.details);
        await this.replaceJournalEntries(tx, officialReceiptId, companyId, current.branchUnitId, normalized.currencyCode, normalized.exchangeRate, references.journalEntries);

        const saved = await tx.officialReceipt.findUniqueOrThrow({ where: { id: officialReceiptId }, include: OfficialReceiptInclude });
        return (await this.attachJournalEntries([saved], tx))[0];
      });

      return {
        receipt: (await this.mapReceiptsWithAuditUsers([receipt]))[0],
        message: 'official receipt updated successfully.',
        permissions: this.getPermissions(user, companyId),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateOfficialReceiptStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const targetStatus = this.normalizeStatus(dto.status);
    const requiredAction = targetStatus === OfficialReceiptStatus.CANCELLED ? PermissionAction.CANCEL : PermissionAction.UPDATE;

    this.ensureCan(user, companyId, requiredAction);
    const officialReceiptId = parsePositiveBigIntId(id);
    const current = await this.findReceiptOrThrow(companyId, officialReceiptId);

    if (current.status === targetStatus) {
      return {
        receipt: (await this.mapReceiptsWithAuditUsers([current]))[0],
        message: 'official receipt status is already up to date.',
        permissions: this.getPermissions(user, companyId),
      };
    }

    this.ensureStatusTransitionAllowed(current.status, targetStatus);

    if (targetStatus === OfficialReceiptStatus.POSTED) {
      this.accountingService.validatePersistedPayload({
        details: current.details,
        journalEntries: current.journalEntries,
      });
    }

    const receipt = await this.prisma.officialReceipt.update({
      where: { id: officialReceiptId },
      data: {
        ...this.getStatusAuditData(targetStatus, user.id),
        status: targetStatus,
        updatedByUserId: user.id,
      },
      include: OfficialReceiptInclude,
    });
    const saved = (await this.attachJournalEntries([receipt]))[0];

    return {
      receipt: (await this.mapReceiptsWithAuditUsers([saved]))[0],
      message: 'official receipt status updated successfully.',
      permissions: this.getPermissions(user, companyId),
    };
  }

  private buildListWhere(companyId: number, branchUnitId: number, query: GetOfficialReceiptListQueryDto): Prisma.OfficialReceiptWhereInput {
    const search = query.search?.trim();

    if (query.amountFrom !== undefined && query.amountTo !== undefined && query.amountFrom > query.amountTo) {
      throw new BadRequestException('Amount from cannot be greater than amount to.');
    }

    return {
      branchUnitId,
      companyId,
      deletedAt: null,
      ...(query.status ? { status: this.normalizeStatus(query.status) } : {}),
      ...(query.documentDateFrom || query.documentDateTo
        ? {
            documentDate: {
              ...(query.documentDateFrom ? { gte: this.parseDate(query.documentDateFrom, 'documentDateFrom') } : {}),
              ...(query.documentDateTo ? { lte: this.parseDate(query.documentDateTo, 'documentDateTo') } : {}),
            },
          }
        : {}),
      ...(query.amountFrom !== undefined || query.amountTo !== undefined
        ? {
            grossAmount: {
              ...(query.amountFrom !== undefined ? { gte: query.amountFrom } : {}),
              ...(query.amountTo !== undefined ? { lte: query.amountTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { transactionNo: { contains: search, mode: 'insensitive' } },
              { receiptNo: { contains: search, mode: 'insensitive' } },
              { referenceNo: { contains: search, mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
              { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetOfficialReceiptListQueryDto): Prisma.OfficialReceiptOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'documentDate';
    const sortDirection = query.sortDirection ?? 'desc';
    const field = sortBy === 'customerName' ? 'partyNameSnapshot' : sortBy;

    return [{ [field]: sortDirection }, { id: 'desc' }];
  }

  private getStatistics(companyId: number, branchUnitId: number) {
    return this.prisma.officialReceipt
      .groupBy({
        by: ['status'],
        where: { branchUnitId, companyId, deletedAt: null },
        _count: { _all: true },
      })
      .then((groups) => {
        const statistics = {
          cancelledReceipts: 0,
          disapprovedReceipts: 0,
          draftReceipts: 0,
          forApprovalReceipts: 0,
          postedReceipts: 0,
          totalReceipts: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalReceipts += count;
          if (group.status === OfficialReceiptStatus.CANCELLED) statistics.cancelledReceipts += count;
          if (group.status === OfficialReceiptStatus.DISAPPROVED) statistics.disapprovedReceipts += count;
          if (group.status === OfficialReceiptStatus.DRAFT) statistics.draftReceipts += count;
          if (group.status === OfficialReceiptStatus.FOR_APPROVAL) statistics.forApprovalReceipts += count;
          if (group.status === OfficialReceiptStatus.POSTED) statistics.postedReceipts += count;
        }

        return statistics;
      });
  }

  private async mapReceiptsWithAuditUsers(receipts: OfficialReceiptWithDetails[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      receipts.flatMap((receipt) => [receipt.createdByUserId, receipt.updatedByUserId]),
    );

    return receipts.map((receipt) => mapOfficialReceipt(receipt, userNames));
  }

  private async findReceiptOrThrow(companyId: number, id: bigint, branchUnitId?: number) {
    const receipt = await this.prisma.officialReceipt.findFirst({
      where: {
        ...(branchUnitId ? { branchUnitId } : {}),
        companyId,
        deletedAt: null,
        id,
      },
      include: OfficialReceiptInclude,
    });

    if (!receipt) {
      throw new NotFoundException('official receipt not found.');
    }

    return (await this.attachJournalEntries([receipt]))[0];
  }

  private async attachJournalEntries(
    receipts: Prisma.OfficialReceiptGetPayload<{ include: typeof OfficialReceiptInclude }>[],
    tx: PrismaWriteClient = this.prisma,
  ): Promise<OfficialReceiptWithDetails[]> {
    if (receipts.length === 0) {
      return [];
    }

    const journalHeaders = await tx.journalEntryHeader.findMany({
      where: {
        referenceId: { in: receipts.map((receipt) => receipt.id) },
        referenceType: OfficialReceiptReferenceType,
      },
      include: {
        details: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });
    const entriesByReferenceId = new Map<string, OfficialReceiptWithDetails['journalEntries']>();

    for (const header of journalHeaders) {
      entriesByReferenceId.set(
        header.referenceId.toString(),
        header.details.map((detail) => ({
          ...detail,
          currencyCode: header.currencyCode,
          exchangeRate: header.exchangeRate,
          particulars: header.particulars,
          referenceId: header.referenceId,
          referenceNo: header.referenceNo,
          referenceType: header.referenceType,
        })),
      );
    }

    return receipts.map((receipt) => ({
      ...receipt,
      journalEntries: entriesByReferenceId.get(receipt.id.toString()) ?? [],
    }));
  }

  private async resolveReceiptReferences(tx: PrismaWriteClient, companyId: number, dto: CreateOfficialReceiptDto) {
    const [party, receivableAccount, term, details, journalEntries] = await Promise.all([
      this.resolveParty(tx, companyId, { partyCode: dto.customerCode, partyId: dto.partyId }),
      this.resolvePostingAccount(tx, companyId, {
        accountCode: dto.receivableAccountCode,
        accountId: dto.receivableAccountId,
        label: 'Receivable account',
      }),
      this.resolveTerm(tx, companyId, dto.termId),
      Promise.all(dto.details.map((input) => this.resolveDetailLine(tx, companyId, input))),
      Promise.all(dto.journalEntries.map((input) => this.resolveJournalEntry(tx, companyId, input))),
    ]);

    return { details, journalEntries, party, receivableAccount, term };
  }

  private async resolveDetailLine(tx: PrismaWriteClient, companyId: number, input: OfficialReceiptDetailDto): Promise<ResolvedDetailLine> {
    return {
      input,
      responsibilityCenter: await this.resolveResponsibilityCenter(tx, companyId, {
        label: `Item line ${input.lineNumber} responsibility center`,
        responsibilityCenter: input.responsibilityCenter,
        responsibilityCenterId: input.responsibilityCenterId,
      }),
    };
  }

  private async resolveJournalEntry(tx: PrismaWriteClient, companyId: number, input: OfficialReceiptJournalEntryDto): Promise<ResolvedJournalEntry> {
    return {
      account: await this.resolvePostingAccount(tx, companyId, {
        accountCode: input.accountCode,
        accountId: input.accountId,
        label: `Journal line ${input.lineNumber} account`,
      }),
      input,
      responsibilityCenter: await this.resolveResponsibilityCenter(tx, companyId, {
        label: `Journal line ${input.lineNumber} responsibility center`,
        responsibilityCenter: input.responsibilityCenter,
        responsibilityCenterId: input.responsibilityCenterId,
      }),
    };
  }

  private async replaceDetails(tx: Prisma.TransactionClient, officialReceiptId: bigint, companyId: number, branchUnitId: number, details: ResolvedDetailLine[]) {
    await tx.officialReceiptDetails.deleteMany({ where: { officialReceiptId } });
    await tx.officialReceiptDetails.createMany({
      data: details.map(({ input, responsibilityCenter }) => ({
        amount: roundToDecimal(input.amount, 2),
        branchUnitId,
        companyId,
        description: input.description.trim(),
        discountAmount: roundToDecimal(input.discountAmount, 2),
        discountPercent: roundToDecimal(input.discountPercent, 4),
        ewtAmount: roundToDecimal(input.ewtAmount, 2),
        ewtType: cleanOptional(input.ewtType),
        grossAmount: roundToDecimal(input.grossAmount, 2),
        lineNumber: input.lineNumber,
        netAmount: roundToDecimal(input.netAmount, 2),
        particulars: cleanOptional(input.particulars),
        quantity: roundToDecimal(input.quantity, 4),
        responsibilityCenterId: responsibilityCenter?.id ?? null,
        responsibilityCenterSnapshot: responsibilityCenter?.name ?? cleanOptional(input.responsibilityCenter),
        officialReceiptId,
        vatAmount: roundToDecimal(input.vatAmount, 2),
        vatInclusive: input.vatInclusive,
        vatType: cleanOptional(input.vatType),
        vatable: input.vatable,
        withEwt: input.withEwt,
        withWvat: input.withWvat,
        wvatAmount: roundToDecimal(input.wvatAmount, 2),
        wvatType: cleanOptional(input.wvatType),
      })),
    });
  }

  private async replaceJournalEntries(
    tx: Prisma.TransactionClient,
    officialReceiptId: bigint,
    companyId: number,
    branchUnitId: number,
    currencyCode: string,
    exchangeRate: number,
    journalEntries: ResolvedJournalEntry[],
  ) {
    await tx.journalEntryHeader.deleteMany({
      where: {
        referenceId: officialReceiptId,
        referenceType: OfficialReceiptReferenceType,
      },
    });

    const totals = journalEntries.reduce(
      (current, { input }) => ({
        credit: roundToDecimal(current.credit + Number(input.credit), 2),
        debit: roundToDecimal(current.debit + Number(input.debit), 2),
      }),
      { credit: 0, debit: 0 },
    );
    const jeno = await this.resolveNextJournalEntryNo(tx, companyId);

    await tx.journalEntryHeader.create({
      data: {
        branchUnitId,
        companyId,
        currencyCode,
        exchangeRate,
        jeno,
        particulars: cleanOptional(journalEntries[0]?.input.particulars),
        referenceId: officialReceiptId,
        referenceNo: cleanOptional(journalEntries[0]?.input.refNo),
        referenceType: OfficialReceiptReferenceType,
        status: 'Draft',
        totalCredit: totals.credit,
        totalDebit: totals.debit,
        transactionDate: new Date(),
        details: {
          create: journalEntries.map(({ account, input, responsibilityCenter }) => ({
            accountCodeSnapshot: account?.accountCode ?? input.accountCode.trim(),
            accountId: account?.id ?? null,
            accountTitleSnapshot: account?.accountTitle ?? input.accountTitle.trim(),
            atcCode: cleanOptional(input.atcCode),
            credit: roundToDecimal(input.credit, 2),
            debit: roundToDecimal(input.debit, 2),
            lineNumber: input.lineNumber,
            partyCodeSnapshot: cleanOptional(input.partyCode),
            partyNameSnapshot: cleanOptional(input.partyName),
            refNo: cleanOptional(input.refNo),
            responsibilityCenterId: responsibilityCenter?.id ?? null,
            responsibilityCenterSnapshot: responsibilityCenter?.name ?? cleanOptional(input.responsibilityCenter),
            vatType: cleanOptional(input.vatType),
          })),
        },
      },
    });
  }

  private async resolveNextJournalEntryNo(tx: Prisma.TransactionClient, companyId: number) {
    const lockKey = (BigInt(JournalEntryNumberAdvisoryLockNamespace) << 32n) + BigInt(companyId);

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const latest = await tx.journalEntryHeader.aggregate({
      where: { companyId },
      _max: { jeno: true },
    });

    return (latest._max.jeno ?? 0n) + 1n;
  }

  private async resolveTransactionNumberForCreate(tx: Prisma.TransactionClient, { branchUnitId, companyId, requestedTransactionNo }: { branchUnitId: number; companyId: number; requestedTransactionNo?: string | null }) {
    return resolveTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: OfficialReceiptModuleCode,
      requestedTransactionNumber: requestedTransactionNo,
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(tx, companyId, branchUnitId, transactionNo, context.scope),
    });
  }

  private async resolveTransactionNumberForUpdate(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      currentTransactionNo,
      excludedReceiptId,
      requestedTransactionNo,
    }: {
      branchUnitId: number;
      companyId: number;
      currentTransactionNo: string;
      excludedReceiptId: bigint;
      requestedTransactionNo?: string | null;
    },
  ) {
    const nextTransactionNo = cleanOptional(requestedTransactionNo) ?? currentTransactionNo;

    if (nextTransactionNo === currentTransactionNo) {
      return currentTransactionNo;
    }

    const sequence = await findTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: OfficialReceiptModuleCode,
    });

    if (sequence?.inputMode !== TransactionNumberInputMode.MANUAL) {
      throw new BadRequestException('official receipt transaction number is auto-generated for this branch and cannot be changed manually.');
    }

    const sequenceScope = await resolveTransactionNumberScopeForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: OfficialReceiptModuleCode,
    });

    await this.ensureTransactionNoAvailable(tx, companyId, branchUnitId, nextTransactionNo, excludedReceiptId, sequenceScope.scope);
    return nextTransactionNo;
  }

  private async resolvePostingAccount(tx: PrismaWriteClient, companyId: number, { accountCode, accountId, label }: { accountCode?: string | null; accountId?: string | null; label: string }) {
    const parsedAccountId = parseOptionalPositiveBigIntId(accountId, `${label} ID`);
    const normalizedCode = cleanOptional(accountCode);

    if (!parsedAccountId && !normalizedCode) {
      // Temporary bypass while account records are supplied by another module.
      return null;
    }

    const account = await tx.chartAccount.findFirst({
      where: {
        companyId,
        deletedAt: null,
        isPostingAccount: true,
        status: ChartAccountStatus.ACTIVE,
        ...(parsedAccountId ? { id: parsedAccountId } : { accountCode: { equals: normalizedCode ?? '', mode: 'insensitive' } }),
      },
    });

    if (!account) {
      // Temporary bypass while account records are supplied by another module.
      return null;
    }

    return account;
  }

  private async resolveParty(tx: PrismaWriteClient, companyId: number, { partyCode, partyId }: { partyCode?: string | null; partyId?: string | null }) {
    const parsedPartyId = parseOptionalPositiveBigIntId(partyId, 'partyId');
    const normalizedCode = cleanOptional(partyCode);

    if (!parsedPartyId && !normalizedCode) {
      throw new BadRequestException('Customer is required.');
    }

    const party = await tx.party.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        ...(parsedPartyId ? { id: parsedPartyId } : { partyCodeNo: { equals: normalizedCode ?? '', mode: 'insensitive' } }),
      },
      include: { addresses: true },
    });

    if (!party) {
      // Temporary bypass while company party records are being populated manually.
      return null;
    }

    if (!party.partyTypes.some((partyType) => CustomerPartyTypes.has(partyType))) {
      throw new BadRequestException('Party must be a customer or member for official receipt.');
    }

    return party;
  }

  private async resolveTerm(tx: PrismaWriteClient, companyId: number, termId?: string | null) {
    const parsedTermId = parseOptionalPositiveBigIntId(termId, 'termId');

    if (!parsedTermId) {
      return null;
    }

    const term = await tx.term.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: parsedTermId,
        status: TermStatus.ACTIVE,
      },
    });

    if (!term) {
      throw new BadRequestException('Terms must reference an active company term.');
    }

    return term;
  }

  private async resolveResponsibilityCenter(
    tx: PrismaWriteClient,
    companyId: number,
    { label, responsibilityCenter, responsibilityCenterId }: { label: string; responsibilityCenter?: string | null; responsibilityCenterId?: string | null },
  ) {
    const parsedResponsibilityCenterId = parseOptionalPositiveBigIntId(responsibilityCenterId, `${label} ID`);
    const normalizedName = cleanOptional(responsibilityCenter);

    if (!parsedResponsibilityCenterId && !normalizedName) {
      return null;
    }

    const center = await tx.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(parsedResponsibilityCenterId
          ? { id: parsedResponsibilityCenterId }
          : { OR: [{ code: { equals: normalizedName ?? '', mode: 'insensitive' } }, { name: { equals: normalizedName ?? '', mode: 'insensitive' } }] }),
      },
    });

    if (!center) {
      throw new BadRequestException(`${label} must reference an active company responsibility center.`);
    }

    return center;
  }

  private async ensureTransactionNoAvailable(tx: PrismaWriteClient, companyId: number, branchUnitId: number, transactionNo: string, excludedReceiptId?: bigint, scope: 'all' | 'branch' = 'branch') {
    const existing = await tx.officialReceipt.findFirst({
      where: {
        ...(scope === 'branch' ? { branchUnitId } : {}),
        companyId,
        deletedAt: null,
        id: excludedReceiptId ? { not: excludedReceiptId } : undefined,
        transactionNo: { equals: transactionNo, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A official receipt with this transaction number already exists for this branch.');
    }
  }

  private isTransactionNoIssued(tx: PrismaWriteClient, companyId: number, branchUnitId: number, transactionNo: string, scope: 'all' | 'branch' = 'branch') {
    return tx.officialReceipt
      .findFirst({
        where: {
          ...(scope === 'branch' ? { branchUnitId } : {}),
          companyId,
          transactionNo: { equals: transactionNo, mode: 'insensitive' },
        },
        select: { id: true },
      })
      .then(Boolean);
  }

  private async resolveBranchUnitId(companyId: number, branchUnitId?: number | null, tx: PrismaWriteClient = this.prisma) {
    const branch = await tx.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(branchUnitId ? { id: branchUnitId } : {}),
        type: { in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE] },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException('Select an active branch.');
    }

    return branch.id;
  }

  private ensureStatusTransitionAllowed(currentStatus: OfficialReceiptStatus, targetStatus: OfficialReceiptStatus) {
    const allowedStatuses: Record<OfficialReceiptStatus, OfficialReceiptStatus[]> = {
      [OfficialReceiptStatus.CANCELLED]: [],
      [OfficialReceiptStatus.DISAPPROVED]: [OfficialReceiptStatus.DRAFT],
      [OfficialReceiptStatus.DRAFT]: [OfficialReceiptStatus.CANCELLED, OfficialReceiptStatus.DISAPPROVED, OfficialReceiptStatus.FOR_APPROVAL],
      [OfficialReceiptStatus.FOR_APPROVAL]: [OfficialReceiptStatus.CANCELLED, OfficialReceiptStatus.DISAPPROVED, OfficialReceiptStatus.POSTED],
      [OfficialReceiptStatus.POSTED]: [],
    };

    if (!allowedStatuses[currentStatus].includes(targetStatus)) {
      throw new BadRequestException(`Cannot move official receipt from ${currentStatus} to ${targetStatus}.`);
    }
  }

  private getStatusAuditData(targetStatus: OfficialReceiptStatus, userId: number): Prisma.OfficialReceiptUncheckedUpdateInput {
    const now = new Date();

    if (targetStatus === OfficialReceiptStatus.FOR_APPROVAL) {
      return { approvedAt: now, approvedByUserId: userId };
    }

    if (targetStatus === OfficialReceiptStatus.DISAPPROVED) {
      return { disapprovedAt: now, disapprovedByUserId: userId };
    }

    if (targetStatus === OfficialReceiptStatus.CANCELLED) {
      return { cancelledAt: now, cancelledByUserId: userId };
    }

    if (targetStatus === OfficialReceiptStatus.POSTED) {
      return { postedAt: now, postedByUserId: userId };
    }

    return {};
  }

  private normalizeReceiptInput(dto: CreateOfficialReceiptDto) {
    const currencyCode = cleanCurrencyCode(dto.currency);

    if (!currencyCode) {
      throw new BadRequestException('Currency is required.');
    }

    return {
      currencyCode,
      discountAmount: roundToDecimal(dto.discountAmount, 2),
      documentDate: this.parseDate(dto.documentDate, 'documentDate'),
      dueDate: this.parseDate(dto.dueDate, 'dueDate'),
      ewtAmount: roundToDecimal(dto.ewtAmount, 2),
      exchangeRate: roundToDecimal(dto.exchangeRate, 6),
      grossAmount: roundToDecimal(dto.grossAmount, 2),
      netAmount: roundToDecimal(dto.netAmount, 2),
      vatAmount: roundToDecimal(dto.vatAmount, 2),
      wvatAmount: roundToDecimal(dto.wvatAmount, 2),
    };
  }

  private requireCompleteUpdateDto(dto: UpdateOfficialReceiptDto): CreateOfficialReceiptDto {
    const requiredFields: Array<keyof CreateOfficialReceiptDto> = [
      'customerCode',
      'customerName',
      'currency',
      'details',
      'documentDate',
      'dueDate',
      'exchangeRate',
      'grossAmount',
      'journalEntries',
      'netAmount',
      'receivableAccountCode',
      'receivableAccountTitle',
      'vatAmount',
      'wvatAmount',
      'ewtAmount',
      'discountAmount',
    ];

    for (const field of requiredFields) {
      if (dto[field] === undefined || dto[field] === null) {
        throw new BadRequestException(`Field ${String(field)} is required when updating a official receipt.`);
      }
    }

    return dto as CreateOfficialReceiptDto;
  }

  private normalizeStatus(status: string) {
    const normalized = status
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (!Object.values(OfficialReceiptStatus).includes(normalized as OfficialReceiptStatus)) {
      throw new BadRequestException('Invalid official receipt status.');
    }

    return normalized as OfficialReceiptStatus;
  }

  private parseDate(value: string, label: string) {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }

    return date;
  }

  private getPartyName(party: Party, fallback?: string | null) {
    const individualName = [party.firstName, party.middleName, party.lastName, party.suffixName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ');

    return cleanOptional(party.partyName) ?? cleanOptional(party.tradeName) ?? cleanOptional(individualName) ?? cleanOptional(fallback) ?? party.partyCodeNo;
  }

  private getPartyAddress(party: PartyWithAddresses) {
    const address = party.addresses.find((item) => item.isDefault) ?? party.addresses[0];

    if (!address) {
      return null;
    }

    return [address.addressLine1, address.addressLine2, address.barangay, address.cityMunicipality, address.province, address.region]
      .map(cleanOptional)
      .filter(Boolean)
      .join(', ');
  }

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { companyId, userId: user.id } },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${OfficialReceiptModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage official receipts.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canApprove: this.can(user, companyId, PermissionAction.UPDATE),
      canCancel: this.can(user, companyId, PermissionAction.CANCEL),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canDisapprove: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
      canPost: this.can(user, companyId, PermissionAction.UPDATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canView: this.can(user, companyId, PermissionAction.VIEW),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${OfficialReceiptModuleCode}:${action}`);
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return user.companyId === companyId && user.membershipStatus === MembershipStatus.ACTIVE && (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN);
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A official receipt with this transaction number already exists for this branch.');
    }
  }
}

function roundToDecimal(value: number, decimalPlaces: number) {
  const multiplier = 10 ** decimalPlaces;

  return Math.round(Number(value || 0) * multiplier) / multiplier;
}
