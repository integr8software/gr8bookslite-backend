import { ForbiddenException, Injectable } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { AppRole } from '../../common/enums/app-role.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceOverview(user: AuthUser) {
    this.ensureWorkspaceDashboardAccess(user);

    const [membershipCompanies, totalCompanies, activeCompanies] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          company: {
            include: {
              units: {
                where: {
                  isActive: true,
                },
                orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.company.count(),
      this.prisma.company.count({
        where: {
          status: CompanyStatus.ACTIVE,
          isActive: true,
        },
      }),
    ]);

    const companies = membershipCompanies.map((membership) => {
      const primaryUnit = membership.company.units.find((unit) => unit.type === 'HEAD_OFFICE') ?? membership.company.units[0] ?? null;

      return {
        companyId: membership.company.id,
        companyName: membership.company.name,
        unitName: primaryUnit?.name ?? null,
        unitType: primaryUnit?.type ?? null,
        status: membership.company.isActive && membership.company.status === CompanyStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE',
      };
    });

    return {
      user: {
        id: user.id,
        role: user.role,
      },
      summary: {
        totalCompanies,
        activeCompanies,
        inactiveCompanies: Math.max(totalCompanies - activeCompanies, 0),
        pendingApprovals: 0,
      },
      approvalQueue: [],
      companies,
    };
  }

  private ensureWorkspaceDashboardAccess(user: AuthUser) {
    if (user.role === AppRole.SUPER_ADMIN || user.membershipRole === 'ADMIN') {
      return;
    }

    throw new ForbiddenException('You do not have access to the workspace dashboard.');
  }
}
