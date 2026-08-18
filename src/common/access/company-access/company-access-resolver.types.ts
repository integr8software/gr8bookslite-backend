import { Prisma, SystemRole } from '@prisma/client';

export type MembershipAccessRecord = Prisma.MembershipGetPayload<{
  include: {
    company: {
      include: {
        subscriptions: {
          where: {
            status: {
              in: ['INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID'];
            };
            NOT: {
              status: 'INCOMPLETE';
              invoices: {
                some: {
                  purpose: 'ADDITIONAL_COMPANY';
                  status: 'OPEN';
                };
              };
            };
          };
          include: {
            plan: {
              include: {
                systems: {
                  where: { isEnabled: true; system: { isActive: true } };
                  include: {
                    system: {
                      include: {
                        modules: {
                          where: {
                            isActive: true;
                            module: { isActive: true };
                          };
                          include: {
                            module: {
                              include: {
                                permissions: {
                                  where: { isActive: true };
                                  orderBy: { id: 'asc' };
                                };
                              };
                            };
                          };
                          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }];
                        };
                        sidebarItems: {
                          where: { isVisible: true };
                          include: {
                            module: {
                              include: {
                                permissions: {
                                  where: { isActive: true };
                                  orderBy: { id: 'asc' };
                                };
                              };
                            };
                          };
                          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }];
                        };
                      };
                    };
                  };
                  orderBy: [{ system: { sortOrder: 'asc' } }];
                };
              };
            };
          };
          orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }];
          take: 1;
        };
        units: {
          where: {
            isActive: true;
          };
          select: {
            id: true;
          };
          orderBy: {
            id: 'asc';
          };
        };
        sidebarPreferences: {
          where: {
            userId: number;
          };
        };
      };
    };
    companyRole: {
      include: {
        permissions: {
          where: {
            permission: {
              isActive: true;
              module: { isActive: true };
            };
          };
          include: {
            permission: {
              include: { module: true };
            };
          };
        };
      };
    };
    unitAccess: {
      include: {
        companyRole: {
          include: {
            permissions: {
              where: {
                permission: {
                  isActive: true;
                  module: { isActive: true };
                };
              };
              include: {
                permission: {
                  include: { module: true };
                };
              };
            };
          };
        };
      };
    };
    permissionOverrides: {
      where: {
        permission: {
          isActive: true;
          module: { isActive: true };
        };
      };
      include: {
        permission: {
          include: { module: true };
        };
      };
    };
  };
}>;

export type ActiveUserRecord = {
  id: number;
  systemRole: SystemRole;
};

export type CompanyAccessContext = {
  user: ActiveUserRecord;
  membership: MembershipAccessRecord | null;
};
