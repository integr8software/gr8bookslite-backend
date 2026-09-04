import { BadRequestException } from '@nestjs/common';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, ServiceMaintenanceType } from '@prisma/client';
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

export const ServiceRevenueAccountGroupTag = SystemAccountGroupTags.serviceRevenues;

export async function findServiceRevenueParentOrThrow(companyId: number, tx: ServicesMaintenancePrismaClient) {
  return findSystemAccountGroupOrThrow(tx, companyId, SystemAccountGroups.servicesMaintenance.serviceRevenueParent);
}

export async function generateNextServiceRevenueAccountCode(
  companyId: number,
  parentAccountId: bigint,
  parentAccountCode: string,
  tx: ServicesMaintenancePrismaClient,
) {
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
  return findSelectableServiceAccountOrThrow(companyId, revenueCoaId, ServiceMaintenanceType.SALES, tx);
}

export async function findSelectableServiceAccountOrThrow(
  companyId: number,
  coaId: string,
  serviceType: ServiceMaintenanceType,
  tx: ServicesMaintenancePrismaClient,
) {
  const parsedId = parsePositiveBigIntId(coaId);
  const account = await tx.chartAccount.findFirst({
    where: {
      id: parsedId,
      companyId,
      accountLevel: ChartAccountLevel.SPECIFIC,
      status: ChartAccountStatus.ACTIVE,
      deletedAt: null,
      isPostingAccount: true,
    },
  });

  if (!account) {
    throw new BadRequestException('Selected account must be an active posting account.');
  }

  if (serviceType === ServiceMaintenanceType.PURCHASES) {
    if (account.accountType !== ChartAccountType.EXPENSE) {
      throw new BadRequestException('Selected account for purchase of service must be an active posting expense account.');
    }
  } else {
    if (
      account.accountType !== ChartAccountType.REVENUE ||
      !accountGroupHasTag(account.accountGroup, SystemAccountGroupTags.serviceRevenues)
    ) {
      throw new BadRequestException('Selected revenue account must be an active posting account under Service Revenues.');
    }
  }

  return account;
}

export function buildServiceRevenueAccountGroupTags() {
  return mergeAccountGroupTags(SystemAccountGroupTags.revenue, SystemAccountGroupTags.serviceRevenues);
}
