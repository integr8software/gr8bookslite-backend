import { Prisma, ResponsibilityCenterCategory, ResponsibilityCenterFinancialType, ResponsibilityCenterStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type ResponsibilityCenterWriteClient = Pick<PrismaService, 'responsibilityCenter'> | Prisma.TransactionClient;

export const ResponsibilityCenterSeedRecords = [
  {
    code: 'CORP',
    name: 'Corporate Office',
    category: ResponsibilityCenterCategory.CORPORATE,
    financialType: ResponsibilityCenterFinancialType.INVESTMENT_CENTER,
    manager: 'Company Administrator',
    parentCode: null,
    description: 'Top-level company accountability and statutory reporting.',
  },
  {
    code: 'FIN',
    name: 'Finance and Administration',
    category: ResponsibilityCenterCategory.DEPARTMENT,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'Finance Manager',
    parentCode: 'CORP',
    description: 'Accounting, treasury, payroll, and administrative overhead.',
  },
  {
    code: 'OPS',
    name: 'Operations',
    category: ResponsibilityCenterCategory.DIVISION,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'Operations Manager',
    parentCode: 'CORP',
    description: 'Core operating teams and service delivery cost rollups.',
  },
  {
    code: 'SALES',
    name: 'Sales and Customer Growth',
    category: ResponsibilityCenterCategory.DEPARTMENT,
    financialType: ResponsibilityCenterFinancialType.PROFIT_CENTER,
    manager: 'Sales Manager',
    parentCode: 'CORP',
    description: 'Revenue, gross margin, discounts, and sales campaign ownership.',
  },
  {
    code: 'MAIN-BR',
    name: 'Main Branch',
    category: ResponsibilityCenterCategory.BRANCH,
    financialType: ResponsibilityCenterFinancialType.PROFIT_CENTER,
    manager: 'Branch Manager',
    parentCode: 'CORP',
    description: 'Primary branch for sales, cash collection, and local expenses.',
  },
  {
    code: 'MAIN-WHSE',
    name: 'Main Warehouse',
    category: ResponsibilityCenterCategory.WAREHOUSE,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'Warehouse Supervisor',
    parentCode: 'OPS',
    description: 'Receiving, storage, inventory handling, and warehouse expenses.',
  },
  {
    code: 'PROC',
    name: 'Procurement',
    category: ResponsibilityCenterCategory.DEPARTMENT,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'Procurement Lead',
    parentCode: 'OPS',
    description: 'Supplier sourcing, purchase processing, and landed cost support.',
  },
  {
    code: 'ONLINE',
    name: 'Online Sales',
    category: ResponsibilityCenterCategory.BUSINESS_UNIT,
    financialType: ResponsibilityCenterFinancialType.PROFIT_CENTER,
    manager: 'Ecommerce Lead',
    parentCode: 'SALES',
    description: 'Marketplace, web store, and digital sales contribution.',
  },
  {
    code: 'FIELD-SALES',
    name: 'Field Sales',
    category: ResponsibilityCenterCategory.SALES_TERRITORY,
    financialType: ResponsibilityCenterFinancialType.REVENUE_CENTER,
    manager: 'Field Sales Lead',
    parentCode: 'SALES',
    description: 'Territory sales, route coverage, and customer acquisition.',
  },
  {
    code: 'IMPL-PROJ',
    name: 'Implementation Projects',
    category: ResponsibilityCenterCategory.PROJECT,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'Project Coordinator',
    parentCode: 'OPS',
    description: 'Customer onboarding, branch setup, and one-time project costs.',
  },
  {
    code: 'HR',
    name: 'Human Resources',
    category: ResponsibilityCenterCategory.DEPARTMENT,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'HR Officer',
    parentCode: 'FIN',
    description: 'Recruitment, employee services, training, and HR overhead.',
  },
  {
    code: 'IT',
    name: 'Information Technology',
    category: ResponsibilityCenterCategory.DEPARTMENT,
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    manager: 'IT Administrator',
    parentCode: 'FIN',
    description: 'Systems, subscriptions, equipment, and support costs.',
  },
] as const;

export async function seedCompanyResponsibilityCenterDefaults(tx: ResponsibilityCenterWriteClient, companyId: number) {
  const existingCenters = await tx.responsibilityCenter.findMany({
    where: {
      companyId,
      deletedAt: null,
      code: {
        in: ResponsibilityCenterSeedRecords.map((record) => record.code),
      },
    },
    select: { id: true, code: true },
  });
  const centerIdByCode = new Map(existingCenters.map((center) => [center.code, center.id]));

  if (centerIdByCode.size === ResponsibilityCenterSeedRecords.length) {
    return 0;
  }

  let createdCount = 0;

  for (const record of ResponsibilityCenterSeedRecords) {
    if (centerIdByCode.has(record.code)) {
      continue;
    }

    const parentId = record.parentCode ? (centerIdByCode.get(record.parentCode) ?? null) : null;
    const center = await tx.responsibilityCenter.create({
      data: {
        companyId,
        code: record.code,
        name: record.name,
        category: record.category,
        financialType: record.financialType,
        manager: record.manager,
        parentId,
        status: ResponsibilityCenterStatus.ACTIVE,
        description: record.description,
        createdByUserId: null,
      },
      select: { id: true },
    });

    centerIdByCode.set(record.code, center.id);
    createdCount += 1;
  }

  return createdCount;
}
