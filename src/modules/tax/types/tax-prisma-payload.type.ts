import { Prisma } from '@prisma/client';

export type TaxWithPostingRules = Prisma.TaxGetPayload<{
  include: {
    postingRules: true;
  };
}>;

export type TaxCompanyAccountMapping = Prisma.CompanyAccountMappingGetPayload<{
  include: {
    chartAccount: true;
  };
}>;
