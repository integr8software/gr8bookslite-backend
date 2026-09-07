import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';

export class PurchaseOrderEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) purchaseRequestEntryId!: string | null;
  @ApiPropertyOptional({ nullable: true }) responsibilityCenterId!: string | null;
  @ApiPropertyOptional({ nullable: true }) serviceMaintenanceId!: string | null;
  @ApiPropertyOptional({ nullable: true }) itemId!: string | null;
  @ApiPropertyOptional({ nullable: true }) itemCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) barcode!: string | null;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({ nullable: true }) color!: string | null;
  @ApiPropertyOptional({ nullable: true }) brand!: string | null;
  @ApiPropertyOptional({ nullable: true }) size!: string | null;
  @ApiPropertyOptional({ nullable: true }) model!: string | null;
  @ApiPropertyOptional({ nullable: true }) uom!: string | null;
  @ApiPropertyOptional({ nullable: true }) lotNo!: string | null;
  @ApiProperty() prQty!: number;
  @ApiProperty() poQty!: number;
  @ApiProperty() price!: number;
  @ApiProperty() grossAmount!: number;
  @ApiProperty() discountRate!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() grossAfterDiscount!: number;
  @ApiProperty() vatAmount!: number;
  @ApiProperty() vatable!: boolean;
  @ApiProperty() vatInclusive!: boolean;
  @ApiProperty() netOfVatAmount!: number;
  @ApiProperty() netAmount!: number;
  @ApiPropertyOptional({ nullable: true }) prNo!: string | null;
  @ApiPropertyOptional({ nullable: true }) canvassNo!: string | null;
  @ApiPropertyOptional({ nullable: true }) responsibilityCenter!: string | null;
}

export class PurchaseOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() branchUnitId!: number;
  @ApiProperty() branchName!: string;
  @ApiProperty() partyId!: string;
  @ApiProperty() partyCode!: string;
  @ApiProperty() partyName!: string;
  @ApiProperty() purchaseType!: string;
  @ApiProperty() transNo!: string;
  @ApiProperty() poDate!: string;
  @ApiPropertyOptional({ nullable: true }) dateNeeded!: string | null;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) emailAddress!: string | null;
  @ApiPropertyOptional({ nullable: true }) contactNo!: string | null;
  @ApiPropertyOptional({ nullable: true }) projectResponsibilityCenterId!: string | null;
  @ApiPropertyOptional({ nullable: true }) projectCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) projectName!: string | null;
  @ApiPropertyOptional({ nullable: true }) termId!: string | null;
  @ApiPropertyOptional({ nullable: true }) termsOfPayment!: string | null;
  @ApiPropertyOptional({ nullable: true }) purchaseRequestId!: string | null;
  @ApiPropertyOptional({ nullable: true }) prNo!: string | null;
  @ApiProperty() currency!: string;
  @ApiProperty() exchangeRate!: number;
  @ApiPropertyOptional({ nullable: true }) remarks!: string | null;
  @ApiProperty({ enum: PurchaseOrderStatus }) status!: PurchaseOrderStatus;
  @ApiProperty({ type: [PurchaseOrderEntryResponseDto] }) items!: PurchaseOrderEntryResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional({ nullable: true }) updatedAt!: string | null;
}
export class PurchaseOrderContainerResponseDto { @ApiProperty({ type: PurchaseOrderResponseDto }) purchaseOrder!: PurchaseOrderResponseDto; }
export class PurchaseOrderPaginationResponseDto { @ApiProperty() page!: number; @ApiProperty() limit!: number; @ApiProperty() total!: number; @ApiProperty() totalPages!: number; }
export class PurchaseOrderListResponseDto { @ApiProperty({ type: [PurchaseOrderResponseDto] }) purchaseOrders!: PurchaseOrderResponseDto[]; @ApiProperty({ type: PurchaseOrderPaginationResponseDto }) pagination!: PurchaseOrderPaginationResponseDto; }
