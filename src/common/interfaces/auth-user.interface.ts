import {
  AccessScopeLevel,
  MembershipRole,
  MembershipStatus,
  SystemRole,
} from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';

export interface AuthUser {
  id: number;
  companyId: number | null;
  role: AppRole;
  systemRole: SystemRole;
  membershipRole: MembershipRole | null;
  membershipStatus: MembershipStatus | null;
  companyRoleId: number | null;
  accessScope: AccessScopeLevel | null;
  enabledModules: string[];
  permissions: string[];
}
