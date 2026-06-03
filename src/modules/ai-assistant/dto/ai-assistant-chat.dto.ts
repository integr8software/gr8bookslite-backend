import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiAssistantChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;
}

export class AiAssistantChatDto {
  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  currentPath?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiAssistantChatMessageDto)
  history?: AiAssistantChatMessageDto[];
}
