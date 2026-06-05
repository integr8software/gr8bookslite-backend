import { ApiProperty } from '@nestjs/swagger';

export class FormSignatoryUnitResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ nullable: true })
  code!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  type!: string;
}

export class FormSignatoryModuleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class FormSignatoryRowResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  position!: string | null;

  @ApiProperty({ nullable: true })
  signatureName!: string | null;

  @ApiProperty({ nullable: true })
  signatureImage!: string | null;

  @ApiProperty({ nullable: true })
  signatureValidUntil!: string | null;
}

export class FormSignatorySetupResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ type: FormSignatoryUnitResponseDto })
  unit!: FormSignatoryUnitResponseDto;

  @ApiProperty({ type: FormSignatoryModuleResponseDto })
  module!: FormSignatoryModuleResponseDto;

  @ApiProperty({ type: [FormSignatoryRowResponseDto] })
  rows!: FormSignatoryRowResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class FormSignatorySetupsResponseDto {
  @ApiProperty({ type: [FormSignatorySetupResponseDto] })
  setups!: FormSignatorySetupResponseDto[];
}

export class FormSignatoryBranchOptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ nullable: true })
  code!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  type!: string;
}

export class FormSignatoryModuleOptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class FormSignatoryOptionsResponseDto {
  @ApiProperty({ type: [FormSignatoryBranchOptionResponseDto] })
  branches!: FormSignatoryBranchOptionResponseDto[];

  @ApiProperty({ type: [FormSignatoryModuleOptionResponseDto] })
  modules!: FormSignatoryModuleOptionResponseDto[];
}

export class FormSignatoryBootstrapResponseDto extends FormSignatoryOptionsResponseDto {
  @ApiProperty({ type: [FormSignatorySetupResponseDto] })
  setups!: FormSignatorySetupResponseDto[];
}

export class FormSignatorySetupContainerResponseDto {
  @ApiProperty({ type: FormSignatorySetupResponseDto, nullable: true })
  setup!: FormSignatorySetupResponseDto | null;
}

export class SaveFormSignatoryResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: FormSignatorySetupResponseDto })
  setup!: FormSignatorySetupResponseDto;
}
