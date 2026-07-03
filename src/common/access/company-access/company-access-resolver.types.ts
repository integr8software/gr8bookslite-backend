import { Prisma, SystemRole } from '@prisma/client';

export type MembershipAccessRecord = Prisma.MembershipGetPayload<{
  include: {
    company: {
      include: {
        subscriptions: {
          include: {
            plan: {
              include: {
                systems: {
                  where: { isEnabled: true; system: { isActive: true } };
                  include: {
                    system: {
                      include: {
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
        enabledModules: {
          where: {
            isEnabled: true;
            module: {
              isActive: true;
            };
          };
          select: {
            moduleId: true;
            module: {
              include: {
                permissions: {
                  where: {
                    isActive: true;
                  };
                  orderBy: {
                    id: 'asc';
                  };
                };
              };
            };
          };
        };
        moduleSidebar: {
          include: {
            module: {
              include: {
                permissions: {
                  where: {
                    isActive: true;
                  };
                  orderBy: {
                    id: 'asc';
                  };
                };
              };
            };
          };
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }];
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
