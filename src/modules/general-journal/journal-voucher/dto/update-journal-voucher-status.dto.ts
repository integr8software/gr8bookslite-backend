import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JournalVoucherStatusInputValues } from './get-journal-voucher-list-query.dto';

export class UpdateJournalVoucherStatusDto {
  @IsIn(JournalVoucherStatusInputValues)
  status!: (typeof JournalVoucherStatusInputValues)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
