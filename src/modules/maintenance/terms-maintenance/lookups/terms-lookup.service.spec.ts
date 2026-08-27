import { NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, TermDateMode, TermStatus } from '@prisma/client';
import { AppRole } from '../../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { TermsLookupService } from './terms-lookup.service';

describe('TermsLookupService', () => {
  const prisma = {
    membership: {
      findUnique: jest.fn(),
    },
    term: {
      findMany: jest.fn(),
    },
  };
  const service = new TermsLookupService(prisma as never);

  const user: AuthUser = {
    id: 7,
    companyId: 11,
    role: AppRole.USER,
    systemRole: null as never,
    membershipRole: MembershipRole.USER,
    membershipStatus: MembershipStatus.ACTIVE,
    companyRoleId: null,
    companyRoleCode: null,
    companyRoleName: null,
    accessScope: null,
    enabledModules: [],
    permissions: [],
    userModules: {
      items: [],
      byBranch: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.ACTIVE });
    prisma.term.findMany.mockResolvedValue([
      {
        id: BigInt(3),
        name: 'Net 30',
        dateMode: TermDateMode.DAY,
        period: 30,
        status: TermStatus.ACTIVE,
        description: 'hidden from lookup',
        createdAt: new Date(),
      },
    ]);
  });

  it('allows active company members without Terms Maintenance VIEW permission', async () => {
    const result = await service.findOptionsForCompanyUser(user, {
      search: ' net ',
      dateMode: TermDateMode.DAY,
    });

    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: user.companyId,
        },
      },
      select: {
        status: true,
      },
    });
    expect(prisma.term.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any.
        where: expect.objectContaining({
          companyId: user.companyId,
          deletedAt: null,
          status: TermStatus.ACTIVE,
          dateMode: TermDateMode.DAY,
          name: {
            contains: 'net',
            mode: 'insensitive',
          },
        }),
        select: {
          id: true,
          name: true,
          dateMode: true,
          period: true,
          status: true,
        },
      }),
    );
    expect(result).toEqual({
      terms: [
        {
          id: '3',
          name: 'Net 30',
          dateMode: TermDateMode.DAY,
          period: 30,
          status: TermStatus.ACTIVE,
        },
      ],
    });
    expect(result.terms[0]).not.toHaveProperty('description');
    expect(result.terms[0]).not.toHaveProperty('createdAt');
  });

  it('rejects inactive company membership', async () => {
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.SUSPENDED });

    await expect(service.findOptionsForCompanyUser(user, {})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.term.findMany).not.toHaveBeenCalled();
  });
});
