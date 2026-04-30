import { AppRole } from '../enums/app-role.enum';

export interface AuthUser {
  userId: number;
  companyId: number | null;
  role: AppRole;
}
