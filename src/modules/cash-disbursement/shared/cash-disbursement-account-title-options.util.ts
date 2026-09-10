import { ChartAccountStatus, DefaultAccountTemplateType, PartyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetChartAccountListQueryDto } from '../../maintenance/chart-of-accounts/dto/get-chart-account-list-query.dto';

type PrismaReadClient = PrismaService | Prisma.TransactionClient;

type AccountTitleOption = {
  id: string;
  accountCode: string;
  accountTitle: string;
  accountType: string | null;
  accountNature: string | null;
  status: ChartAccountStatus;
};

type ChartAccountOptionSource = {
  id: bigint;
  accountCode: string;
  accountTitle: string;
  accountType: string | null;
  accountNature: string | null;
  status: ChartAccountStatus;
};

export async function findCashDisbursementAccountTitleOptions({
  companyId,
  prisma,
  query,
}: {
  companyId: number;
  prisma: PrismaReadClient;
  query: GetChartAccountListQueryDto;
}) {
  const search = query.search?.trim();
  const activePostingAccountWhere: Prisma.ChartAccountWhereInput = {
    companyId,
    deletedAt: null,
    isPostingAccount: true,
    status: ChartAccountStatus.ACTIVE,
  };

  const [defaultExpenseAccounts, employeeAdvanceAccounts] = await Promise.all([
    prisma.defaultAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: DefaultAccountTemplateType.EXPENSE,
        status: ChartAccountStatus.ACTIVE,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { expenseCoa: { accountCode: { contains: search, mode: 'insensitive' } } },
                { expenseCoa: { accountTitle: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        expenseCoa: {
          select: {
            id: true,
            accountCode: true,
            accountTitle: true,
            accountType: true,
            accountNature: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.party.findMany({
      where: {
        companyId,
        deletedAt: null,
        employeeAdvanceAccountId: { not: null },
        status: PartyStatus.ACTIVE,
        employeeAdvanceAccount: {
          is: {
            ...activePostingAccountWhere,
          },
        },
        ...(search
          ? {
              OR: [
                { partyCodeNo: { contains: search, mode: 'insensitive' } },
                { partyName: { contains: search, mode: 'insensitive' } },
                { tradeName: { contains: search, mode: 'insensitive' } },
                { employeeAdvanceAccount: { accountCode: { contains: search, mode: 'insensitive' } } },
                { employeeAdvanceAccount: { accountTitle: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        employeeAdvanceAccount: {
          select: {
            id: true,
            accountCode: true,
            accountTitle: true,
            accountType: true,
            accountNature: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const optionsById = new Map<string, AccountTitleOption>();
  const addAccount = (account: ChartAccountOptionSource | null) => {
    if (!account) {
      return;
    }

    const id = account.id.toString();
    optionsById.set(id, {
      id,
      accountCode: account.accountCode,
      accountTitle: account.accountTitle,
      accountType: account.accountType,
      accountNature: account.accountNature,
      status: account.status,
    });
  };

  defaultExpenseAccounts.forEach((disbursementType) => {
    const expenseCoa = disbursementType.expenseCoa;
    if (!expenseCoa) {
      return;
    }

    addAccount({
      id: expenseCoa.id,
      accountCode: expenseCoa.accountCode,
      accountTitle: expenseCoa.accountTitle,
      accountType: expenseCoa.accountType,
      accountNature: expenseCoa.accountNature,
      status: ChartAccountStatus.ACTIVE,
    });
  });
  employeeAdvanceAccounts.forEach((party) => addAccount(party.employeeAdvanceAccount));

  return Array.from(optionsById.values()).sort(
    (first, second) => first.accountCode.localeCompare(second.accountCode) || first.accountTitle.localeCompare(second.accountTitle),
  );
}
