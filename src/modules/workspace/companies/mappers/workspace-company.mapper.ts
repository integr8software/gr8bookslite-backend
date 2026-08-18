import type { CompanyUnit } from '@prisma/client';
import { getSubscriptionPlanPriceSummary } from '../../../../common/utils/SubscriptionPlanPricing.util';
import type { CompanyUnitResponse, WorkspaceCompanyResponse } from '../interfaces/workspace-company-response.interface';
import type { WorkspaceCompanyRecord } from '../types/workspace-company-query.type';

export function mapWorkspaceCompany(company: WorkspaceCompanyRecord): WorkspaceCompanyResponse {
  const units = 'units' in company ? company.units : undefined;
  const subscription = company.subscriptions[0];
  const subscriptionPrices = subscription?.plan.prices ?? [];
  const priceSummary = getSubscriptionPlanPriceSummary(subscriptionPrices);

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    legalName: company.legalName,
    companyCode: company.companyCode,
    countryCode: company.countryCode,
    baseCurrencyCode: company.baseCurrencyCode,
    taxpayerType: company.taxpayerType,
    ownerLastName: company.ownerLastName,
    ownerFirstName: company.ownerFirstName,
    ownerMiddleName: company.ownerMiddleName,
    organizationType: company.organizationType,
    organizationTypeOther: company.organizationTypeOther,
    logoFileName: company.logoFileName,
    logoMimeType: company.logoMimeType,
    logoStoragePath: company.logoStoragePath,
    logoPublicUrl: company.logoPublicUrl,
    address: company.address,
    tin: company.tin,
    email: company.email,
    website: company.website,
    contactNumber: company.contactNumber,
    reportStartDate: company.reportStartDate,
    reportEndDate: company.reportEndDate,
    createdByUserId: company.createdByUserId,
    createdByUser: company.createdByUser
      ? {
          id: company.createdByUser.id,
          name: company.createdByUser.name,
          email: company.createdByUser.email,
        }
      : null,
    isActive: company.isActive,
    status: company.status,
    subscriptionPlan: subscription
      ? {
          code: subscription.plan.code,
          name: subscription.plan.name,
          currency: subscription.plan.currency,
          billingCycle: subscription.billingCycle,
          monthlyPriceInCents: priceSummary.monthlyPriceInCents,
          yearlyPriceInCents: priceSummary.yearlyPriceInCents,
        }
      : null,
    totalUsers: company._count?.memberships ?? undefined,
    totalUnits: company._count?.units ?? undefined,
    units: units?.map(mapCompanyUnit),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export function mapCompanyUnit(unit: CompanyUnit): CompanyUnitResponse {
  return {
    id: unit.id,
    companyId: unit.companyId,
    parentUnitId: unit.parentUnitId,
    type: unit.type,
    code: unit.code,
    name: unit.name,
    displayName: unit.name,
    tin: unit.tin,
    address: unit.address,
    contactNumber: unit.contactNumber,
    email: unit.email,
    isActive: unit.isActive,
    inheritsCompanyProfile: unit.inheritsCompanyProfile,
    canTransactSales: unit.canTransactSales,
    canHoldInventory: unit.canHoldInventory,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}
