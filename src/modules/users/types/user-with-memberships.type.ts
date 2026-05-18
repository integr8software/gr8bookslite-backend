import { Prisma } from '@prisma/client';

export type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        company: true;
        companyRole: true;
      };
    };
  };
}>;
