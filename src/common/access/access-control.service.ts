import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole, SystemRole } from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import { PermissionAction } from '../enums/permission-action.enum';
import { AuthUser } from '../interfaces/auth-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { CompanyAccessResolver } from './company-access/company-access-resolver.service';
import type { ActiveUserRecord, MembershipAccessRecord } from './company-access/company-access-resolver.types';
import { EntitlementService } from './entitlements/entitlement.service';
import { PermissionService } from './permissions/permission.service';
import { SidebarBuilder } from './sidebar/sidebar-builder.service';

/*
 * AccessControlService currently assembles the complete runtime AuthUser
 * context from resolved company access, entitlements, permissions, and sidebar
 * data.
 *
 * TODO authorization roadmap:
 * - Phase 5: keep this service as the thin AuthUser orchestration layer.
 */
@Injectable()
export class AccessControlService {
  constructor(
    private readonly companyAccessResolver: CompanyAccessResolver,
    private readonly entitlementService: EntitlementService,
    private readonly permissionService: PermissionService,
    private readonly sidebarBuilder: SidebarBuilder,
  ) {}

  async resolveAuthUser(payload: JwtPayload): Promise<AuthUser> {
    const { user, membership } = await this.companyAccessResolver.resolve(payload);

    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return this.buildSuperAdminAuthUser(user, payload.companyId ?? null);
    }

    if (!membership) {
      return this.buildUserWithoutCompanyContext(user);
    }

    return this.buildCompanyAuthUser(user, membership);
  }

  hasPermission(user: AuthUser, permissionCode: string, action: PermissionAction): boolean {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.companyId) {
      return false;
    }

    return user.permissions.includes(this.buildPermissionKey(permissionCode, action));
  }

  assertCompanyContext(user: AuthUser): void {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    if (!user.companyId) {
      throw new ForbiddenException('An active company context is required.');
    }
  }

  // AuthUser assembly

  private buildSuperAdminAuthUser(user: ActiveUserRecord, companyId: number | null): AuthUser {
    return {
      id: user.id,
      companyId,
      role: AppRole.SUPER_ADMIN,
      systemRole: user.systemRole,
      membershipRole: null,
      membershipStatus: null,
      companyRoleId: null,
      companyRoleCode: null,
      companyRoleName: null,
      accessScope: null,
      enabledModules: [],
      permissions: [],
      userModules: this.buildEmptyUserModules(),
    };
  }

  private buildUserWithoutCompanyContext(user: ActiveUserRecord): AuthUser {
    return {
      id: user.id,
      companyId: null,
      role: AppRole.USER,
      systemRole: user.systemRole,
      membershipRole: null,
      membershipStatus: null,
      companyRoleId: null,
      companyRoleCode: null,
      companyRoleName: null,
      accessScope: null,
      enabledModules: [],
      permissions: [],
      userModules: this.buildEmptyUserModules(),
    };
  }

  private buildCompanyAuthUser(user: ActiveUserRecord, membership: MembershipAccessRecord): AuthUser {
    const enabledModules = this.entitlementService.getEnabledModuleCodes(membership);
    const permissions = this.permissionService.computePermissions(membership, enabledModules);
    const userModules = this.sidebarBuilder.buildUserModules(membership, permissions);
    const effectiveCompanyRole = this.getEffectiveCompanyRole(membership);

    return {
      id: user.id,
      companyId: membership.companyId,
      role: this.mapMembershipRole(membership.role),
      systemRole: user.systemRole,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      companyRoleId: effectiveCompanyRole?.id ?? null,
      companyRoleCode: effectiveCompanyRole?.code ?? null,
      companyRoleName: effectiveCompanyRole?.name ?? null,
      accessScope: membership.accessScope,
      enabledModules,
      permissions,
      userModules,
    };
  }

  private buildEmptyUserModules() {
    return { items: [], byBranch: [] };
  }

  // Company role resolution

  private getEffectiveCompanyRole(membership: MembershipAccessRecord) {
    return membership.companyRole ?? membership.unitAccess.find((unitAccess) => unitAccess.companyRole)?.companyRole ?? null;
  }

  // Shared utilities

  private buildPermissionKey(permissionCode: string, action: PermissionAction): string {
    return `${permissionCode}:${action}`;
  }

  private mapMembershipRole(role: MembershipRole): AppRole {
    return role === MembershipRole.ADMIN ? AppRole.ADMIN : AppRole.USER;
  }
}
