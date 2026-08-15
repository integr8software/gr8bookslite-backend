import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ChartAccountStatus,
  DefaultAccountTemplateType,
  PartyClassification,
  PartyStatus,
  PartyType,
  ResponsibilityCenterStatus,
  TermStatus,
} from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { canAccessModuleAction } from '../../../../common/utils/module-permissions.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildPartyAccountingAccountOptions } from '../../../maintenance/party-maintenance/utils/party-accounting-account.util';

const AccountsPayableVoucherModuleCode = 'APV';
@Injectable()
export class AccountsPayableVoucherLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findParties(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const parties = await this.prisma.party.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        OR: [{ partyTypes: { has: PartyType.VENDOR } }, { partyTypes: { has: PartyType.EMPLOYEE } }],
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

        return {
          id: party.id.toString(),
          partyCodeNo: party.partyCodeNo,
          classification: party.classification,
          partyTypes: party.partyTypes,
          status: party.status,
          name: this.getPartyName(party),
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
        type: { select: { name: true } },
      },
    });

    return {
      responsibilityCenters: responsibilityCenters.map((center) => ({
        id: center.id.toString(),
        code: center.code,
        name: center.name,
        typeName: center.type.name,
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
        description: true,
        expenseCoa: {
          select: {
            accountCode: true,
            accountNature: true,
            accountTitle: true,
            accountType: true,
            description: true,
            id: true,
            statementSection: true,
            status: true,
          },
        },
        name: true,
      },
    });

    return {
      accounts: defaultAccounts.flatMap((defaultAccount) =>
        defaultAccount.expenseCoa
          ? [
              this.mapChartAccountDropdownOption(defaultAccount.expenseCoa, {
                accountName: defaultAccount.name,
                description: defaultAccount.description,
              }),
            ]
          : [],
      ),
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
        accountCode: true,
        accountNature: true,
        accountTitle: true,
        accountType: true,
        description: true,
        id: true,
        statementSection: true,
        status: true,
      },
    });

    return {
      accounts: accounts.map((account) => this.mapChartAccountDropdownOption(account)),
    };
  }

  async findPayableAccounts(user: AuthUser) {
    const companyId = await this.getAccessibleCompanyId(user);
    const accounts = await this.prisma.chartAccount.findMany({
      where: { companyId, deletedAt: null, status: ChartAccountStatus.ACTIVE },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
    });

    const options = buildPartyAccountingAccountOptions(accounts);

    return {
      defaultAccounts: {
        defaultPayableAccount: options.defaultAccounts.defaultPayableAccount,
        employeePayableAccount: options.defaultAccounts.employeePayableAccount,
      },
      accountOptions: {
        defaultPayableAccount: options.accountOptions.defaultPayableAccount,
        employeePayableAccount: options.accountOptions.employeePayableAccount,
      },
    };
  }

  private async getAccessibleCompanyId(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    if (
      canAccessModuleAction(user, companyId, AccountsPayableVoucherModuleCode, PermissionAction.VIEW) ||
      canAccessModuleAction(user, companyId, AccountsPayableVoucherModuleCode, PermissionAction.CREATE) ||
      canAccessModuleAction(user, companyId, AccountsPayableVoucherModuleCode, PermissionAction.UPDATE)
    ) {
      return companyId;
    }

    throw new ForbiddenException('You do not have permission to prepare accounts payable vouchers.');
  }

  private mapChartAccountDropdownOption(
    account: {
      accountCode: string;
      accountNature: string | null;
      accountTitle: string;
      accountType: string | null;
      description: string | null;
      id: bigint;
      statementSection: string | null;
      status: ChartAccountStatus;
    },
    overrides: { accountName?: string; description?: string | null } = {},
  ) {
    const accountType = this.mapAccountTypeLabel(account.accountType);
    const statementGroup = account.accountType === 'REVENUE' || account.accountType === 'EXPENSE' ? 'Income Statement' : 'Balance Sheet';

    return {
      id: account.id.toString(),
      accountNumber: account.accountCode,
      accountName: overrides.accountName ?? account.accountTitle,
      accountType,
      statementGroup,
      statementSection: account.statementSection ?? accountType,
      normalBalance: account.accountNature === 'CREDIT' ? 'Credit' : 'Debit',
      accountCategory: account.statementSection ?? accountType,
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
        return '';
    }
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
