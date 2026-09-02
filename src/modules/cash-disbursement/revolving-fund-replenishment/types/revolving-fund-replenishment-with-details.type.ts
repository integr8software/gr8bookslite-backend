import type { RevolvingFundReplenishmentRecordWithRelations } from '../prisma/revolving-fund-replenishment.include';

export type RevolvingFundReplenishmentWithDetails = RevolvingFundReplenishmentRecordWithRelations;
export type RevolvingFundReplenishmentDetailWithRelations = RevolvingFundReplenishmentRecordWithRelations['details'][number];
