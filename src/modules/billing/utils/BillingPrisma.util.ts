import { Prisma } from '@prisma/client';

export const companySubscriptionDetailsInclude =
  Prisma.validator<Prisma.CompanySubscriptionInclude>()({
    plan: true,
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
