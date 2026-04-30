import { AppRole } from '../enums/app-role.enum';

export interface JwtPayload {
  sub: number;
  companyId: number | null;
  role: AppRole;
}
