import { CompanyStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService company context resolution', () => {
  const service = Object.create(AuthService.prototype) as {
    resolveDefaultCompanyContext: (
      user: { systemRole: string; memberships: unknown[] },
      requestedCompanyId: number | null,
    ) => number | null;
  };

  it('skips inactive companies when choosing the default login company', () => {
    const companyId = service.resolveDefaultCompanyContext(
      {
        systemRole: 'STANDARD',
        memberships: [
          createMembership({
            companyId: 1,
            isCompanyActive: false,
            lastAccessedAt: new Date('2026-06-17T08:00:00.000Z'),
          }),
          createMembership({
            companyId: 2,
            isCompanyActive: true,
            lastAccessedAt: new Date('2026-06-16T08:00:00.000Z'),
          }),
        ],
      },
      null,
    );

    expect(companyId).toBe(2);
  });

  it('rejects an explicitly requested inactive company', () => {
    expect(() =>
      service.resolveDefaultCompanyContext(
        {
          systemRole: 'STANDARD',
          memberships: [
            createMembership({
              companyId: 1,
              isCompanyActive: false,
            }),
            createMembership({
              companyId: 2,
              isCompanyActive: true,
            }),
          ],
        },
        1,
      ),
    ).toThrow(UnauthorizedException);
  });
});

function createMembership({
  companyId,
  isCompanyActive,
  lastAccessedAt = null,
}: {
  companyId: number;
  isCompanyActive: boolean;
  lastAccessedAt?: Date | null;
}) {
  return {
    companyId,
    companyRoleId: null,
    lastAccessedAt,
    role: MembershipRole.ADMIN,
    status: MembershipStatus.ACTIVE,
    company: {
      isActive: isCompanyActive,
      status: isCompanyActive ? CompanyStatus.ACTIVE : CompanyStatus.SUSPENDED,
    },
  };
}
