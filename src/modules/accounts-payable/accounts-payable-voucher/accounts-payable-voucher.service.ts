import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountsPayableVoucherPayableType,
  AccountsPayableVoucherStatus,
  ChartAccount,
  ChartAccountStatus,
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Party,
  PartyAddress,
  PartyStatus,
  PartyType,
  Prisma,
  ResponsibilityCenter,
  ResponsibilityCenterStatus,
  Term,
  TermStatus,
  TransactionNumberInputMode,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  findTransactionNumberForCompanyBranch,
  resolveTransactionNumberScopeForCompanyBranch,
  resolveTransactionNumberForCompanyBranch,
  suggestTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { AccountsPayableVoucherDetailsDto } from './dto/accounts-payable-voucher-details.dto';
import { CreateAccountsPayableVoucherDto } from './dto/create-accounts-payable-voucher.dto';
import { GetAccountsPayableVoucherListQueryDto } from './dto/get-accounts-payable-voucher-list-query.dto';
import { JournalEntryDto } from './dto/journal-entry.dto';
import { UpdateAccountsPayableVoucherDto } from './dto/update-accounts-payable-voucher.dto';
import { UpdateAccountsPayableVoucherStatusDto } from './dto/update-accounts-payable-voucher-status.dto';
import { mapAccountsPayableVoucher } from './mappers/accounts-payable-voucher.mapper';
import { AccountsPayableVoucherInclude } from './prisma/accounts-payable-voucher.include';
import { AccountsPayableVoucherAccountingService } from './services/accounts-payable-voucher-accounting.service';
import type { AccountsPayableVoucherJournalEntry, AccountsPayableVoucherWithDetails } from './types/accounts-payable-voucher-with-details.type';

const AccountsPayableVoucherModuleCode = 'APV';
const AccountsPayableVoucherReferenceType = 'APV';
const JournalEntryNumberAdvisoryLockNamespace = 7081;
const PayablePartyTypes = new Set<PartyType>([PartyType.VENDOR, PartyType.EMPLOYEE]);

type PrismaWriteClient = PrismaService | Prisma.TransactionClient;
type PartyWithAddresses = Party & { addresses: PartyAddress[] };

type ResolvedVoucherReferences = {
  creditAccount: ChartAccount;
  details: ResolvedDetailLine[];
  journalEntries: ResolvedJournalEntry[];
  party: PartyWithAddresses;
  term: Term;
};

type ResolvedDetailLine = {
  expenseAccount: ChartAccount;
  input: AccountsPayableVoucherDetailsDto;
  party: PartyWithAddresses | null;
  responsibilityCenter: ResponsibilityCenter | null;
};

type ResolvedJournalEntry = {
  account: ChartAccount;
  input: JournalEntryDto;
  responsibilityCenter: ResponsibilityCenter | null;
};

