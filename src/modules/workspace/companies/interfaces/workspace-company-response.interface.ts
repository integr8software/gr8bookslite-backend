import type { BillingCycle, CompanyStatus, CompanyUnitType, TaxpayerType } from '@prisma/client';

export interface CompanyUnitResponse {
  id: number;
  companyId: number;
  parentUnitId: number | null;
  type: CompanyUnitType;
  code: string | null;
  name: string;
  displayName: string | null;
  tin: string | null;
  address: string | null;
  contactNumber: string | null;
  email: string | null;
  isActive: boolean;
  inheritsCompanyProfile: boolean;
  canTransactSales: boolean;
  canHoldInventory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceCompanyResponse {
  id: number;
  name: string;
  slug: string;
  legalName: string | null;
  companyCode: string | null;
  taxpayerType: TaxpayerType | null;
  ownerLastName: string | null;
  ownerFirstName: string | null;
  ownerMiddleName: string | null;
  organizationType: string | null;
  organizationTypeOther: string | null;
  logoFileName: string | null;
  logoMimeType: string | null;
  logoStoragePath: string | null;
  logoPublicUrl: string | null;
  address: string | null;
  tin: string | null;
  email: string | null;
  website: string | null;
  contactNumber: string | null;
  reportStartDate: Date | null;
  reportEndDate: Date | null;
  createdByUserId: number | null;
  createdByUser: {
    id: number;
    name: string;
    email: string;
  } | null;
  isActive: boolean;
  status: CompanyStatus;
  subscriptionPlan: {
    code: string;
    name: string;
    currency: string;
    billingCycle: BillingCycle;
    monthlyPriceInCents: number;
    yearlyPriceInCents: number;
  } | null;
  totalUsers?: number;
  totalUnits?: number;
  units?: CompanyUnitResponse[];
  createdAt: Date;
  updatedAt: Date;
}
