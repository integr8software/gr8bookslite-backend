import { SystemRole, UserStatus } from '@prisma/client';
import { SanitizedUser } from '../interfaces/sanitized-user.interface';

type UserLike = {
  id: number;
  email: string;
  name: string;
  dateOfBirth: Date | null;
  systemRole: SystemRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function sanitizeUser(user: UserLike): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    dateOfBirth: user.dateOfBirth,
    systemRole: user.systemRole,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
