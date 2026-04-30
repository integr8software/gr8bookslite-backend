import { AppRole } from '../enums/app-role.enum';

export interface JwtPayload {
  sub: number;
  userId: number;
  companyId: number | null;
  role: AppRole;
}
