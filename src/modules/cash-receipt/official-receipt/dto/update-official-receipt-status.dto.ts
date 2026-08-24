import { IsIn } from 'class-validator';

export class UpdateOfficialReceiptStatusDto {
  @IsIn(['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED', 'Draft', 'For Approval', 'Disapproved', 'Posted', 'Cancelled'])
  status!: string;
}
