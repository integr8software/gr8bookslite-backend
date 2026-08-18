import { BillingCycle, CompanyStatus, CompanyUnitType, TaxpayerType } from '@prisma/client';
import { mapWorkspaceCompany } from './workspace-company.mapper';

describe('mapWorkspaceCompany', () => {
  it('maps the latest subscription and derives monthly and yearly prices', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const companyUnit = {
      id: 11,
      companyId: 7,
      parentUnitId: null,
      type: CompanyUnitType.HEAD_OFFICE,
      code: 'HEAD-OFFICE',
      name: 'Head Office',
      tin: '123456789',
      address: 'Main address',
      contactNumber: '+63 912 345 6789',
      email: 'office@example.com',
      isActive: true,
      inheritsCompanyProfile: true,
      canTransactSales: true,
      canHoldInventory: true,
      createdAt,
      updatedAt,
    };

    const result = mapWorkspaceCompany({
      id: 7,
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      legalName: 'Acme Corporation',
      companyCode: 'ACME',
      countryCode: 'PH',
      baseCurrencyCode: 'PHP',
      taxpayerType: TaxpayerType.NON_INDIVIDUAL,
      ownerLastName: null,
      ownerFirstName: null,
      ownerMiddleName: null,
      organizationType: 'Corporation',
      organizationTypeOther: null,
      logoFileName: null,
      logoMimeType: null,
      logoStoragePath: null,
      logoPublicUrl: null,
      address: 'Main address',
      tin: '123456789',
      email: 'office@example.com',
      website: null,
      contactNumber: '+63 912 345 6789',
      reportStartDate: null,
      reportEndDate: null,
      createdByUserId: 3,
      createdByUser: { id: 3, name: 'Admin', email: 'admin@example.com' },
      isActive: true,
      status: CompanyStatus.ACTIVE,
      subscriptions: [
        {
          billingCycle: BillingCycle.MONTHLY,
          plan: {
            code: 'PRO',
            name: 'Professional',
            currency: 'PHP',
            prices: [
              { billingCycle: BillingCycle.MONTHLY, priceInCents: 150000, compareAtInCents: 175000 },
              { billingCycle: BillingCycle.YEARLY, priceInCents: 1500000, compareAtInCents: null },
            ],
          },
        },
      ],
      _count: { memberships: 4, units: 2 },
      units: [companyUnit],
      createdAt,
      updatedAt,
    } as never);

    expect(result.subscriptionPlan).toEqual({
      code: 'PRO',
      name: 'Professional',
      currency: 'PHP',
      billingCycle: BillingCycle.MONTHLY,
      monthlyPriceInCents: 150000,
      yearlyPriceInCents: 1500000,
    });
    expect(result.totalUsers).toBe(4);
    expect(result.totalUnits).toBe(2);
    expect(result.units).toEqual([
      expect.objectContaining({
        id: 11,
        displayName: 'Head Office',
        code: 'HEAD-OFFICE',
      }),
    ]);
  });

  it('returns a null plan and leaves units undefined when relations are absent', () => {
    const result = mapWorkspaceCompany({
      id: 8,
      name: 'No Subscription Co',
      slug: 'no-subscription-co',
      legalName: null,
      companyCode: null,
      countryCode: 'PH',
      baseCurrencyCode: 'PHP',
      taxpayerType: null,
      ownerLastName: null,
      ownerFirstName: null,
      ownerMiddleName: null,
      organizationType: null,
      organizationTypeOther: null,
      logoFileName: null,
      logoMimeType: null,
      logoStoragePath: null,
      logoPublicUrl: null,
      address: null,
      tin: null,
      email: null,
      website: null,
      contactNumber: null,
      reportStartDate: null,
      reportEndDate: null,
      createdByUserId: null,
      createdByUser: null,
      isActive: true,
      status: CompanyStatus.PROVISIONING,
      subscriptions: [],
      _count: undefined,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);

    expect(result.subscriptionPlan).toBeNull();
    expect(result.totalUsers).toBeUndefined();
    expect(result.totalUnits).toBeUndefined();
    expect(result.units).toBeUndefined();
  });
});
