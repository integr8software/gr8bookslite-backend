import { TermDateMode, TermStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { TermsMaintenanceService } from './terms-maintenance.service';

describe('TermsMaintenanceService term options', () => {
  function createService() {
    const prisma = {
      term: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new TermsMaintenanceService(prisma as never) };
  }

  it('returns active day-based payment terms scoped to the company', async () => {
    const { prisma, service } = createService();
    prisma.term.findMany.mockResolvedValue([
      { id: 3n, name: 'Net 30', dateMode: TermDateMode.DAY, period: 30, status: TermStatus.ACTIVE },
    ]);

    const result = await service.findOptions(
      { companyId: 11, role: AppRole.SUPER_ADMIN } as never,
      { search: ' net ', dateMode: TermDateMode.DAY },
    );

    expect(prisma.term.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: TermStatus.ACTIVE,
          dateMode: TermDateMode.DAY,
          name: { contains: 'net', mode: 'insensitive' },
        },
      }),
    );
    expect(result).toEqual({
      terms: [{ id: '3', name: 'Net 30', dateMode: TermDateMode.DAY, period: 30, status: TermStatus.ACTIVE }],
    });
  });
});
