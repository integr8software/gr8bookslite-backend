import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class FormSignatoryRowDto {
  @IsString()
  @MaxLength(80)
  label!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  signatureName?: string;

  @IsOptional()
  @IsString()
  signatureImage?: string;

  @IsOptional()
  @IsISO8601()
  signatureValidUntil?: string;

  @IsOptional()
  @IsBoolean()
  isThisTemporary?: boolean | null;
}
