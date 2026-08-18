import { Prisma } from '@prisma/client';

export type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        company: {
          include: {
            subscriptions: {
              orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }];
              take: 1;
            };
          };
        };
        companyRole: true;
        unitAccess: {
          include: {
            unit: true;
          };
        };
      };
    };
  };
}>;

