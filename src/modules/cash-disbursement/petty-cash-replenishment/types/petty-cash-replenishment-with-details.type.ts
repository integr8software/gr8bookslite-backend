import type { PettyCashReplenishmentRecordWithRelations } from '../prisma/petty-cash-replenishment.include';

export type PettyCashReplenishmentWithDetails = PettyCashReplenishmentRecordWithRelations;
export type PettyCashReplenishmentDetailWithRelations = PettyCashReplenishmentRecordWithRelations['details'][number];
