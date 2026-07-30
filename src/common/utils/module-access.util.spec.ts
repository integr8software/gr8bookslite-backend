import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import type { AuthUser } from '../interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, ensureActiveCompanyAdminAccess, getActiveCompanyId, hasReservedRoleAccess } from './module-access.util';

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

  it('recognizes active company admins as reserved access', () => {
    expect(
      hasReservedRoleAccess(
        {
          ...user,
          membershipStatus: MembershipStatus.ACTIVE,
          membershipRole: MembershipRole.ADMIN,
        },
        2,
      ),
    ).toBe(true);
  });

  it('allows active company admin membership', async () => {
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.ACTIVE, role: MembershipRole.ADMIN });

    await expect(ensureActiveCompanyAdminAccess(prisma as never, user, 2, 'Admin access is required.')).resolves.toBeUndefined();
  });

  it('rejects non-admin company membership', async () => {
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.ACTIVE, role: MembershipRole.USER });

    await expect(ensureActiveCompanyAdminAccess(prisma as never, user, 2, 'Admin access is required.')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
