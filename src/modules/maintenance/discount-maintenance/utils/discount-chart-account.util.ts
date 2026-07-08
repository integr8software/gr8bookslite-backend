import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountStatus,
  ChartAccountType,
  DiscountType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { generateNextAccountCodeFromSiblings } from '../../chart-of-accounts/utils/chart-account-code.util';

type DiscountChartAccountWriteClient =
  | Pick<PrismaService, 'chartAccount' | 'companyDefaultAccount'>
  | Prisma.TransactionClient;

const DiscountManagementModuleCode = 'DSM';
const SalesDiscountParentRole = 'SALES_DISCOUNT_PARENT';
const PurchaseDiscountParentRole = 'PURCHASE_DISCOUNT_PARENT';

export async function resolveDiscountChartAccount(
  tx: DiscountChartAccountWriteClient,
  input: {
    companyId: number;
    type: DiscountType;
    accountTitle: string;
    createdByUserId: number | null;
  },
) {
  const parentMapping = await tx.companyDefaultAccount.findUnique({
    where: {
      companyId_moduleCode_accountRole: {
        companyId: input.companyId,
        moduleCode: DiscountManagementModuleCode,
        accountRole:
          input.type === DiscountType.PURCHASE
            ? PurchaseDiscountParentRole
            : SalesDiscountParentRole,
      },
    },
    include: {
      chartAccount: true,
    },
  });

  if (!parentMapping?.chartAccount) {
    throw new Error(
      `Default discount account parent is not configured for ${input.type}.`,
    );
  }

  const parent = parentMapping.chartAccount;
  const existing = await tx.chartAccount.findFirst({
    where: {
      companyId: input.companyId,
      parentAccountId: parent.id,
      accountTitle: {
        equals: input.accountTitle,
        mode: 'insensitive',
      },
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  const siblingCodes = await tx.chartAccount.findMany({
    where: {
      companyId: input.companyId,
      parentAccountId: parent.id,
      accountLevel: ChartAccountLevel.SPECIFIC,
    },
    select: {
      accountCode: true,
    },
  });
  const accountCode = generateNextAccountCodeFromSiblings({
    parentCode: parent.accountCode,
    accountLevel: ChartAccountLevel.SPECIFIC,
    siblingCodes: siblingCodes.map((account) => account.accountCode),
  });

  return tx.chartAccount.create({
    data: {
      companyId: input.companyId,
      parentAccountId: parent.id,
      accountCode,
      accountTitle: input.accountTitle,
      accountLevel: ChartAccountLevel.SPECIFIC,
      accountType:
        input.type === DiscountType.PURCHASE
          ? ChartAccountType.EXPENSE
          : ChartAccountType.REVENUE,
      accountNature:
        input.type === DiscountType.PURCHASE
          ? AccountNature.CREDIT
          : AccountNature.DEBIT,
      accountGroup: parent.accountGroup,
      statementSection: parent.statementSection,
      reportAlias: input.accountTitle,
      description: `Generated from Discount Management for ${input.accountTitle}.`,
      isPostingAccount: true,
      withSubsidiary: false,
      contraAccount: true,
      showTotal: false,
      status: ChartAccountStatus.ACTIVE,
      currencyCode: parent.currencyCode,
      whoCreated:
        input.createdByUserId === null ? null : String(input.createdByUserId),
    },
  });
}

export function getGeneratedDiscountAccountTitle(
  type: DiscountType,
  name: string,
) {
  return `${type === DiscountType.PURCHASE ? 'Purchase' : 'Sales'} Discount - ${name.trim()}`;
}
