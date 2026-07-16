import {
  ResponsibilityCenterCategory,
  ResponsibilityCenterFinancialType,
  ResponsibilityCenterTrackingBehavior,
} from '@prisma/client';

export const ResponsibilityCenterClassificationDefaults = [
  {
    code: 'CC',
    name: 'Cost Center',
    financialType: ResponsibilityCenterFinancialType.COST_CENTER,
    trackingBehavior: ResponsibilityCenterTrackingBehavior.EXPENSES,
  },
  {
    code: 'RC',
    name: 'Revenue Center',
    financialType: ResponsibilityCenterFinancialType.REVENUE_CENTER,
    trackingBehavior: ResponsibilityCenterTrackingBehavior.REVENUE,
  },
  {
    code: 'PC',
    name: 'Profit Center',
    financialType: ResponsibilityCenterFinancialType.PROFIT_CENTER,
    trackingBehavior: ResponsibilityCenterTrackingBehavior.REVENUE_AND_EXPENSES,
  },
  {
    code: 'IC',
    name: 'Investment Center',
    financialType: ResponsibilityCenterFinancialType.INVESTMENT_CENTER,
    trackingBehavior:
      ResponsibilityCenterTrackingBehavior.REVENUE_EXPENSES_AND_ASSETS,
  },
] as const;

export const ResponsibilityCenterTypePrefixByCategory: Record<
  ResponsibilityCenterCategory,
  string
> = {
  CORPORATE: 'CORP',
  DIVISION: 'DIV',
  DEPARTMENT: 'DEPT',
  SECTION: 'SEC',
  TEAM: 'TEAM',
  BRANCH: 'BR',
  BUILDING: 'BLDG',
  PROJECT: 'PROJ',
  BUSINESS_UNIT: 'BU',
  REGION: 'REG',
  SALESMAN: 'SM',
  WAREHOUSE: 'WHSE',
  OUTLET: 'OUT',
  SALES_TERRITORY: 'ST',
  FLEET: 'FLEET',
};

export const ResponsibilityCenterTypeNameByCategory: Record<
  ResponsibilityCenterCategory,
  string
> = {
  CORPORATE: 'Corporate',
  DIVISION: 'Division',
  DEPARTMENT: 'Department',
  SECTION: 'Section',
  TEAM: 'Team',
  BRANCH: 'Branch',
  BUILDING: 'Building',
  PROJECT: 'Project',
  BUSINESS_UNIT: 'Business Unit',
  REGION: 'Region',
  SALESMAN: 'Salesman',
  WAREHOUSE: 'Warehouse',
  OUTLET: 'Outlet',
  SALES_TERRITORY: 'Sales Territory',
  FLEET: 'Fleet',
};

export function getClassificationDefaultByFinancialType(
  financialType: ResponsibilityCenterFinancialType,
) {
  return ResponsibilityCenterClassificationDefaults.find(
    (classification) => classification.financialType === financialType,
  );
}

export function getFinancialTypeByClassificationCode(code: string) {
  return ResponsibilityCenterClassificationDefaults.find(
    (classification) => classification.code === code,
  )?.financialType;
}
