import { Injectable } from '@nestjs/common';
import { AccessScopeLevel, MembershipStatus, UserStatus } from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../../common/utils/module-permissions.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetWarehouseAccessDirectoryQueryDto } from '../dto/get-warehouse-access-directory-query.dto';

const WarehouseAccessModuleCode = 'WA';

@Injectable()
export class WarehouseAccessLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findDirectoryUsersForCompanyUser(user: AuthUser, query: GetWarehouseAccessDirectoryQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, WarehouseAccessModuleCode, PermissionAction.VIEW, 'You do not have permission to manage warehouse access.');

    return this.findDirectoryUsers({ companyId, query });
  }

  async findDirectoryUsers({ companyId, query }: { companyId: number; query: GetWarehouseAccessDirectoryQueryDto }) {
    const search = query.search?.trim();
    const [memberships, branches] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          companyId,
          status: MembershipStatus.ACTIVE,
          user: {
            status: UserStatus.ACTIVE,
            ...(search
              ? {
                  OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }],
                }
              : {}),
          },
          ...(query.branchUnitId
            ? {
                OR: [
                  { accessScope: AccessScopeLevel.COMPANY },
                  {
                    unitAccess: {
                      some: {
                        unitId: query.branchUnitId,
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          companyRole: {
            select: {
              id: true,
              name: true,
            },
          },
          unitAccess: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              unit: {
                name: 'asc',
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              contactNumber: true,
              status: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      }),
      this.prisma.companyUnit.findMany({
        where: {
          companyId,
          isActive: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const branchById = new Map(branches.map((branch) => [branch.id, branch.name]));

    return {
      users: memberships.map((membership) => {
        const branchUnitIds =
          membership.accessScope === AccessScopeLevel.COMPANY ? branches.map((branch) => branch.id) : membership.unitAccess.map((access) => access.unitId);

        return {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          contactNumber: membership.user.contactNumber,
          status: membership.user.status,
          branchUnitIds,
          branchNames: branchUnitIds.map((unitId) => branchById.get(unitId)).filter((branchName): branchName is string => Boolean(branchName)),
          companyRoleId: membership.companyRoleId,
          companyRoleName: membership.companyRole?.name ?? null,
        };
      }),
      branches: branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
      })),
    };
  }
}
