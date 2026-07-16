import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyStatus, MembershipStatus, SubscriptionStatus, SystemRole, UserStatus } from '@prisma/client';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { getSubscriptionAccessDenialReason } from '../../utils/subscription-access.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ActiveUserRecord, CompanyAccessContext, MembershipAccessRecord } from './company-access-resolver.types';

@Injectable()
export class CompanyAccessResolver {
  private readonly usableSubscriptionStatuses = [
    SubscriptionStatus.INCOMPLETE,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.UNPAID,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolve(payload: JwtPayload): Promise<CompanyAccessContext> {
    const user = await this.getActiveUser(payload.sub);

    if (user.systemRole === SystemRole.SUPER_ADMIN || payload.companyId == null) {
      return {
        user,
        membership: null,
      };
    }

    const membership = await this.getMembershipAccess(user.id, payload.companyId);

    this.assertMembershipIsUsable(membership);

    return {
      user,
      membership,
    };
  }

  private async getActiveUser(userId: number): Promise<ActiveUserRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        systemRole: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active.');
    }

    return {
      id: user.id,
      systemRole: user.systemRole,
    };
  }

  private async getMembershipAccess(userId: number, companyId: number): Promise<MembershipAccessRecord> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      include: {
        company: {
          include: {
            subscriptions: {
              where: {
                status: {
                  in: this.usableSubscriptionStatuses,
                },
              },
              include: {
                plan: {
                  include: {
                    systems: {
                      where: { isEnabled: true, system: { isActive: true } },
                      include: {
                        system: {
                          include: {
                            modules: {
                              where: {
                                isActive: true,
                                module: { isActive: true },
                              },
                              include: {
                                module: {
                                  include: {
                                    permissions: {
                                      where: { isActive: true },
                                      orderBy: { id: 'asc' },
                                    },
                                  },
                                },
                              },
                              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                            },
                            sidebarItems: {
                              where: { isVisible: true },
                              include: {
                                module: {
                                  include: {
                                    permissions: {
                                      where: { isActive: true },
                                      orderBy: { id: 'asc' },
                                    },
                                  },
                                },
                              },
                              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                            },
                          },
                        },
                      },
                      orderBy: [{ system: { sortOrder: 'asc' } }],
                    },
                  },
                },
              },
              orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
            units: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
              },
              orderBy: {
                id: 'asc',
              },
            },
            sidebarPreferences: {
              where: {
                userId,
              },
            },
          },
        },
        companyRole: {
          include: {
            permissions: {
              where: {
                permission: {
                  isActive: true,
                  module: { isActive: true },
                },
              },
              include: {
                permission: {
                  include: { module: true },
                },
              },
            },
          },
        },
        unitAccess: {
          include: {
            companyRole: {
              include: {
                permissions: {
                  where: {
                    permission: {
                      isActive: true,
                      module: { isActive: true },
                    },
                  },
                  include: {
                    permission: {
                      include: { module: true },
                    },
                  },
                },
              },
            },
          },
        },
        permissionOverrides: {
          where: {
            permission: {
              isActive: true,
              module: { isActive: true },
            },
          },
          include: {
            permission: {
              include: { module: true },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException('You do not belong to this company.');
    }

    return membership;
  }

  private assertMembershipIsUsable(membership: MembershipAccessRecord): void {
    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new UnauthorizedException('Your company membership is not active.');
    }

    if (!membership.company.isActive) {
      throw new UnauthorizedException('This company is inactive.');
    }

    if (membership.company.status === CompanyStatus.SUSPENDED || membership.company.status === CompanyStatus.FAILED) {
      throw new UnauthorizedException('This company is unavailable.');
    }

    const latestSubscription = membership.company.subscriptions[0];

    if (!latestSubscription) {
      return;
    }

    const denialReason = getSubscriptionAccessDenialReason(latestSubscription, new Date(), {
      allowProviderActivationFallback: this.isProviderFallbackAllowed(),
    });

    if (denialReason) {
      throw new UnauthorizedException(denialReason);
    }
  }

  private isProviderFallbackAllowed() {
    return this.configService.get<string>('PAYMONGO_ALLOW_PROVIDER_FALLBACK', 'false').toLowerCase() === 'true';
  }
}
