import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

export class AiAssistantPurchaseRequestItemPrefillDto {
  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiPropertyOptional()
  uom?: string;

  @ApiPropertyOptional()
  cost?: number;
}

export class AiAssistantPurchaseRequestPrefillDto {
  @ApiPropertyOptional()
  purchaseType?: string;

  @ApiPropertyOptional()
  supplierName?: string;

  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional()
  remarks?: string;

  @ApiPropertyOptional({ type: [AiAssistantPurchaseRequestItemPrefillDto] })
  items?: AiAssistantPurchaseRequestItemPrefillDto[];
}

export class AiAssistantTermsMaintenancePrefillDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['Day', 'Month', 'Year'] })
  datemode?: 'Day' | 'Month' | 'Year';

  @ApiPropertyOptional()
  period?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Inactive'] })
  status?: 'Active' | 'Inactive';
}

export class AiAssistantModuleCommandActionDto {
  @ApiProperty({ enum: ['module_command'] })
  type: 'module_command';

  @ApiProperty()
  moduleCode: string;

  @ApiProperty({ enum: ['open'] })
  command: 'open';

  @ApiPropertyOptional()
  label?: string;
}

export class AiAssistantNavigateActionDto {
  @ApiProperty({ enum: ['navigate'] })
  type: 'navigate';

  @ApiProperty()
  route: string;

  @ApiPropertyOptional()
  label?: string;
}

export class AiAssistantOpenFormActionDto {
  @ApiProperty({ enum: ['open_form'] })
  type: 'open_form';

  @ApiProperty({ enum: ['purchase_request'] })
  target: 'purchase_request';

  @ApiProperty()
  route: string;

  @ApiPropertyOptional()
  label?: string;

  @ApiPropertyOptional({ type: AiAssistantPurchaseRequestPrefillDto })
  prefill?: AiAssistantPurchaseRequestPrefillDto;
}

export class AiAssistantTermsMaintenanceActionDto {
  @ApiProperty({ enum: ['terms_maintenance'] })
  type: 'terms_maintenance';

  @ApiProperty({ enum: ['TM'] })
  moduleCode: 'TM';

  @ApiProperty({ enum: ['open', 'search', 'filter_status', 'prepare_add', 'preview_edit'] })
  command: 'open' | 'search' | 'filter_status' | 'prepare_add' | 'preview_edit';

  @ApiPropertyOptional()
  label?: string;

  @ApiPropertyOptional()
  query?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Inactive'] })
  status?: 'Active' | 'Inactive';

  @ApiPropertyOptional({ type: AiAssistantTermsMaintenancePrefillDto })
  prefill?: AiAssistantTermsMaintenancePrefillDto;

  @ApiPropertyOptional()
  targetTermName?: string;
}

export type AiAssistantActionDto =
  | AiAssistantModuleCommandActionDto
  | AiAssistantNavigateActionDto
  | AiAssistantOpenFormActionDto
  | AiAssistantTermsMaintenanceActionDto;

const AiAssistantActionOneOfSchemas = [
  { $ref: getSchemaPath(AiAssistantModuleCommandActionDto) },
  { $ref: getSchemaPath(AiAssistantNavigateActionDto) },
  { $ref: getSchemaPath(AiAssistantOpenFormActionDto) },
  { $ref: getSchemaPath(AiAssistantTermsMaintenanceActionDto) },
];

@ApiExtraModels(AiAssistantModuleCommandActionDto, AiAssistantNavigateActionDto, AiAssistantOpenFormActionDto, AiAssistantTermsMaintenanceActionDto)
export class AiAssistantChatResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ nullable: true, oneOf: AiAssistantActionOneOfSchemas })
  action: AiAssistantActionDto | null;
}

export class AiAssistantQueuedTranscriptionResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty({ enum: ['queued'] })
  status: 'queued';
}

export class AiAssistantProcessingTranscriptionResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty({ enum: ['processing'] })
  status: 'processing';
}

export class AiAssistantCompletedTranscriptionResponseDto {
  @ApiPropertyOptional()
  jobId?: string;

  @ApiProperty({ enum: ['completed'] })
  status: 'completed';

  @ApiProperty()
  transcript: string;
}

export class AiAssistantFailedTranscriptionResponseDto {
  @ApiProperty()
  error: string;

  @ApiProperty()
  jobId: string;

  @ApiProperty({ enum: ['failed'] })
  status: 'failed';
}

export type AiAssistantTranscriptionResponseDto = AiAssistantQueuedTranscriptionResponseDto | AiAssistantCompletedTranscriptionResponseDto;

export type AiAssistantTranscriptionJobResponseDto =
  | AiAssistantQueuedTranscriptionResponseDto
  | AiAssistantProcessingTranscriptionResponseDto
  | AiAssistantCompletedTranscriptionResponseDto
  | AiAssistantFailedTranscriptionResponseDto;

export class AiAssistantTranscriptionUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  audio: string;
}
