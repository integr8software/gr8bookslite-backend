import { AccessScopeLevel, MembershipRole } from '@prisma/client';
import type { AuthUserModuleItem } from '../../interfaces/auth-user.interface';

export type SidebarModulePermission = {
  code: string;
};

export type SidebarEnabledModule = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: unknown;
  permissions: SidebarModulePermission[];
};

export type SidebarEntitledModule = {
  moduleId: number;
  module: SidebarEnabledModule;
};

export type SidebarPreferenceRow = {
  branchUnitId: number;
  itemKey: string;
  parentItemKey: string | null;
  hasParentOverride: boolean;
  isHidden: boolean;
  sortOrder: number | null;
  isPinned: boolean;
  isCollapsed: boolean;
};

export type SidebarSystemTemplateRow = {
  id: number;
  parentId: number | null;
  moduleId: number | null;
  itemType: 'SECTION' | 'CONTAINER' | 'LINK';
  key: string;
  label: string;
  description: string | null;
  iconName: string | null;
  sortOrder: number;
  systemCode: string;
};

export type SidebarMembershipSource = {
  role: MembershipRole;
  accessScope: AccessScopeLevel;
  companyRole?: {
    id: number;
    code: string;
    name: string;
  } | null;
  permissionOverrides?: Array<unknown>;
  company: {
    units: Array<{ id: number }>;
    sidebarPreferences: SidebarPreferenceRow[];
    subscriptions: Array<{
      plan: {
        systems: Array<{
          system: {
            code: string;
            modules?: SidebarEntitledModule[];
            sidebarItems: Array<Omit<SidebarSystemTemplateRow, 'systemCode'>>;
          };
        }>;
      };
    }>;
  };
  unitAccess: Array<{
    unitId: number;
    companyRole?: {
      id: number;
      code: string;
      name: string;
    } | null;
  }>;
};

export type SidebarUserModules = {
  items: AuthUserModuleItem[];
  byBranch: Array<{
    branchUnitId: number;
    companyRoleId: number | null;
    companyRoleCode: string | null;
    companyRoleName: string | null;
    items: AuthUserModuleItem[];
  }>;
};
