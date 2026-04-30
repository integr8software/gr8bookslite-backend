import { AppRole } from '../enums/app-role.enum';

export interface AuthUser {
  id: number;
  companyId: number | null;
  role: AppRole;
}
