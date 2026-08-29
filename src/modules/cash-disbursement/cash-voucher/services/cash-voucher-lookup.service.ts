import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ChartAccountStatus,
  DefaultAccountTemplateType,
  PartyClassification,
  PartyStatus,
  ResponsibilityCenterStatus,
  TermStatus,
} from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { canAccessModuleAction } from '../../../../common/utils/module-permissions.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildPartyAccountingAccountOptions } from '../../../maintenance/party-maintenance/utils/party-accounting-account.util';

export const CashVoucherModuleCode = 'CV';

@Injectable()
export class CashVoucherLookupService {
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

  async findTerms(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const terms = await this.prisma.term.findMany({
      where: { companyId, deletedAt: null, status: TermStatus.ACTIVE },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, dateMode: true, period: true, status: true },
    });

    return {
      terms: terms.map((term) => ({
        id: term.id.toString(),
        name: term.name,
        dateMode: term.dateMode,
        period: term.period,
        status: term.status,
      })),
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

  async findExpenseTypes(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const defaultAccounts = await this.prisma.defaultAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
        type: DefaultAccountTemplateType.EXPENSE,
        expenseCoa: {
          is: {
            companyId,
            deletedAt: null,
            isPostingAccount: true,
            status: ChartAccountStatus.ACTIVE,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        expenseCoa: {
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
        },
      },
    });

    return {
      accounts: defaultAccounts.flatMap((defaultAccount) => {
        if (!defaultAccount.expenseCoa) {
          return [];
        }

        return this.mapChartAccountDropdownOption(defaultAccount.expenseCoa, {
          accountName: defaultAccount.name,
          description: defaultAccount.description ?? defaultAccount.expenseCoa.description ?? defaultAccount.name,
        });
      }),
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
    };
  }

  private mapAccountTypeLabel(accountType: string | null) {
    switch (accountType) {
      case 'ASSET':
        return 'Assets';
      case 'LIABILITY':
        return 'Liabilities';
      case 'EQUITY':
        return 'Equity';
      case 'REVENUE':
        return 'Revenues';
      case 'EXPENSE':
        return 'Expenses';
      default:
        return accountType ?? '';
    }
  }

  private async getAccessibleCompanyId(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    if (
      canAccessModuleAction(user, companyId, CashVoucherModuleCode, PermissionAction.VIEW) ||
      canAccessModuleAction(user, companyId, CashVoucherModuleCode, PermissionAction.CREATE) ||
      canAccessModuleAction(user, companyId, CashVoucherModuleCode, PermissionAction.UPDATE)
    ) {
      return companyId;
    }

    throw new ForbiddenException('You do not have permission to access cash vouchers.');
  }

  private getPartyName(party: {
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

    return (
      [party.firstName, party.middleName, party.lastName, party.suffixName]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' ') ||
      party.partyName?.trim() ||
      'Unnamed Party'
    );
  }

  private mapPartyAddress(
    address:
      | {
          id: bigint;
          addressName: string;
          addressLine1: string;
          addressLine2: string;
          barangay: string | null;
          barangayCode: string | null;
          cityMunicipality: string | null;
          cityMunicipalityCode: string | null;
          isBilling: boolean;
          isBuilding: boolean;
          isDefault: boolean;
          isDelivery: boolean;
          isForeign: boolean;
          isHome: boolean;
          province: string | null;
          provinceCode: string | null;
          region: string | null;
          regionCode: string | null;
        }
      | undefined,
  ) {
    return {
      id: address?.id.toString() ?? '',
      addressName: address?.addressName ?? '',
      addressLine1: address?.addressLine1 ?? '',
      addressLine2: address?.addressLine2 ?? '',
      barangay: address?.barangay ?? '',
      barangayCode: address?.barangayCode ?? '',
      cityMunicipality: address?.cityMunicipality ?? '',
      cityMunicipalityCode: address?.cityMunicipalityCode ?? '',
      isBilling: address?.isBilling ?? false,
      isBuilding: address?.isBuilding ?? false,
      isDefault: address?.isDefault ?? true,
      isDelivery: address?.isDelivery ?? false,
      isForeign: address?.isForeign ?? false,
      isHome: address?.isHome ?? false,
      province: address?.province ?? '',
      provinceCode: address?.provinceCode ?? '',
      region: address?.region ?? '',
      regionCode: address?.regionCode ?? '',
    };
  }
}
