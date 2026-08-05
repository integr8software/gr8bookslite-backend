import { ApiProperty } from '@nestjs/swagger';
import { ResponsibilityCenterCategory, ResponsibilityCenterFinancialType, ResponsibilityCenterStatus } from '@prisma/client';

export class ResponsibilityCenterResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  classificationId!: string;

  @ApiProperty()
  classificationCode!: string;

  @ApiProperty()
  classificationName!: string;

  @ApiProperty()
  typeId!: string;

  @ApiProperty()
  typeName!: string;

  @ApiProperty()
  typeCodePrefix!: string;

  @ApiProperty({ enum: ResponsibilityCenterCategory })
  category!: ResponsibilityCenterCategory;

  @ApiProperty({ enum: ResponsibilityCenterFinancialType })
  financialType!: ResponsibilityCenterFinancialType;

  @ApiProperty({ nullable: true })
  manager!: string | null;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty({ nullable: true })
  parentName!: string | null;

  @ApiProperty({ enum: ResponsibilityCenterStatus })
  status!: ResponsibilityCenterStatus;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class ResponsibilityCenterTreeNodeResponseDto extends ResponsibilityCenterResponseDto {
  @ApiProperty({ type: () => [ResponsibilityCenterTreeNodeResponseDto] })
  children!: ResponsibilityCenterTreeNodeResponseDto[];
}

export class ResponsibilityCenterStatisticsResponseDto {
  @ApiProperty()
  totalCenters!: number;

  @ApiProperty()
  activeCenters!: number;

  @ApiProperty()
  inactiveCenters!: number;

  @ApiProperty()
  departmentCenters!: number;

  @ApiProperty()
  branchCenters!: number;

  @ApiProperty()
  projectCenters!: number;
}

export class ResponsibilityCenterPermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canExport!: boolean;
}

export class ResponsibilityCenterPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ResponsibilityCenterListResponseDto {
  @ApiProperty({ type: [ResponsibilityCenterResponseDto] })
  centers!: ResponsibilityCenterResponseDto[];

  @ApiProperty({ type: ResponsibilityCenterStatisticsResponseDto })
  statistics!: ResponsibilityCenterStatisticsResponseDto;

  @ApiProperty({ type: ResponsibilityCenterPaginationResponseDto })
  pagination!: ResponsibilityCenterPaginationResponseDto;

  @ApiProperty({ type: ResponsibilityCenterPermissionsResponseDto })
  permissions!: ResponsibilityCenterPermissionsResponseDto;
}

export class ResponsibilityCenterTreeResponseDto {
  @ApiProperty({ type: [ResponsibilityCenterTreeNodeResponseDto] })
  centers!: ResponsibilityCenterTreeNodeResponseDto[];

  @ApiProperty({ type: ResponsibilityCenterStatisticsResponseDto })
  statistics!: ResponsibilityCenterStatisticsResponseDto;

  @ApiProperty({ type: ResponsibilityCenterPermissionsResponseDto })
  permissions!: ResponsibilityCenterPermissionsResponseDto;
}

export class ResponsibilityCenterContainerResponseDto {
  @ApiProperty({ type: ResponsibilityCenterResponseDto })
  center!: ResponsibilityCenterResponseDto;

  @ApiProperty({ type: ResponsibilityCenterPermissionsResponseDto })
  permissions!: ResponsibilityCenterPermissionsResponseDto;
}

export class SaveResponsibilityCenterResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ResponsibilityCenterResponseDto })
  center!: ResponsibilityCenterResponseDto;
}

export class ResponsibilityCenterOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  typeName!: string;

  @ApiProperty({ enum: ResponsibilityCenterStatus })
  status!: ResponsibilityCenterStatus;
}

export class ResponsibilityCenterOptionsResponseDto {
  @ApiProperty({ type: [ResponsibilityCenterOptionResponseDto] })
  responsibilityCenters!: ResponsibilityCenterOptionResponseDto[];
}

export class ResponsibilityCenterClassificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  trackingBehavior!: string;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ enum: ResponsibilityCenterStatus })
  status!: ResponsibilityCenterStatus;
}

export class ResponsibilityCenterClassificationsResponseDto {
  @ApiProperty({ type: [ResponsibilityCenterClassificationResponseDto] })
  classifications!: ResponsibilityCenterClassificationResponseDto[];
}

export class ResponsibilityCenterTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  classificationId!: string;

  @ApiProperty()
  classificationCode!: string;

  @ApiProperty()
  classificationName!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  codePrefix!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty({ enum: ResponsibilityCenterStatus })
  status!: ResponsibilityCenterStatus;
}

export class ResponsibilityCenterTypesResponseDto {
  @ApiProperty({ type: [ResponsibilityCenterTypeResponseDto] })
  types!: ResponsibilityCenterTypeResponseDto[];
}

export class ResponsibilityCenterCodeSuggestionResponseDto {
  @ApiProperty()
  code!: string;
}
