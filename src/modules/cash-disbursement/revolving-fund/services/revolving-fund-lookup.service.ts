import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ChartAccountStatus,
  PartyClassification,
  PartyStatus,
  ResponsibilityCenterStatus,
} from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { canAccessModuleAction } from '../../../../common/utils/module-permissions.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { PrismaService } from '../../../../prisma/prisma.service';

export const RevolvingFundModuleCode = 'RF';

@Injectable()
export class RevolvingFundLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findParties(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const parties = await this.prisma.party.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
      },
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
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
          select: {
            id: true,
            addressName: true,
            addressLine1: true,
            addressLine2: true,
            barangay: true,
            barangayCode: true,
            cityMunicipality: true,
            cityMunicipalityCode: true,
            isBilling: true,
            isBuilding: true,
            isDefault: true,
            isDelivery: true,
            isForeign: true,
            isHome: true,
            province: true,
            provinceCode: true,
            region: true,
            regionCode: true,
          },
        },
        defaultPayableAccountId: true,
        employeePayableAccountId: true,
        termId: true,
        term: { select: { name: true } },
        defaultPurchaseInputVatTaxSourceKey: true,
        defaultPurchaseEwtTaxSourceKey: true,
        defaultPurchaseFwtTaxSourceKey: true,
        defaultPurchaseWvatTaxSourceKey: true,
        contactPerson: true,
        email: true,
        contactNo: true,
        status: true,
      },
    });

    return {
      parties: parties.map((party) => {
        const address = this.mapPartyAddress(party.addresses[0]);
        const name = this.getPartyName(party);

        return {
          id: party.id.toString(),
          partyCode: party.partyCodeNo,
          partyCodeNo: party.partyCodeNo,
          partyName: name,
          name,
          label: party.partyCodeNo,
          value: party.partyCodeNo,
          classification: party.classification,
          partyTypes: party.partyTypes,
          status: party.status,
          address,
          addresses: party.addresses.map((currentAddress) => this.mapPartyAddress(currentAddress)),
          defaultPayableAccount: party.defaultPayableAccountId?.toString() ?? party.employeePayableAccountId?.toString() ?? '',
          termId: party.termId?.toString() ?? '',
          termName: party.term?.name ?? '',
          defaultPurchaseInputVatTaxSourceKey: party.defaultPurchaseInputVatTaxSourceKey ?? '',
          defaultPurchaseEwtTaxSourceKey: party.defaultPurchaseEwtTaxSourceKey ?? '',
          defaultPurchaseFwtTaxSourceKey: party.defaultPurchaseFwtTaxSourceKey ?? '',
          defaultPurchaseWvatTaxSourceKey: party.defaultPurchaseWvatTaxSourceKey ?? '',
          contactPerson: party.contactPerson ?? '',
          email: party.email ?? '',
          contactNo: party.contactNo ?? '',
        };
      }),
    };
  }

  async findResponsibilityCenters(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const responsibilityCenters = await this.prisma.responsibilityCenter.findMany({
      where: { companyId, deletedAt: null, status: ResponsibilityCenterStatus.ACTIVE },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        category: true,
        type: { select: { name: true } },
      },
    });

    return {
      responsibilityCenters: responsibilityCenters.map((center) => ({
        id: center.id.toString(),
        code: center.code,
        name: center.name,
        category: center.category,
        label: center.code,
        value: center.name,
        typeName: center.type?.name ?? '',
        status: center.status,
      })),
    };
  }

  async findPostingAccounts(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        isPostingAccount: true,
        status: ChartAccountStatus.ACTIVE,
      },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountType: true,
        accountNature: true,
        statementSection: true,
        description: true,
        status: true,
      },
    });

    return {
      accounts: accounts.map((account) => this.mapChartAccountDropdownOption(account)),
    };
  }

  async findDisbursementAccounts(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        isPostingAccount: true,
        status: ChartAccountStatus.ACTIVE,
        accountType: 'ASSET',
      },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountType: true,
        accountNature: true,
        statementSection: true,
        description: true,
        status: true,
      },
    });

    return {
      accounts: accounts.map((account) => this.mapChartAccountDropdownOption(account)),
    };
  }

  private mapChartAccountDropdownOption(
    account: {
      id: bigint;
      accountCode: string;
      accountTitle: string;
      accountType: string | null;
      accountNature: string | null;
      statementSection: string | null;
      description: string | null;
      status: ChartAccountStatus;
    },
    overrides: { accountName?: string; description?: string } = {},
  ) {
    const accountType = this.mapAccountTypeLabel(account.accountType);
    const statementGroup = account.accountType === 'REVENUE' || account.accountType === 'EXPENSE' ? 'Income Statement' : 'Balance Sheet';
    const statementSection = account.statementSection ?? accountType;

    return {
      id: account.id.toString(),
      accountCode: account.accountCode,
      accountNumber: account.accountCode,
      accountTitle: account.accountTitle,
      accountName: overrides.accountName ?? account.accountTitle,
      name: overrides.accountName ?? account.accountTitle,
      label: account.accountCode,
      value: account.accountCode,
      accountType,
      statementGroup,
      statementSection,
      normalBalance: account.accountNature === 'CREDIT' ? 'Credit' : 'Debit',
      accountCategory: statementSection,
      description: overrides.description ?? account.description ?? account.accountTitle,
      status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
      isContra: false,
    };
  }

  private mapAccountTypeLabel(accountType: string | null): string {
    switch (accountType) {
      case 'ASSET':
        return 'Asset';
      case 'LIABILITY':
        return 'Liability';
      case 'EQUITY':
        return 'Equity';
      case 'REVENUE':
        return 'Revenue';
      case 'EXPENSE':
        return 'Expense';
      default:
        return accountType ?? '';
    }
  }

  private mapPartyAddress(
    address?: {
      id: bigint;
      addressName: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      barangay: string | null;
      barangayCode: string | null;
      cityMunicipality: string | null;
      cityMunicipalityCode: string | null;
      province: string | null;
      provinceCode: string | null;
      region: string | null;
      regionCode: string | null;
      isBilling: boolean;
      isBuilding: boolean;
      isDefault: boolean;
      isDelivery: boolean;
      isForeign: boolean;
      isHome: boolean;
    } | null,
  ): string {
    if (!address) {
      return '';
    }

    return [
      address.addressLine1,
      address.addressLine2,
      address.barangay,
      address.cityMunicipality,
      address.province,
      address.region,
    ]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(', ');
  }

  private getPartyName(party: {
    partyName: string | null;
    tradeName: string | null;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    suffixName: string | null;
    classification: PartyClassification;
  }): string {
    if (party.classification === PartyClassification.INDIVIDUAL) {
      const parts = [party.firstName, party.middleName, party.lastName, party.suffixName].filter(
        (part): part is string => Boolean(part && part.trim()),
      );
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }

    return party.tradeName || party.partyName || '';
  }

  private async getAccessibleCompanyId(user: AuthUser): Promise<number> {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    if (!canAccessModuleAction(user, companyId, RevolvingFundModuleCode, PermissionAction.VIEW)) {
      throw new ForbiddenException('You do not have permission to view Revolving Fund options.');
    }
    return companyId;
  }
}
