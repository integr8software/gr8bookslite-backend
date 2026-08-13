import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle, CompanyStatus, CompanyUnitType, TaxpayerType } from '@prisma/client';
import { WorkspaceUserResponseDto } from '../../users/dto/workspace-user-response.dto';

export class WorkspaceCompanyCreatedByResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

export class WorkspaceCompanySubscriptionPlanResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty()
  monthlyPriceInCents!: number;

  @ApiProperty()
  yearlyPriceInCents!: number;
}

export class WorkspaceCompanyUnitResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ nullable: true })
  parentUnitId!: number | null;

  @ApiProperty({ enum: CompanyUnitType })
  type!: CompanyUnitType;

  @ApiProperty({ nullable: true })
  code!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  tin!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  inheritsCompanyProfile!: boolean;

  @ApiProperty()
  canTransactSales!: boolean;

  @ApiProperty()
  canHoldInventory!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkspaceCompanyResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  legalName!: string | null;

  @ApiProperty({ nullable: true })
  companyCode!: string | null;

  @ApiProperty({ example: 'PH' })
  countryCode!: string;

  @ApiProperty({ example: 'PHP' })
  baseCurrencyCode!: string;

  @ApiProperty({ enum: TaxpayerType, nullable: true })
  taxpayerType!: TaxpayerType | null;

  @ApiProperty({ nullable: true })
  ownerLastName!: string | null;

  @ApiProperty({ nullable: true })
  ownerFirstName!: string | null;

  @ApiProperty({ nullable: true })
  ownerMiddleName!: string | null;

  @ApiProperty({ nullable: true })
  organizationType!: string | null;

  @ApiProperty({ nullable: true })
  organizationTypeOther!: string | null;

  @ApiProperty({ nullable: true })
  logoFileName!: string | null;

  @ApiProperty({ nullable: true })
  logoMimeType!: string | null;

  @ApiProperty({ nullable: true })
  logoStoragePath!: string | null;

  @ApiProperty({ nullable: true })
  logoPublicUrl!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  tin!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  website!: string | null;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty({ nullable: true })
  reportStartDate!: Date | null;

  @ApiProperty({ nullable: true })
  reportEndDate!: Date | null;

  @ApiProperty({ nullable: true })
  createdByUserId!: number | null;

  @ApiProperty({ type: WorkspaceCompanyCreatedByResponseDto, nullable: true })
  createdByUser!: WorkspaceCompanyCreatedByResponseDto | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: CompanyStatus })
  status!: CompanyStatus;

  @ApiProperty({
    type: WorkspaceCompanySubscriptionPlanResponseDto,
    nullable: true,
  })
  subscriptionPlan!: WorkspaceCompanySubscriptionPlanResponseDto | null;

  @ApiPropertyOptional()
  totalUsers?: number;

  @ApiPropertyOptional()
  totalUnits?: number;

  @ApiPropertyOptional({ type: [WorkspaceCompanyUnitResponseDto] })
  units?: WorkspaceCompanyUnitResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkspaceCompanyManagementSummaryResponseDto {
  @ApiProperty({ type: [WorkspaceCompanyResponseDto] })
  companies!: WorkspaceCompanyResponseDto[];

  @ApiProperty({ type: [WorkspaceUserResponseDto] })
  users!: WorkspaceUserResponseDto[];
}

export class WorkspaceCompanyLogoUploadResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: WorkspaceCompanyResponseDto })
  company!: WorkspaceCompanyResponseDto;

  @ApiProperty()
  logo!: Record<string, unknown>;
}
