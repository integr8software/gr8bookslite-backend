import {
  AccessScopeLevel,
  MembershipRole,
  MembershipStatus,
  SystemRole,
} from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';

export interface AuthUserModuleItem {
  id: number;
  key: string;
  label: string;
  description: string | null;
  itemType: 'SECTION' | 'CONTAINER' | 'LINK';
  iconName: string | null;
  sortOrder: number;
  moduleId: number | null;
  moduleCode: string | null;
  permissionCode: string | null;
  requiredActions: string[];
  category: unknown;
  children: AuthUserModuleItem[];
}

export interface AuthUser {
  id: number;
  companyId: number | null;
  role: AppRole;
  systemRole: SystemRole;
  membershipRole: MembershipRole | null;
  membershipStatus: MembershipStatus | null;
  companyRoleId: number | null;
  companyRoleCode: string | null;
  companyRoleName: string | null;
  accessScope: AccessScopeLevel | null;
  enabledModules: string[];
  permissions: string[];
  userModules: {
    items: AuthUserModuleItem[];
    byBranch: Array<{
      branchUnitId: number;
      companyRoleId: number | null;
      companyRoleCode: string | null;
      companyRoleName: string | null;
      items: AuthUserModuleItem[];
    }>;
  };
}
