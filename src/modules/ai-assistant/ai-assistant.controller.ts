import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiAssistantService, MAX_TRANSCRIPTION_AUDIO_SIZE_BYTES } from './ai-assistant.service';
import { AiAssistantChatDto } from './dto/ai-assistant-chat.dto';
import {
  AiAssistantChatResponseDto,
  AiAssistantCompletedTranscriptionResponseDto,
  AiAssistantFailedTranscriptionResponseDto,
  AiAssistantProcessingTranscriptionResponseDto,
  AiAssistantQueuedTranscriptionResponseDto,
  AiAssistantTranscriptionUploadDto,
} from './dto/ai-assistant-response.dto';
import type { UploadedAiAssistantAudioFile } from './types/uploaded-ai-assistant-audio-file.type';

@UseGuards(JwtAuthGuard)
@ApiTags('AI Assistant')
@ApiExtraModels(
  AiAssistantQueuedTranscriptionResponseDto,
  AiAssistantProcessingTranscriptionResponseDto,
  AiAssistantCompletedTranscriptionResponseDto,
  AiAssistantFailedTranscriptionResponseDto,
)
@Controller({
  path: 'ai-assistant',
  version: '1',
})
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AiAssistantChatResponseDto })
  chat(@CurrentUser() user: AuthUser, @Body() dto: AiAssistantChatDto) {
    return this.aiAssistantService.chat(user, dto);
  }

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AiAssistantTranscriptionUploadDto })
  @ApiOkResponse({
    schema: {
      oneOf: [{ $ref: getSchemaPath(AiAssistantQueuedTranscriptionResponseDto) }, { $ref: getSchemaPath(AiAssistantCompletedTranscriptionResponseDto) }],
    },
  })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: {
        fileSize: MAX_TRANSCRIPTION_AUDIO_SIZE_BYTES,
      },
    }),
  )
  transcribe(@CurrentUser() user: AuthUser, @UploadedFile() file: UploadedAiAssistantAudioFile | undefined) {
    return this.aiAssistantService.transcribe(user, file);
  }

  @Get('transcribe/:jobId')
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AiAssistantQueuedTranscriptionResponseDto) },
        { $ref: getSchemaPath(AiAssistantProcessingTranscriptionResponseDto) },
        { $ref: getSchemaPath(AiAssistantCompletedTranscriptionResponseDto) },
        { $ref: getSchemaPath(AiAssistantFailedTranscriptionResponseDto) },
      ],
    },
  })
  getTranscriptionJob(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.aiAssistantService.getTranscriptionJob(user, jobId);
  }
}
