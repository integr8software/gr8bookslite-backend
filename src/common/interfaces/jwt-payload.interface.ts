import { MembershipRole, SystemRole } from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';

export interface JwtPayload {
  sub: number;
  companyId: number | null;
  role: AppRole;
  systemRole: SystemRole;
  membershipRole: MembershipRole | null;
  companyRoleId: number | null;
}
