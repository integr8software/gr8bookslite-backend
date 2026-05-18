import { SystemRole, UserStatus } from '@prisma/client';

export interface SanitizedUser {
  id: number;
  email: string;
  name: string;
  contactNumber: string | null;
  systemRole: SystemRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
