import type { Prisma } from '@prisma/client';

export type CompanyBootstrapStatus = 'ok' | 'missing' | 'warning' | 'error';

export type CompanyBootstrapInspection = {
  status: CompanyBootstrapStatus;
  summary: string;
  actions: string[];
  details?: Record<string, unknown>;
};

export type CompanyBootstrapBackup = {
  key: string;
  data: unknown;
};

export type CompanyBootstrapHandler = {
  key: string;
  label: string;
  inspect(
    companyId: number,
    tx: Prisma.TransactionClient,
  ): Promise<CompanyBootstrapInspection>;
  backup?(
    companyId: number,
    tx: Prisma.TransactionClient,
  ): Promise<CompanyBootstrapBackup>;
  apply?(companyId: number, tx: Prisma.TransactionClient): Promise<void>;
};

