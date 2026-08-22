import { ForbiddenException, Injectable } from '@nestjs/common';
import { TaxStatus } from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { canAccessModuleAction } from '../../../../common/utils/module-permissions.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ChartOfAccountsLookupService } from '../../../maintenance/chart-of-accounts/lookups/chart-of-accounts-lookup.service';
import { PartyLookupService } from '../../../maintenance/party-maintenance/lookups/party-lookup.service';
import { ResponsibilityCenterLookupService } from '../../../maintenance/responsibility-center/lookups/responsibility-center-lookup.service';

const JournalVoucherModuleCode = 'JV';
const JournalVoucherTaxOptionFilters = [
  { transactionType: 'Purchases', taxType: 'INPUT VAT' },
  { transactionType: 'Sales', taxType: 'OUTPUT VAT' },
  { transactionType: 'Purchases', taxType: 'EWT' },
  { transactionType: 'Sales', taxType: 'CWT' },
] as const;

@Injectable()
export class JournalVoucherLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chartOfAccountsLookupService: ChartOfAccountsLookupService,
    private readonly partyLookupService: PartyLookupService,
    private readonly responsibilityCenterLookupService: ResponsibilityCenterLookupService,
  ) {}

  async findOptions(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    const canPrepare = [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.UPDATE].some((action) =>
      canAccessModuleAction(user, companyId, JournalVoucherModuleCode, action),
    );

    if (!canPrepare) {
      throw new ForbiddenException('You do not have permission to prepare journal vouchers.');
    }

    const [accounts, parties, responsibilityCenters, taxCodes] = await Promise.all([
      this.chartOfAccountsLookupService.findPostingOptionsForCompanyUser(user, {}),
      this.partyLookupService.findOptionsForCompanyUser(user, { detail: 'complete' }),
      this.responsibilityCenterLookupService.findOptionsForCompanyUser(user, {}),
      this.findTaxCodes(),
    ]);

    return {
      accounts: accounts.accounts,
      parties: parties.parties,
      responsibilityCenters: responsibilityCenters.responsibilityCenters,
      taxCodes,
    };
  }

  private async findTaxCodes() {
    const taxCodes = await this.prisma.tax.findMany({
      where: {
        status: TaxStatus.ACTIVE,
        OR: JournalVoucherTaxOptionFilters.map((filter) => ({
          transactionType: filter.transactionType,
          taxType: filter.taxType,
        })),
      },
      orderBy: [{ transactionType: 'asc' }, { taxType: 'asc' }, { sortOrder: 'asc' }, { taxCode: 'asc' }, { taxDescription: 'asc' }],
      select: {
        atc: true,
        id: true,
        natureOfIncome: true,
        officialAtcCode: true,
        sortOrder: true,
        sourceKey: true,
        status: true,
        taxAlias: true,
        taxCode: true,
        taxDescription: true,
        taxExempt: true,
        taxRate: true,
        taxType: true,
        transactionType: true,
      },
    });

    return taxCodes.map((taxCode) => ({
      ...taxCode,
      id: taxCode.id.toString(),
      taxRate: taxCode.taxRate.toString(),
    }));
  }
}
