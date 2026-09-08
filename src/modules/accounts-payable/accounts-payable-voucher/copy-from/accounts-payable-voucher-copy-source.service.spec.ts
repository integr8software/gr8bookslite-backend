import { PrismaService } from '../../../../prisma/prisma.service';
import { AccountsPayableVoucherCopySourceService } from './accounts-payable-voucher-copy-source.service';

describe('AccountsPayableVoucherCopySourceService', () => {
  const service = new AccountsPayableVoucherCopySourceService({} as PrismaService);
  const getCopiedDetailAmounts = (
    service as unknown as {
      getCopiedDetailAmounts: (details: Array<Record<string, unknown>>) => Array<{
        reference: string;
        grossAmount: number;
        payableAmount: number;
      }>;
    }
  ).getCopiedDetailAmounts.bind(service);

  it('uses the public APV transaction reference for new copied details', () => {
    expect(
      getCopiedDetailAmounts([
        {
          refId: 'APV:APV-000001',
          grossAmount: 5000,
          disburseAmount: 4850,
        },
      ]),
    ).toEqual([{ reference: 'APV:APV-000001', grossAmount: 5000, payableAmount: 4850 }]);
  });

  it('keeps legacy numeric APV references readable', () => {
    expect(getCopiedDetailAmounts([{ refId: '1', grossAmount: 3000, disburseAmount: 2910 }])).toEqual([
      { reference: '1', grossAmount: 3000, payableAmount: 2910 },
    ]);
  });
});