@Injectable()
export class AccountsPayableVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCurrencyService: CompanyCurrencyService,
    private readonly accountingService: AccountsPayableVoucherAccountingService,
  ) {}

  async findAll(user: AuthUser, query: GetAccountsPayableVoucherListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const branchUnitId = await this.resolveBranchUnitId(companyId, query.branchUnitId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, branchUnitId, query);
    const orderBy = this.buildOrderBy(query);

    const [voucherRows, total, statistics] = await Promise.all([
      this.prisma.accountsPayableVoucher.findMany({
        where,
        include: AccountsPayableVoucherInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.accountsPayableVoucher.count({ where }),
      this.getStatistics(companyId, branchUnitId),
    ]);
    const vouchers = await this.attachJournalEntries(voucherRows);

    return {
      vouchers: await this.mapVouchersWithAuditUsers(vouchers),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string, requestedBranchUnitId?: number) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const branchUnitId = requestedBranchUnitId ? await this.resolveBranchUnitId(companyId, requestedBranchUnitId) : undefined;
    const voucher = await this.findVoucherOrThrow(companyId, parsePositiveBigIntId(id), branchUnitId);

    return {
      voucher: (await this.mapVouchersWithAuditUsers([voucher]))[0],
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
      moduleCode: AccountsPayableVoucherModuleCode,
      isIssued: (transactionNo, context) => this.isTransactionNoIssued(this.prisma, companyId, branchUnitId, transactionNo, context.scope),
    });

    return {
      branchUnitId,
      inputMode: suggestion.inputMode,
      transactionNo: suggestion.transactionNumber,
    };
  }

  async create(user: AuthUser, dto: CreateAccountsPayableVoucherDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const normalized = await this.normalizeVoucherInput(companyId, dto);
    this.accountingService.validateSubmittedPayload({
      currencyCode: normalized.currencyCode,
      details: dto.details,
      exchangeRate: normalized.exchangeRate,
      journalEntries: dto.journalEntries,
      voucherAmount: normalized.amount,
    });

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const references = await this.resolveVoucherReferences(tx, companyId, dto);
        const transactionNo = await this.resolveTransactionNumberForCreate(tx, {
          branchUnitId,
          companyId,
          requestedTransactionNo: dto.transactionNo,
        });

        const created = await tx.accountsPayableVoucher.create({
          data: {
            amount: normalized.amount,
            branchUnitId,
            companyId,
            contactNoSnapshot: cleanOptional(dto.contactNo),
            contactPersonSnapshot: cleanOptional(dto.contactPerson),
            createdByUserId: user.id,
            creditAccountId: references.creditAccount.id,
            currencyCode: normalized.currencyCode,
            documentDate: normalized.documentDate,
            dueDate: normalized.dueDate,
            exchangeRate: normalized.exchangeRate,
            partyCodeSnapshot: references.party.partyCodeNo,
            partyId: references.party.id,
            partyNameSnapshot: this.getPartyName(references.party, dto.partyName),
            addressSnapshot: this.getPartyAddress(references.party) ?? cleanOptional(dto.address),
            payableType: normalized.payableType,
            projectCode: cleanOptional(dto.projectCode),
            projectName: cleanOptional(dto.projectName),
            referenceNo: cleanOptional(dto.referenceNo),
            remarks: cleanOptional(dto.remarks),
            status: AccountsPayableVoucherStatus.DRAFT,
            termId: references.term.id,
            transactionNo,
          },
          include: AccountsPayableVoucherInclude,
        });

        await this.replaceDetails(tx, created.apvId, companyId, branchUnitId, normalized.currencyCode, normalized.exchangeRate, references.details);
        await this.replaceJournalEntries(
          tx,
          created.apvId,
          companyId,
          branchUnitId,
          normalized.currencyCode,
          normalized.exchangeRate,
          cleanOptional(dto.remarks),
          references.journalEntries,
        );

        const saved = await tx.accountsPayableVoucher.findUniqueOrThrow({
          where: { apvId: created.apvId },
          include: AccountsPayableVoucherInclude,
        });

        return (await this.attachJournalEntries([saved], tx))[0];
      });

      return {
        message: 'Accounts payable voucher created successfully.',
        voucher: (await this.mapVouchersWithAuditUsers([voucher]))[0],
        permissions: this.getPermissions(user, companyId),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateAccountsPayableVoucherDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const apvId = parsePositiveBigIntId(id);
    const current = await this.findVoucherOrThrow(companyId, apvId);

    if (current.status !== AccountsPayableVoucherStatus.DRAFT) {
      throw new BadRequestException('Only draft AP vouchers can be edited.');
    }

    if (dto.branchUnitId !== undefined && dto.branchUnitId !== current.branchUnitId) {
      throw new BadRequestException('AP voucher branch cannot be changed after creation.');
    }

    const branchUnitId = current.branchUnitId;
    const normalized = await this.normalizeVoucherInput(companyId, dto);
    this.accountingService.validateSubmittedPayload({
      currencyCode: normalized.currencyCode,
      details: dto.details,
      exchangeRate: normalized.exchangeRate,
      journalEntries: dto.journalEntries,
      voucherAmount: normalized.amount,
    });

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const references = await this.resolveVoucherReferences(tx, companyId, dto);
        const transactionNo = await this.resolveTransactionNumberForUpdate(tx, {
          branchUnitId,
          companyId,
          currentTransactionNo: current.transactionNo,
          excludedVoucherId: apvId,
          requestedTransactionNo: dto.transactionNo,
        });

        await tx.accountsPayableVoucher.update({
          where: { apvId },
          data: {
            amount: normalized.amount,
            contactNoSnapshot: cleanOptional(dto.contactNo),
            contactPersonSnapshot: cleanOptional(dto.contactPerson),
            creditAccountId: references.creditAccount.id,
            currencyCode: normalized.currencyCode,
            documentDate: normalized.documentDate,
            dueDate: normalized.dueDate,
            exchangeRate: normalized.exchangeRate,
            partyCodeSnapshot: references.party.partyCodeNo,
            partyId: references.party.id,
            partyNameSnapshot: this.getPartyName(references.party, dto.partyName),
            addressSnapshot: this.getPartyAddress(references.party) ?? cleanOptional(dto.address),
            payableType: normalized.payableType,
            projectCode: cleanOptional(dto.projectCode),
            projectName: cleanOptional(dto.projectName),
            referenceNo: cleanOptional(dto.referenceNo),
            remarks: cleanOptional(dto.remarks),
            termId: references.term.id,
            transactionNo,
            updatedByUserId: user.id,
          },
        });

        await this.replaceDetails(tx, apvId, companyId, branchUnitId, normalized.currencyCode, normalized.exchangeRate, references.details);
        await this.replaceJournalEntries(
          tx,
          apvId,
          companyId,
          branchUnitId,
          normalized.currencyCode,
          normalized.exchangeRate,
          cleanOptional(dto.remarks),
          references.journalEntries,
        );

        const saved = await tx.accountsPayableVoucher.findUniqueOrThrow({
          where: { apvId },
          include: AccountsPayableVoucherInclude,
        });

        return (await this.attachJournalEntries([saved], tx))[0];
      });

      return {
        message: 'Accounts payable voucher updated successfully.',
        voucher: (await this.mapVouchersWithAuditUsers([voucher]))[0],
        permissions: this.getPermissions(user, companyId),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateAccountsPayableVoucherStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const targetStatus = this.normalizeStatus(dto.status);
    const requiredAction = targetStatus === AccountsPayableVoucherStatus.CANCELLED ? PermissionAction.CANCEL : PermissionAction.UPDATE;

    this.ensureCan(user, companyId, requiredAction);
    const apvId = parsePositiveBigIntId(id);
    const current = await this.findVoucherOrThrow(companyId, apvId);

    if (current.status === targetStatus) {
      return {
        message: 'Accounts payable voucher status is already up to date.',
        voucher: (await this.mapVouchersWithAuditUsers([current]))[0],
        permissions: this.getPermissions(user, companyId),
      };
    }

    this.ensureStatusTransitionAllowed(current.status, targetStatus);

    if (targetStatus === AccountsPayableVoucherStatus.APPROVED) {
      this.accountingService.validatePersistedPayload({
        amount: Number(current.amount),
        details: current.details,
        journalEntries: current.journalEntries,
      });
    }

    const voucher = await this.prisma.accountsPayableVoucher.update({
      where: { apvId },
      data: {
        ...this.getStatusAuditData(targetStatus, user.id),
        status: targetStatus,
        updatedByUserId: user.id,
      },
      include: AccountsPayableVoucherInclude,
    });
    const saved = (await this.attachJournalEntries([voucher]))[0];

    return {
      message: 'Accounts payable voucher status updated successfully.',
      voucher: (await this.mapVouchersWithAuditUsers([saved]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  private buildListWhere(companyId: number, branchUnitId: number, query: GetAccountsPayableVoucherListQueryDto): Prisma.AccountsPayableVoucherWhereInput {
    const search = query.search?.trim();
    const documentDateFrom = query.documentDateFrom ? this.parseDate(query.documentDateFrom, 'documentDateFrom') : undefined;
    const documentDateTo = query.documentDateTo ? this.parseDate(query.documentDateTo, 'documentDateTo') : undefined;
    const searchConditions: Prisma.AccountsPayableVoucherWhereInput[] = [];

    if (query.amountFrom !== undefined && query.amountTo !== undefined && query.amountFrom > query.amountTo) {
      throw new BadRequestException('Amount from cannot be greater than amount to.');
    }

    if (search) {
      const payableType = this.tryNormalizePayableType(search);

      searchConditions.push(
        { transactionNo: { contains: search, mode: 'insensitive' } },
        { partyCodeSnapshot: { contains: search, mode: 'insensitive' } },
        { partyNameSnapshot: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      );

      if (payableType) {
        searchConditions.push({ payableType });
      }
    }

    return {
      branchUnitId,
      companyId,
      deletedAt: null,
      ...(query.status ? { status: this.normalizeStatus(query.status) } : {}),
      ...(documentDateFrom || documentDateTo
        ? {
            documentDate: {
              ...(documentDateFrom ? { gte: documentDateFrom } : {}),
              ...(documentDateTo ? { lte: documentDateTo } : {}),
            },
          }
        : {}),
      ...(query.amountFrom !== undefined || query.amountTo !== undefined
        ? {
            amount: {
              ...(query.amountFrom !== undefined ? { gte: query.amountFrom } : {}),
              ...(query.amountTo !== undefined ? { lte: query.amountTo } : {}),
            },
          }
        : {}),
      ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
    };
  }

  private buildOrderBy(query: GetAccountsPayableVoucherListQueryDto): Prisma.AccountsPayableVoucherOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'documentDate';
    const sortDirection = query.sortDirection ?? 'desc';
    const field = sortBy === 'partyName' ? 'partyNameSnapshot' : sortBy === 'currency' ? 'currencyCode' : sortBy === 'transactionNo' ? 'transactionNo' : sortBy;

    return [{ [field]: sortDirection }, { apvId: 'desc' }];
  }

  private getStatistics(companyId: number, branchUnitId: number) {
    return this.prisma.accountsPayableVoucher
      .groupBy({
        by: ['status'],
        where: {
          branchUnitId,
          companyId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      })
      .then((groups) => {
        const statistics = {
          cancelledVouchers: 0,
          disapprovedVouchers: 0,
          draftVouchers: 0,
          forApprovalVouchers: 0,
          postedVouchers: 0,
          totalVouchers: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalVouchers += count;
          if (group.status === AccountsPayableVoucherStatus.APPROVED) statistics.forApprovalVouchers += count;
          if (group.status === AccountsPayableVoucherStatus.CANCELLED) statistics.cancelledVouchers += count;
          if (group.status === AccountsPayableVoucherStatus.CLOSED) statistics.postedVouchers += count;
          if (group.status === AccountsPayableVoucherStatus.DISAPPROVED) statistics.disapprovedVouchers += count;
          if (group.status === AccountsPayableVoucherStatus.DRAFT) statistics.draftVouchers += count;
        }

        return statistics;
      });
  }

  private async mapVouchersWithAuditUsers(vouchers: AccountsPayableVoucherWithDetails[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      vouchers.flatMap((voucher) => [voucher.createdByUserId, voucher.updatedByUserId]),
    );

    return vouchers.map((voucher) => mapAccountsPayableVoucher(voucher, userNames));
  }

  private async findVoucherOrThrow(companyId: number, apvId: bigint, branchUnitId?: number) {
    const voucher = await this.prisma.accountsPayableVoucher.findFirst({
      where: {
        ...(branchUnitId ? { branchUnitId } : {}),
        apvId,
        companyId,
        deletedAt: null,
      },
      include: AccountsPayableVoucherInclude,
    });

    if (!voucher) {
      throw new NotFoundException('Accounts payable voucher not found.');
    }

    return (await this.attachJournalEntries([voucher]))[0];
  }

  private async attachJournalEntries<T extends Prisma.AccountsPayableVoucherGetPayload<{ include: typeof AccountsPayableVoucherInclude }>>(
    vouchers: T[],
    tx: PrismaWriteClient = this.prisma,
  ): Promise<Array<T & { journalEntries: AccountsPayableVoucherJournalEntry[] }>> {
    if (vouchers.length === 0) {
      return [];
    }

    const journalEntryHeaders = await tx.journalEntryHeader.findMany({
      where: {
        referenceId: {
          in: vouchers.map((voucher) => voucher.apvId),
        },
        referenceType: AccountsPayableVoucherReferenceType,
      },
      include: {
        details: {
          orderBy: {
            lineNumber: 'asc',
          },
        },
      },
      orderBy: [{ referenceId: 'asc' }],
    });
    const journalEntriesByReferenceId = new Map<string, AccountsPayableVoucherJournalEntry[]>();

    for (const header of journalEntryHeaders) {
      const entries = header.details.map((entry) => ({
        ...entry,
        currencyCode: header.currencyCode,
        exchangeRate: header.exchangeRate,
        particulars: header.particulars,
        referenceId: header.referenceId,
        referenceNo: header.referenceNo,
        referenceType: header.referenceType,
      }));

      journalEntriesByReferenceId.set(header.referenceId.toString(), entries);
    }

    return vouchers.map((voucher) => ({
      ...voucher,
      journalEntries: journalEntriesByReferenceId.get(voucher.apvId.toString()) ?? [],
    }));
  }

  private async normalizeVoucherInput(companyId: number, dto: CreateAccountsPayableVoucherDto) {
    const currencyCode = cleanCurrencyCode(dto.currency) ?? (await this.companyCurrencyService.getBaseCurrencyCode(companyId));

    if (!currencyCode) {
      throw new BadRequestException('Currency is required.');
    }

    return {
      amount: roundToDecimal(dto.amount, 2),
      currencyCode,
      documentDate: this.parseDate(dto.documentDate, 'documentDate'),
      dueDate: this.parseDate(dto.dueDate, 'dueDate'),
      exchangeRate: Number(dto.exchangeRate),
      payableType: this.normalizePayableType(dto.payableType),
    };
  }

  private async resolveVoucherReferences(tx: PrismaWriteClient, companyId: number, dto: CreateAccountsPayableVoucherDto): Promise<ResolvedVoucherReferences> {
    const [party, term, creditAccount] = await Promise.all([
      this.resolveParty(tx, companyId, { partyCode: dto.partyCode, partyId: dto.partyId, required: true }),
      this.resolveTerm(tx, companyId, dto.termId),
      this.resolvePostingAccount(tx, companyId, {
        accountCode: dto.creditAccountCode,
        accountId: dto.creditAccountId,
        label: 'Credit account',
      }),
    ]);

    if (!party) {
      throw new BadRequestException('Party is required.');
    }
    const details: ResolvedDetailLine[] = [];
    const journalEntries: ResolvedJournalEntry[] = [];
    const detailLineNumbers = new Set<number>();
    const journalLineNumbers = new Set<number>();

    for (const input of dto.details) {
      if (detailLineNumbers.has(input.lineNumber)) {
        throw new BadRequestException(`Duplicate APV detail line number: ${input.lineNumber}.`);
      }

      detailLineNumbers.add(input.lineNumber);
      details.push({
        input,
        expenseAccount: await this.resolvePostingAccount(tx, companyId, {
          accountCode: input.expenseAccountCode,
          accountId: input.expenseAccountId,
          label: `Detail line ${input.lineNumber} expense account`,
        }),
        party:
          input.partyId || input.partyCode
            ? await this.resolveParty(tx, companyId, { partyCode: input.partyCode, partyId: input.partyId, required: false })
            : null,
        responsibilityCenter: await this.resolveResponsibilityCenter(tx, companyId, {
          label: `Detail line ${input.lineNumber} responsibility center`,
          responsibilityCenter: input.responsibilityCenter,
          responsibilityCenterId: input.responsibilityCenterId,
        }),
      });
    }

    for (const input of dto.journalEntries) {
      if (journalLineNumbers.has(input.lineNumber)) {
        throw new BadRequestException(`Duplicate APV journal line number: ${input.lineNumber}.`);
      }

      journalLineNumbers.add(input.lineNumber);
      journalEntries.push({
        input,
        account: await this.resolvePostingAccount(tx, companyId, {
          accountCode: input.accountCode,
          accountId: input.accountId,
          label: `Journal line ${input.lineNumber} account`,
        }),
        responsibilityCenter: await this.resolveResponsibilityCenter(tx, companyId, {
          label: `Journal line ${input.lineNumber} responsibility center`,
          responsibilityCenter: input.responsibilityCenter,
          responsibilityCenterId: input.responsibilityCenterId,
        }),
      });
    }

    return {
      creditAccount,
      details,
      journalEntries,
      party,
      term,
    };
  }

  private async replaceDetails(
    tx: Prisma.TransactionClient,
    apvId: bigint,
    companyId: number,
    branchUnitId: number,
    currencyCode: string,
    exchangeRate: number,
    details: ResolvedDetailLine[],
  ) {
    await tx.accountsPayableVoucherDetails.deleteMany({ where: { apvId } });
    await tx.accountsPayableVoucherDetails.createMany({
      data: details.map(({ expenseAccount, input, party, responsibilityCenter }) => ({
        amount: roundToDecimal(input.amount, 2),
        branchUnitId,
        companyId,
        currencyCode,
        ewt: cleanOptional(input.ewt),
        ewtAmount: roundToDecimal(input.ewtAmount, 2),
        ewtPercent: roundToDecimal(input.ewtPercent, 4),
        exchangeRate,
        expenseAccountCodeSnapshot: expenseAccount.accountCode,
        expenseAccountId: expenseAccount.id,
        expenseTypeSnapshot: input.expenseType.trim() || expenseAccount.accountTitle,
        lineNumber: input.lineNumber,
        netAmount: roundToDecimal(input.netAmount, 2),
        particulars: cleanOptional(input.particulars),
        partyCodeSnapshot: party?.partyCodeNo ?? cleanOptional(input.partyCode),
        partyId: party?.id ?? null,
        partyNameSnapshot: party ? this.getPartyName(party, input.partyName) : cleanOptional(input.partyName),
        referenceNo: cleanOptional(input.referenceNo),
        responsibilityCenterId: responsibilityCenter?.id ?? null,
        responsibilityCenterSnapshot: responsibilityCenter?.name ?? cleanOptional(input.responsibilityCenter),
        totalAmountDue: roundToDecimal(input.totalAmountDue, 2),
        vat: cleanOptional(input.vat),
        vatAmount: roundToDecimal(input.vatAmount, 2),
        vatPercent: roundToDecimal(input.vatPercent, 4),
        apvId,
      })),
    });
  }

  private async replaceJournalEntries(
    tx: Prisma.TransactionClient,
    apvId: bigint,
    companyId: number,
    branchUnitId: number,
    currencyCode: string,
    exchangeRate: number,
    remarks: string | null,
    journalEntries: ResolvedJournalEntry[],
  ) {
    await tx.journalEntryHeader.deleteMany({
      where: {
        referenceId: apvId,
        referenceType: AccountsPayableVoucherReferenceType,
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
        particulars: remarks,
        referenceId: apvId,
        referenceNo: cleanOptional(journalEntries[0]?.input.refNo),
        referenceType: AccountsPayableVoucherReferenceType,
        status: 'Draft',
        totalCredit: totals.credit,
        totalDebit: totals.debit,
        transactionDate: new Date(),
        details: {
          create: journalEntries.map(({ account, input, responsibilityCenter }) => ({
            accountCodeSnapshot: account.accountCode,
            accountId: account.id,
            accountTitleSnapshot: account.accountTitle,
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

  private async resolveTransactionNumberForCreate(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      requestedTransactionNo,
    }: {
      branchUnitId: number;
      companyId: number;
      requestedTransactionNo?: string | null;
    },
  ) {
    return resolveTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: AccountsPayableVoucherModuleCode,
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
      excludedVoucherId,
      requestedTransactionNo,
    }: {
      branchUnitId: number;
      companyId: number;
      currentTransactionNo: string;
      excludedVoucherId: bigint;
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
      moduleCode: AccountsPayableVoucherModuleCode,
    });

    if (sequence?.inputMode !== TransactionNumberInputMode.MANUAL) {
      throw new BadRequestException('APV transaction number is auto-generated for this branch and cannot be changed manually.');
    }

    const sequenceScope = await resolveTransactionNumberScopeForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: AccountsPayableVoucherModuleCode,
    });

    await this.ensureTransactionNoAvailable(tx, companyId, branchUnitId, nextTransactionNo, excludedVoucherId, sequenceScope.scope);
    return nextTransactionNo;
  }

  private async resolvePostingAccount(
    tx: PrismaWriteClient,
    companyId: number,
    {
      accountCode,
      accountId,
      label,
    }: {
      accountCode?: string | null;
      accountId?: string | null;
      label: string;
    },
  ) {
    const parsedAccountId = parseOptionalPositiveBigIntId(accountId, `${label} ID`);
    const normalizedCode = cleanOptional(accountCode);

    if (!parsedAccountId && !normalizedCode) {
      throw new BadRequestException(`${label} is required.`);
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
      throw new BadRequestException(`${label} must be an active company posting account.`);
    }

    return account;
  }

  private async resolveParty(
    tx: PrismaWriteClient,
    companyId: number,
    {
      partyCode,
      partyId,
      required,
    }: {
      partyCode?: string | null;
      partyId?: string | null;
      required: boolean;
    },
  ) {
    const parsedPartyId = parseOptionalPositiveBigIntId(partyId, 'partyId');
    const normalizedCode = cleanOptional(partyCode);

    if (!parsedPartyId && !normalizedCode) {
      if (required) {
        throw new BadRequestException('Party is required.');
      }

      return null;
    }

    const party = await tx.party.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        ...(parsedPartyId ? { id: parsedPartyId } : { partyCodeNo: { equals: normalizedCode ?? '', mode: 'insensitive' } }),
      },
      include: {
        addresses: true,
      },
    });

    if (!party) {
      throw new BadRequestException('Party must reference an active company party.');
    }

    if (!party.partyTypes.some((partyType) => PayablePartyTypes.has(partyType))) {
      throw new BadRequestException('Party must be a vendor or employee for APV.');
    }

    return party;
  }

  private async resolveTerm(tx: PrismaWriteClient, companyId: number, termId: string) {
    const parsedTermId = parseOptionalPositiveBigIntId(termId, 'termId');

    if (!parsedTermId) {
      throw new BadRequestException('Terms are required.');
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
    {
      label,
      responsibilityCenter,
      responsibilityCenterId,
    }: {
      label: string;
      responsibilityCenter?: string | null;
      responsibilityCenterId?: string | null;
    },
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
          : {
              OR: [{ code: { equals: normalizedName ?? '', mode: 'insensitive' } }, { name: { equals: normalizedName ?? '', mode: 'insensitive' } }],
            }),
      },
    });

    if (!center) {
      throw new BadRequestException(`${label} must reference an active company responsibility center.`);
    }

    return center;
  }

  private async ensureTransactionNoAvailable(
    tx: PrismaWriteClient,
    companyId: number,
    branchUnitId: number,
    transactionNo: string,
    excludedVoucherId?: bigint,
    scope: 'all' | 'branch' = 'branch',
  ) {
    const existing = await tx.accountsPayableVoucher.findFirst({
      where: {
        ...(scope === 'branch' ? { branchUnitId } : {}),
        apvId: excludedVoucherId ? { not: excludedVoucherId } : undefined,
        companyId,
        deletedAt: null,
        transactionNo: { equals: transactionNo, mode: 'insensitive' },
      },
      select: { apvId: true },
    });

    if (existing) {
      throw new ConflictException('An AP voucher with this transaction number already exists for this branch.');
    }
  }

  private isTransactionNoIssued(tx: PrismaWriteClient, companyId: number, branchUnitId: number, transactionNo: string, scope: 'all' | 'branch' = 'branch') {
    return tx.accountsPayableVoucher
      .findFirst({
        where: {
          ...(scope === 'branch' ? { branchUnitId } : {}),
          companyId,
          transactionNo: { equals: transactionNo, mode: 'insensitive' },
        },
        select: { apvId: true },
      })
      .then(Boolean);
  }

  private async resolveBranchUnitId(companyId: number, branchUnitId?: number | null, tx: PrismaWriteClient = this.prisma) {
    const branch = await tx.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(branchUnitId ? { id: branchUnitId } : {}),
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new BadRequestException('Select an active branch.');
    }

    return branch.id;
  }

  private ensureStatusTransitionAllowed(currentStatus: AccountsPayableVoucherStatus, targetStatus: AccountsPayableVoucherStatus) {
    const allowedStatuses: Record<AccountsPayableVoucherStatus, AccountsPayableVoucherStatus[]> = {
      [AccountsPayableVoucherStatus.APPROVED]: [AccountsPayableVoucherStatus.DRAFT, AccountsPayableVoucherStatus.CLOSED],
      [AccountsPayableVoucherStatus.CANCELLED]: [AccountsPayableVoucherStatus.DRAFT],
      [AccountsPayableVoucherStatus.CLOSED]: [],
      [AccountsPayableVoucherStatus.DISAPPROVED]: [AccountsPayableVoucherStatus.DRAFT],
      [AccountsPayableVoucherStatus.DRAFT]: [
        AccountsPayableVoucherStatus.APPROVED,
        AccountsPayableVoucherStatus.CANCELLED,
        AccountsPayableVoucherStatus.DISAPPROVED,
      ],
    };

    if (!allowedStatuses[currentStatus].includes(targetStatus)) {
      throw new BadRequestException(`Cannot move APV from ${currentStatus} to ${targetStatus}.`);
    }
  }

  private getStatusAuditData(targetStatus: AccountsPayableVoucherStatus, userId: number): Prisma.AccountsPayableVoucherUncheckedUpdateInput {
    const now = new Date();

    if (targetStatus === AccountsPayableVoucherStatus.APPROVED) {
      return {
        approvedAt: now,
        approvedByUserId: userId,
        cancelledAt: null,
        cancelledByUserId: null,
        closedAt: null,
        closedByUserId: null,
        disapprovedAt: null,
        disapprovedByUserId: null,
      };
    }

    if (targetStatus === AccountsPayableVoucherStatus.DISAPPROVED) {
      return {
        approvedAt: null,
        approvedByUserId: null,
        cancelledAt: null,
        cancelledByUserId: null,
        closedAt: null,
        closedByUserId: null,
        disapprovedAt: now,
        disapprovedByUserId: userId,
      };
    }

    if (targetStatus === AccountsPayableVoucherStatus.CANCELLED) {
      return {
        approvedAt: null,
        approvedByUserId: null,
        cancelledAt: now,
        cancelledByUserId: userId,
        closedAt: null,
        closedByUserId: null,
        disapprovedAt: null,
        disapprovedByUserId: null,
      };
    }

    if (targetStatus === AccountsPayableVoucherStatus.CLOSED) {
      return {
        closedAt: now,
        closedByUserId: userId,
      };
    }

    return {
      approvedAt: null,
      approvedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      closedAt: null,
      closedByUserId: null,
      disapprovedAt: null,
      disapprovedByUserId: null,
    };
  }

  private normalizeStatus(status: string) {
    const normalized = status
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (!Object.values(AccountsPayableVoucherStatus).includes(normalized as AccountsPayableVoucherStatus)) {
      throw new BadRequestException('Invalid APV status.');
    }

    return normalized as AccountsPayableVoucherStatus;
  }

  private normalizePayableType(payableType: string) {
    const normalized = payableType
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (!Object.values(AccountsPayableVoucherPayableType).includes(normalized as AccountsPayableVoucherPayableType)) {
      throw new BadRequestException('Invalid APV payable type.');
    }

    return normalized as AccountsPayableVoucherPayableType;
  }

  private tryNormalizePayableType(payableType: string) {
    try {
      return this.normalizePayableType(payableType);
    } catch {
      return null;
    }
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
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
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

    if (user.companyId === companyId && user.permissions.includes(`${AccountsPayableVoucherModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage accounts payable vouchers.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canApprove: this.can(user, companyId, PermissionAction.UPDATE),
      canCancel: this.can(user, companyId, PermissionAction.CANCEL),
      canClose: this.can(user, companyId, PermissionAction.UPDATE),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canDisapprove: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canView: this.can(user, companyId, PermissionAction.VIEW),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${AccountsPayableVoucherModuleCode}:${action}`);
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('An AP voucher with this transaction number already exists for this branch.');
    }
  }
}

function roundToDecimal(value: number, decimalPlaces: number) {
  const multiplier = 10 ** decimalPlaces;

  return Math.round(Number(value || 0) * multiplier) / multiplier;
}
