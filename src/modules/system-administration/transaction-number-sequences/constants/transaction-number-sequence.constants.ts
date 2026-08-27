import { CompanyUnitType, Prisma } from '@prisma/client';

export const TransactionNumberBranchUnitTypes: CompanyUnitType[] = [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE];

export const RegistryModuleTypeWhere = [{ type: { array_contains: ['registry'] } }, { type: { array_contains: ['Registry'] } }] satisfies Prisma.ModuleWhereInput[];
