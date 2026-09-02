import type { PettyCashFundRecordWithRelations } from '../prisma/petty-cash-fund.include';

export type PettyCashFundWithDetails = PettyCashFundRecordWithRelations;
export type PettyCashFundDetailWithRelations = PettyCashFundRecordWithRelations['details'][number];
