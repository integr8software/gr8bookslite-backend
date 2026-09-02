import { Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { AccessControlService } from '../../../common/access/access-control.service';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { AiModuleProfiles, findAiModuleProfileByCode } from '../catalog/ai-module-profile.registry';
import type { AiToolAuthorizationResult } from './ai-tool.interface';

@Injectable()
export class AiToolAuthorizerService {
  constructor(private readonly accessControlService: AccessControlService) {}

  authorize(user: AuthUser, moduleCode: string, action: PermissionAction): AiToolAuthorizationResult {
    const profile = findAiModuleProfileByCode(moduleCode);

    if (!profile) {
      return { allowed: false, denialMessage: 'That module is not available to Neo AI.' };
    }

    if (user.role === AppRole.SUPER_ADMIN) {
      return { allowed: true };
    }

    if (!user.companyId) {
      return {
        allowed: false,
        denialMessage: `Please select a company before I can help with ${profile.name}.`,
      };
    }

    if (!user.enabledModules.includes(moduleCode)) {
      return {
        allowed: false,
        denialMessage: `${profile.name} is not enabled for the selected company.`,
      };
    }

    if (this.hasReservedCompanyRoleAccess(user) || this.accessControlService.hasPermission(user, moduleCode, action)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      denialMessage: `You do not have permission to ${this.getActionLabel(action)} ${profile.name}.`,
    };
  }

  getAccessibleModuleCodes(user: AuthUser) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return new Set(AiModuleProfiles.map((profile) => profile.moduleCode));
    }

    if (!user.companyId) {
      return new Set<string>();
    }

    return new Set(
      AiModuleProfiles.filter(
        (profile) =>
          user.enabledModules.includes(profile.moduleCode) &&
          (this.hasReservedCompanyRoleAccess(user) || this.accessControlService.hasPermission(user, profile.moduleCode, PermissionAction.VIEW)),
      ).map((profile) => profile.moduleCode),
    );
  }

  private hasReservedCompanyRoleAccess(user: AuthUser) {
    return user.membershipStatus === MembershipStatus.ACTIVE && (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN);
  }

  private getActionLabel(action: PermissionAction) {
    if (action === PermissionAction.CREATE) {
      return 'add records in';
    }

    if (action === PermissionAction.UPDATE) {
      return 'edit records in';
    }

    return 'view';
  }
}
