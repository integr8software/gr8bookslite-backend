import { BadRequestException, Injectable } from '@nestjs/common';
import { ChartAccountStatus, PartyClassification, PartyStatus, PartyType, Prisma } from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../../common/utils/module-permissions.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PartyOptionsQueryDto } from '../dto/party-options-query.dto';
import { mapPartyAddress } from '../mappers/party-maintenance.mapper';
import { PartyInclude } from '../prisma/party.include';
import type { PartyWithDetails } from '../types/party-with-details.type';
import { buildPartyAccountingAccountOptions } from '../utils/party-accounting-account.util';

@Injectable()
export class PartyLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: PartyOptionsQueryDto = {}) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      parties: await this.findOptions({
        companyId,
        query,
      }),
    };
  }

  async findAccountingOptionsForCompanyUser(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'PM', PermissionAction.VIEW, 'You do not have permission to manage party records.');

    return this.findAccountingOptions({ companyId });
  }

  async findOptions({ companyId, query }: { companyId: number; query: PartyOptionsQueryDto }) {
    const partyTypes = this.parsePartyOptionTypes(query.partyTypes ?? query.partyType);
    const where = this.buildOptionsWhere(companyId, partyTypes, query);

    if (this.shouldIncludeCompleteOptionDetails(query)) {
      const parties = await this.prisma.party.findMany({
        where,
        include: PartyInclude,
        orderBy: [{ partyName: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }, { partyCodeNo: 'asc' }],
      });

      return parties.map((party) => this.mapCompletePartyOption(party));
    }

    const parties = await this.prisma.party.findMany({
      where,
      orderBy: [{ partyName: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }, { partyCodeNo: 'asc' }],
      select: {
        id: true,
        partyCodeNo: true,
        classification: true,
        partyTypes: true,
        partyName: true,
        tradeName: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffixName: true,
        contactPerson: true,
        email: true,
        contactNo: true,
        status: true,
        cashAdvanceLimit: true,
      },
    });

    return parties.map((party) => this.mapBasicPartyOption(party));
  }

  async findAccountingOptions({ companyId }: { companyId: number }) {
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
    });

    return buildPartyAccountingAccountOptions(accounts);
  }

  private parsePartyType(value: string) {
    const normalizedValue = value.trim().toUpperCase();

    if (normalizedValue in PartyType) {
      return PartyType[normalizedValue as keyof typeof PartyType];
    }

    throw new BadRequestException('Choose a valid party type.');
  }

  private parsePartyOptionTypes(value: string | undefined) {
    if (!value?.trim()) {
      return [];
    }

    const rawTypes = value
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);

    if (rawTypes.length === 0 || rawTypes.some((type) => type.toUpperCase() === 'ALL')) {
      return [];
    }

    return [...new Set(rawTypes.map((type) => this.parsePartyType(type)))];
  }

  private buildOptionsWhere(companyId: number, partyTypes: PartyType[], query: PartyOptionsQueryDto): Prisma.PartyWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      status: PartyStatus.ACTIVE,
      ...(partyTypes.length === 0
        ? {}
        : {
            partyTypes: query.match === 'all' ? { hasEvery: partyTypes } : { hasSome: partyTypes },
          }),
      ...(search
        ? {
            OR: [
              { partyCodeNo: { contains: search, mode: 'insensitive' } },
              { partyName: { contains: search, mode: 'insensitive' } },
              { tradeName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { middleName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { contactNo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private shouldIncludeCompleteOptionDetails(query: PartyOptionsQueryDto) {
    return query.detail === 'complete' || query.includeDetails === 'true';
  }

  private mapBasicPartyOption(party: {
    classification: PartyClassification;
    contactNo: string | null;
    contactPerson: string | null;
    email: string | null;
    firstName: string | null;
    id: bigint;
    lastName: string | null;
    middleName: string | null;
    partyCodeNo: string;
    partyName: string | null;
    partyTypes: PartyType[];
    status: PartyStatus;
    cashAdvanceLimit: Prisma.Decimal | null;
    suffixName: string | null;
    tradeName: string | null;
  }) {
    return {
      id: party.id.toString(),
      partyCodeNo: party.partyCodeNo,
      classification: party.classification,
      partyTypes: party.partyTypes,
      name: this.getPartyOptionName(party),
      contactPerson: party.contactPerson ?? '',
      email: party.email ?? '',
      contactNo: party.contactNo ?? '',
      status: party.status,
      cashAdvanceLimit: party.cashAdvanceLimit?.toString() ?? '',
      cashAdvanceBalance: party.cashAdvanceLimit?.toString() ?? '',
    };
  }

  private mapCompletePartyOption(party: PartyWithDetails) {
    const taxDefaults = party as PartyWithDetails & {
      defaultPurchaseEwtTaxSourceKey?: string | null;
      defaultPurchaseFwtTaxSourceKey?: string | null;
      defaultPurchaseInputVatTaxSourceKey?: string | null;
      defaultPurchaseWvatTaxSourceKey?: string | null;
      defaultSalesCwtTaxSourceKey?: string | null;
      defaultSalesOutputVatTaxSourceKey?: string | null;
      defaultSalesWvatTaxSourceKey?: string | null;
    };
    const basicOption = this.mapBasicPartyOption(party);

    return {
      ...basicOption,
      partyEntityType: party.partyEntityType?.name ?? null,
      partyName: party.partyName ?? '',
      tradeName: party.tradeName ?? '',
      firstName: party.firstName ?? '',
      middleName: party.middleName ?? '',
      lastName: party.lastName ?? '',
      suffixName: party.suffixName ?? '',
      honorific: party.honorific ?? '',
      gender: party.gender ?? '',
      civilStatus: party.civilStatus ?? '',
      nationality: party.nationality ?? '',
      memberRegistrationDate: party.memberRegistrationDate?.toISOString().slice(0, 10) ?? '',
      address: party.addresses[0] ? mapPartyAddress(party.addresses[0]) : null,
      addresses: party.addresses.map(mapPartyAddress),
      defaultReceivableAccount: party.defaultReceivableAccountId?.toString() ?? '',
      customerAdvanceAccount: party.customerAdvanceAccountId?.toString() ?? '',
      defaultPayableAccount: party.defaultPayableAccountId?.toString() ?? '',
      vendorAdvanceAccount: party.vendorAdvanceAccountId?.toString() ?? '',
      employeeAdvanceAccount: party.employeeAdvanceAccountId?.toString() ?? '',
      employeePayableAccount: party.employeePayableAccountId?.toString() ?? '',
      cashAdvanceLimit: party.cashAdvanceLimit?.toString() ?? '',
      cashAdvanceBalance: party.cashAdvanceLimit?.toString() ?? '',
      accountingAccounts: {
        defaultReceivableAccount: this.mapChartAccountSummary(party.defaultReceivableAccount),
        customerAdvanceAccount: this.mapChartAccountSummary(party.customerAdvanceAccount),
        defaultPayableAccount: this.mapChartAccountSummary(party.defaultPayableAccount),
        vendorAdvanceAccount: this.mapChartAccountSummary(party.vendorAdvanceAccount),
        employeeAdvanceAccount: this.mapChartAccountSummary(party.employeeAdvanceAccount),
        employeePayableAccount: this.mapChartAccountSummary(party.employeePayableAccount),
      },
      termId: party.termId?.toString() ?? '',
      termName: party.term?.name ?? '',
      tin: party.tin ?? '',
      atcCode: party.atcCode ?? '',
      defaultPurchaseInputVatTaxSourceKey: taxDefaults.defaultPurchaseInputVatTaxSourceKey ?? '',
      defaultPurchaseEwtTaxSourceKey: taxDefaults.defaultPurchaseEwtTaxSourceKey ?? '',
      defaultPurchaseFwtTaxSourceKey: taxDefaults.defaultPurchaseFwtTaxSourceKey ?? '',
      defaultPurchaseWvatTaxSourceKey: taxDefaults.defaultPurchaseWvatTaxSourceKey ?? '',
      defaultSalesOutputVatTaxSourceKey: taxDefaults.defaultSalesOutputVatTaxSourceKey ?? '',
      defaultSalesCwtTaxSourceKey: taxDefaults.defaultSalesCwtTaxSourceKey ?? '',
      defaultSalesWvatTaxSourceKey: taxDefaults.defaultSalesWvatTaxSourceKey ?? '',
      landline: party.landline ?? '',
    };
  }

  private mapChartAccountSummary(account: PartyWithDetails['defaultReceivableAccount']) {
    return account
      ? {
          id: account.id.toString(),
          accountCode: account.accountCode,
          accountTitle: account.accountTitle,
        }
      : null;
  }

  private getPartyOptionName(party: {
    classification: PartyClassification;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    partyName: string | null;
    suffixName: string | null;
    tradeName: string | null;
  }) {
    if (party.classification === PartyClassification.NON_INDIVIDUAL) {
      return party.tradeName?.trim() || party.partyName?.trim() || 'Unnamed Party';
    }

    const fullName = [party.firstName, party.middleName, party.lastName, party.suffixName]
      .map((namePart) => namePart?.trim())
      .filter(Boolean)
      .join(' ');

    return fullName || party.partyName?.trim() || 'Unnamed Party';
  }
}
