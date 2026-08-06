import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { EntitlementService } from '../../../../common/access/entitlements/entitlement.service';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class FormSignatoriesLookupService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly entitlementService: EntitlementService,
  ) {}

  async findOptionsForCompanyUser(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return this.findOptionsForCompany(companyId);
  }

  async findOptionsForCompany(companyId: number) {
    return this.cacheManager.wrap(
      `form-signatories:options:${companyId}`,
      async () => {
        const [units, modules] = await Promise.all([
          this.prisma.companyUnit.findMany({
            where: {
              companyId,
              isActive: true,
            },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
          }),
          this.entitlementService.getCompanyAllowedModules(companyId),
        ]);
        const sortedModules = [...modules].sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code));

        return {
          branches: units.map((unit) => ({
            id: unit.id,
            companyId: unit.companyId,
            code: unit.code,
            name: unit.name,
            displayName: unit.name,
            type: unit.type,
          })),
          modules: sortedModules.map((module) => ({
            id: module.id,
            code: module.code,
            name: module.name,
          })),
        };
      },
      60 * 1000,
    );
  }
}
