import { Prisma } from '@prisma/client';
import { WorkspaceCompanyDetailsInclude, WorkspaceCompanyListInclude } from '../prisma/workspace-company.include';

export type WorkspaceCompanyListRecord = Prisma.CompanyGetPayload<{
  include: typeof WorkspaceCompanyListInclude;
}>;

export type WorkspaceCompanyDetailsRecord = Prisma.CompanyGetPayload<{
  include: typeof WorkspaceCompanyDetailsInclude;
}>;

export type WorkspaceCompanyRecord = WorkspaceCompanyListRecord | WorkspaceCompanyDetailsRecord;
