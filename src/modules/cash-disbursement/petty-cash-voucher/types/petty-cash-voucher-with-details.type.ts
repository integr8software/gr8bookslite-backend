import type { PettyCashVoucherRecordWithRelations } from '../prisma/petty-cash-voucher.include';

export type PettyCashVoucherWithDetails = PettyCashVoucherRecordWithRelations;
export type PettyCashVoucherDetailWithRelations = PettyCashVoucherRecordWithRelations['details'][number];
