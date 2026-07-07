import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountStatus,
  ChartAccountType,
  DiscountStatus,
  DiscountType,
  DiscountValueType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { generateNextAccountCodeFromSiblings } from '../chart-of-accounts/utils/chart-account-code.util';

type DiscountWriteClient =
  | Pick<PrismaService, 'chartAccount' | 'companyDefaultAccount' | 'discount'>
  | Prisma.TransactionClient;

const DiscountManagementModuleCode = 'DSM';
const SalesDiscountParentRole = 'SALES_DISCOUNT_PARENT';
const PurchaseDiscountParentRole = 'PURCHASE_DISCOUNT_PARENT';

export const DefaultCompanyDiscounts = [
  {
    name: 'Prompt Payment',
    description:
      'Use for sales invoices when customers receive a discount for paying within the agreed early-payment period.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 5,
    accountTitle: 'Sales Discount - Prompt Payment',
  },
  {
    name: 'Trade Discount',
    description:
      'Use for standard sales price reductions given to resellers, dealers, or trade customers before billing.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 7.5,
    accountTitle: 'Sales Discount - Trade',
  },
  {
    name: 'Volume Sales Discount',
    description:
      'Use for sales transactions where the customer qualifies for a discount because the order meets a volume threshold.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 10,
    accountTitle: 'Sales Discount - Volume Sales',
  },
  {
    name: 'Senior Citizen Discount',
    description:
      'Use for legally required or company-approved senior citizen sales discounts when the customer is eligible.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 20,
    accountTitle: 'Sales Discount - Senior Citizen',
  },
  {
    name: 'PWD Discount',
    description:
      'Use for legally required or company-approved PWD sales discounts when the customer is eligible.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 20,
    accountTitle: 'Sales Discount - PWD',
  },
  {
    name: 'Promotional Discount',
    description:
      'Use for temporary campaign, seasonal, launch, or marketing discounts applied to customer sales.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 10,
    accountTitle: 'Sales Discount - Promotional',
  },
  {
    name: 'Loyalty Discount',
    description:
      'Use for sales discounts granted to repeat customers, members, or loyalty program participants.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 5,
    accountTitle: 'Sales Discount - Loyalty',
  },
  {
    name: 'Employee Discount',
    description:
      'Use for sales discounts granted to employees under an approved employee purchase policy.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 10,
    accountTitle: 'Sales Discount - Employee',
  },
  {
    name: 'Special Approval Discount',
    description:
      'Use for sales discounts that require manager or authorized approval outside standard discount policies.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: 15,
    accountTitle: 'Sales Discount - Special Approval',
  },
  {
    name: 'Fixed Sales Discount',
    description:
      'Use for sales transactions where a fixed amount is deducted from the invoice instead of a percentage.',
    type: DiscountType.SALES,
    valueType: DiscountValueType.FIXED,
    value: 100,
    accountTitle: 'Sales Discount - Fixed Amount',
  },
  {
    name: 'Supplier Early Payment',
    description:
      'Use for purchase transactions when the supplier gives a discount for paying before the due date.',
    type: DiscountType.PURCHASE,
    valueType: DiscountValueType.PERCENTAGE,
    value: 2,
    accountTitle: 'Purchase Discount - Supplier Early Payment',
  },
  {
    name: 'Volume Purchase Discount',
    description:
      'Use for purchase transactions where the supplier grants a fixed discount because the order meets a volume threshold.',
    type: DiscountType.PURCHASE,
    valueType: DiscountValueType.FIXED,
    value: 100,
    accountTitle: 'Purchase Discount - Volume Purchase',
  },
  {
    name: 'Supplier Trade Discount',
    description:
      'Use for regular supplier trade discounts deducted from purchase cost before recording the payable.',
    type: DiscountType.PURCHASE,
    valueType: DiscountValueType.PERCENTAGE,
    value: 5,
    accountTitle: 'Purchase Discount - Supplier Trade',
  },
  {
    name: 'Purchase Rebate',
    description:
      'Use for supplier rebates or purchase discounts earned after meeting agreed buying conditions.',
    type: DiscountType.PURCHASE,
    valueType: DiscountValueType.PERCENTAGE,
    value: 3,
    accountTitle: 'Purchase Discount - Rebate',
  },
  {
    name: 'Bulk Purchase Discount',
    description:
      'Use for supplier discounts granted when purchases are ordered or received in bulk quantities.',
    type: DiscountType.PURCHASE,
    valueType: DiscountValueType.PERCENTAGE,
    value: 10,
    accountTitle: 'Purchase Discount - Bulk Purchase',
  },
] as const;

export async function seedDefaultDiscountsForCompany(
  tx: DiscountWriteClient,
  companyId: number,
) {
  const existingCount = await tx.discount.count({
    where: {
      companyId,
      deletedAt: null,
    },
  });

  if (existingCount > 0) {
    return 0;
  }

  let createdCount = 0;

  for (const discount of DefaultCompanyDiscounts) {
    const chartAccount = await resolveDiscountChartAccount(tx, {
      companyId,
      type: discount.type,
      accountTitle: discount.accountTitle,
      createdByUserId: null,
    });

    await tx.discount.upsert({
      where: {
        companyId_name: {
          companyId,
          name: discount.name,
        },
      },
      update: {
        chartAccountId: chartAccount.id,
        description: discount.description,
        type: discount.type,
        valueType: discount.valueType,
        value: discount.value,
        status: DiscountStatus.ACTIVE,
        deletedAt: null,
      },
      create: {
        companyId,
        chartAccountId: chartAccount.id,
        name: discount.name,
        description: discount.description,
        type: discount.type,
        valueType: discount.valueType,
        value: discount.value,
        status: DiscountStatus.ACTIVE,
        createdByUserId: null,
      },
    });
    createdCount += 1;
  }

  return createdCount;
}

export async function resolveDiscountChartAccount(
  tx: DiscountWriteClient,
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
