import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import type { AuthUser } from '../interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from './module-access.util';

describe('module access utilities', () => {
  const prisma = {
    membership: {
      findUnique: jest.fn(),
    },
  };
  const user = {
    id: 1,
    companyId: 2,
    role: AppRole.USER,
  } as AuthUser;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the selected active company id', () => {
    expect(getActiveCompanyId(user)).toBe(2);
  });

  it('requires an active company selection', () => {
    expect(() => getActiveCompanyId({ ...user, companyId: null })).toThrow(BadRequestException);
  });

  it('allows active company membership', async () => {
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.ACTIVE });

    await expect(ensureActiveCompanyAccess(prisma as never, user, 2)).resolves.toBeUndefined();
  });

  it('rejects inactive company membership', async () => {
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.SUSPENDED });

    await expect(ensureActiveCompanyAccess(prisma as never, user, 2)).rejects.toBeInstanceOf(NotFoundException);
  });
});
