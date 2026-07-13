import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../../prisma/prisma.service';
import { BankAccountInclude } from '../prisma/bank-account.include';

export type BankAccountPayload = Prisma.BankAccountGetPayload<{
  include: typeof BankAccountInclude;
}>;

export type BankAccountIdentity = {
  bankName: string;
  branch?: string | null;
  accountNumber?: string | null;
};

export type BankMasterfilePrismaClient =
  | Prisma.TransactionClient
  | PrismaService;
