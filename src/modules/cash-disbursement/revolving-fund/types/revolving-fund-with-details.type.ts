import type { RevolvingFundRecordWithRelations } from '../prisma/revolving-fund.include';

export type RevolvingFundWithDetails = RevolvingFundRecordWithRelations;
export type RevolvingFundDetailWithRelations = RevolvingFundRecordWithRelations['details'][number];
