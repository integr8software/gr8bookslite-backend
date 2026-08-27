import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTypeClassification, PaymentTypeStatus } from '@prisma/client';

export class PaymentTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: PaymentTypeClassification })
  classification!: PaymentTypeClassification;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: PaymentTypeStatus })
  status!: PaymentTypeStatus;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaymentTypeOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: PaymentTypeClassification })
  classification!: PaymentTypeClassification;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: PaymentTypeStatus })
  status!: PaymentTypeStatus;
}

export class PaymentTypeStatisticsResponseDto {
  @ApiProperty()
  totalPaymentTypes!: number;

  @ApiProperty()
  activePaymentTypes!: number;

  @ApiProperty()
  inactivePaymentTypes!: number;

  @ApiProperty()
  bankTransferPaymentTypes!: number;

  @ApiProperty()
  checkPaymentTypes!: number;

  @ApiProperty()
  digitalWalletPaymentTypes!: number;

  @ApiProperty()
  debitMemoPaymentTypes!: number;
}

export class PaymentTypePermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiPropertyOptional()
  canImport?: boolean;
}

export class PaymentTypePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaymentTypeListResponseDto {
  @ApiProperty({ type: [PaymentTypeResponseDto] })
  paymentTypes!: PaymentTypeResponseDto[];

  @ApiProperty({ type: PaymentTypeStatisticsResponseDto })
  statistics!: PaymentTypeStatisticsResponseDto;

  @ApiProperty({ type: PaymentTypePaginationResponseDto })
  pagination!: PaymentTypePaginationResponseDto;

  @ApiProperty({ type: PaymentTypePermissionsResponseDto })
  permissions!: PaymentTypePermissionsResponseDto;
}

export class PaymentTypeOptionsResponseDto {
  @ApiProperty({ type: [PaymentTypeOptionResponseDto] })
  paymentTypes!: PaymentTypeOptionResponseDto[];
}

export class PaymentTypeContainerResponseDto {
  @ApiProperty({ type: PaymentTypeResponseDto })
  paymentType!: PaymentTypeResponseDto;

  @ApiProperty({ type: PaymentTypePermissionsResponseDto })
  permissions!: PaymentTypePermissionsResponseDto;
}

export class SavePaymentTypeResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PaymentTypeResponseDto })
  paymentType!: PaymentTypeResponseDto;
}

export class ImportPaymentTypesResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [PaymentTypeResponseDto] })
  paymentTypes!: PaymentTypeResponseDto[];
}
