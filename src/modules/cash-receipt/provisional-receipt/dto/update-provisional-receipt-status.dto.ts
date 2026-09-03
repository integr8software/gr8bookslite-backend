import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateProvisionalReceiptStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED', 'Draft', 'For Approval', 'Disapproved', 'Posted', 'Cancelled'] })
  @IsIn(['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED', 'Draft', 'For Approval', 'Disapproved', 'Posted', 'Cancelled'])
  status!: string;
}
