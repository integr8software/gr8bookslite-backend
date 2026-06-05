import { Prisma } from '@prisma/client';

export const companySubscriptionDetailsInclude =
  Prisma.validator<Prisma.CompanySubscriptionInclude>()({
    plan: {
      include: {
        prices: {
          where: { isActive: true },
          orderBy: [{ billingCycle: 'asc' }],
        },
        usageRules: {
          where: { isActive: true },
          orderBy: [{ metric: 'asc' }],
        },
        discountTiers: {
          where: { isActive: true },
          orderBy: [{ metric: 'asc' }, { thresholdCount: 'asc' }],
        },
        modules: {
          orderBy: [{ moduleKey: 'asc' }],
        },
      },
    },
    planPrice: true,
    billingCustomer: true,
    invoices: {
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    },
    paymentMethods: {
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    },
  });

export type CompanySubscriptionDetails = Prisma.CompanySubscriptionGetPayload<{
  include: typeof companySubscriptionDetailsInclude;
}>;
