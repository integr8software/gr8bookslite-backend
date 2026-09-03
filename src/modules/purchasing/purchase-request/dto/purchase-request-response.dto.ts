import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseRequestStatus } from '@prisma/client';

export class PurchaseRequestEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  itemId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  serviceMaintenanceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  itemCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  barcode!: string | null;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  uom!: string | null;

  @ApiProperty()
  qty!: number;

  @ApiPropertyOptional({ nullable: true })
  lotNo!: string | null;

  @ApiProperty()
  cost!: number;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenter!: string | null;
}

export class PurchaseRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty()
  branchName!: string;

  @ApiProperty()
  transNo!: string;

  @ApiProperty()
  prDate!: string;

  @ApiProperty()
  partyId!: string;

  @ApiProperty()
  partyCode!: string;

  @ApiProperty()
  partyName!: string;

  @ApiProperty()
  purchaseType!: string;

  @ApiPropertyOptional({ nullable: true })
  vendorAddress!: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectResponsibilityCenterId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectName!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  exchangeRate!: number;

  @ApiPropertyOptional({ nullable: true })
  forDepartment!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bomNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  remarks!: string | null;

  @ApiProperty({ enum: PurchaseRequestStatus })
  status!: PurchaseRequestStatus;

  @ApiProperty({ type: [PurchaseRequestEntryResponseDto] })
  items!: PurchaseRequestEntryResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  updatedAt!: string | null;
}

export class PurchaseRequestContainerResponseDto {
  @ApiProperty({ type: PurchaseRequestResponseDto })
  purchaseRequest!: PurchaseRequestResponseDto;
}

export class PurchaseRequestPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PurchaseRequestListResponseDto {
  @ApiProperty({ type: [PurchaseRequestResponseDto] })
  purchaseRequests!: PurchaseRequestResponseDto[];

  @ApiProperty({ type: PurchaseRequestPaginationResponseDto })
  pagination!: PurchaseRequestPaginationResponseDto;
}

export class PurchaseRequestTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['ACTIVE'] })
  status!: 'ACTIVE';
}

export class PurchaseRequestTypesResponseDto {
  @ApiProperty({ type: [PurchaseRequestTypeResponseDto] })
  purchaseTypes!: PurchaseRequestTypeResponseDto[];
}
