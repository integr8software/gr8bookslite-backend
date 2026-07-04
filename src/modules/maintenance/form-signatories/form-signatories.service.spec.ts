import { BadRequestException } from '@nestjs/common';
import { FormSignatoriesService } from './form-signatories.service';

describe('FormSignatoriesService permission catalog ownership', () => {
  function createService() {
    const prisma = {
      module: {
        findUnique: jest.fn(),
      },
    };
    const cacheManager = {
      wrap: jest.fn(),
    };
    const auditLogsService = {
      recordActivity: jest.fn(),
    };

    return {
      prisma,
      service: new FormSignatoriesService(
        prisma as never,
        cacheManager as never,
        auditLogsService as never,
        {} as never,
      ),
    };
  }

  it('resolves an existing active module without trusting its submitted name', async () => {
    const { prisma, service } = createService();
    prisma.module.findUnique.mockResolvedValue({
      id: 40,
      code: 'cash-disbursement',
      name: 'Cash Disbursement',
      isActive: true,
    });

    const module = await (
      service as unknown as {
        resolveModule: (dto: {
          moduleCode: string;
          moduleName: string;
        }) => Promise<Record<string, unknown>>;
      }
    ).resolveModule({
      moduleCode: ' cash-disbursement ',
      moduleName: 'Client-controlled name',
    });

    expect(prisma.module.findUnique).toHaveBeenCalledWith({
      where: {
        code: 'cash-disbursement',
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });
    expect(module).toEqual({
      id: 40,
      code: 'cash-disbursement',
      name: 'Cash Disbursement',
      isActive: true,
    });
  });

  it.each([
    null,
    {
      id: 40,
      code: 'cash-disbursement',
      name: 'Cash Disbursement',
      isActive: false,
    },
  ])('rejects a module outside the active backend catalog', async (module) => {
    const { prisma, service } = createService();
    prisma.module.findUnique.mockResolvedValue(module);

    await expect(
      (
        service as unknown as {
          resolveModule: (dto: {
            moduleCode: string;
            moduleName: string;
          }) => Promise<unknown>;
        }
      ).resolveModule({
        moduleCode: 'cash-disbursement',
        moduleName: 'Cash Disbursement',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
