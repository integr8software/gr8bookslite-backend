import { IsIn } from 'class-validator';

export class UpdateCollectionReceiptStatusDto {
  @IsIn(['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED', 'Draft', 'For Approval', 'Disapproved', 'Posted', 'Cancelled'])
  status!: string;
}
