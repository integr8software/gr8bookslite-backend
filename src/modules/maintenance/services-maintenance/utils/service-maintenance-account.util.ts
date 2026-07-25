import { BadRequestException } from '@nestjs/common';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
import { generateNextAccountCodeFromSiblings } from '../../chart-of-accounts/utils/chart-account-code.util';
import {
  accountGroupHasTag,
  findSystemAccountGroupOrThrow,
  mergeAccountGroupTags,
  SystemAccountGroups,
  SystemAccountGroupTags,
} from '../../chart-of-accounts/utils/system-account-groups.util';
import type { ServicesMaintenancePrismaClient } from '../types/service-maintenance.type';

export { accountGroupHasTag };

export const ServiceRevenueAccountGroupTag = SystemAccountGroupTags.serviceRevenues;

export async function findServiceRevenueParentOrThrow(companyId: number, tx: ServicesMaintenancePrismaClient) {
  return findSystemAccountGroupOrThrow(tx, companyId, SystemAccountGroups.servicesMaintenance.serviceRevenueParent);
}

export async function generateNextServiceRevenueAccountCode(companyId: number, parentAccountId: bigint, parentAccountCode: string, tx: ServicesMaintenancePrismaClient) {
  const siblings = await tx.chartAccount.findMany({
    where: {
      companyId,
      parentAccountId,
      accountLevel: ChartAccountLevel.SPECIFIC,
    },
    select: { accountCode: true },
    orderBy: { accountCode: 'asc' },
  });

  return generateNextAccountCodeFromSiblings({
    parentCode: parentAccountCode,
    accountLevel: ChartAccountLevel.SPECIFIC,
    siblingCodes: siblings.map((sibling) => sibling.accountCode),
  });
}

export async function findSelectableServiceRevenueAccountOrThrow(companyId: number, revenueCoaId: string, tx: ServicesMaintenancePrismaClient) {
  const account = await tx.chartAccount.findFirst({
    where: {
      id: parsePositiveBigIntId(revenueCoaId),
      companyId,
      accountLevel: ChartAccountLevel.SPECIFIC,
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.CREDIT,
      status: ChartAccountStatus.ACTIVE,
      deletedAt: null,
      isPostingAccount: true,
    },
  });

  if (!account || !accountGroupHasTag(account.accountGroup, SystemAccountGroupTags.serviceRevenues)) {
    throw new BadRequestException('Selected revenue account must be an active posting account under Service Revenues.');
  }

  return account;
}

export function buildServiceRevenueAccountGroupTags() {
  return mergeAccountGroupTags(SystemAccountGroupTags.revenue, SystemAccountGroupTags.serviceRevenues);
}
