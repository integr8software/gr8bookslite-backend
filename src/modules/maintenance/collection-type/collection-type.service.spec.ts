/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { CollectionTypeService } from './collection-type.service';

describe('CollectionTypeService options', () => {
  it('returns collection options with backend-owned revenue account details', async () => {
    const prisma = {
      defaultAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9n,
            type: DefaultAccountTemplateType.COLLECTION,
            name: 'Tuition',
            description: 'School fees',
            status: ChartAccountStatus.ACTIVE,
            revenueCoa: {
              id: 101n,
              accountCode: '4100-001',
              accountTitle: 'Tuition Revenue',
              accountType: ChartAccountType.REVENUE,
              accountNature: AccountNature.CREDIT,
            },
          },
        ]),
      },
    };
    const service = new CollectionTypeService(prisma as never);

    const result = await service.findCollectionOptions({ companyId: 11, role: AppRole.SUPER_ADMIN } as never, { search: ' tuition ' });

    expect(prisma.defaultAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          type: DefaultAccountTemplateType.COLLECTION,
          status: ChartAccountStatus.ACTIVE,
          OR: expect.arrayContaining([{ name: { contains: 'tuition', mode: 'insensitive' } }]),
        }),
      }),
    );
    expect(result.options).toEqual([
      {
        id: '9',
        type: DefaultAccountTemplateType.COLLECTION,
        defaultAccountName: 'Tuition',
        description: 'School fees',
        status: ChartAccountStatus.ACTIVE,
        chartAccountId: '101',
        accountCode: '4100-001',
        accountTitle: 'Tuition Revenue',
        accountType: ChartAccountType.REVENUE,
        accountNature: AccountNature.CREDIT,
      },
    ]);
  });
});
