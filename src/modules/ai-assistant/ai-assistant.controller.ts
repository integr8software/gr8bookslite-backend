import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiAssistantService, MAX_TRANSCRIPTION_AUDIO_SIZE_BYTES } from './ai-assistant.service';
import { AiAssistantChatDto } from './dto/ai-assistant-chat.dto';
import type { UploadedAiAssistantAudioFile } from './types/uploaded-ai-assistant-audio-file.type';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'ai-assistant',
  version: '1',
})
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() dto: AiAssistantChatDto) {
    return this.aiAssistantService.chat(user, dto);
  }

  @Post('transcribe')
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
  getTranscriptionJob(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.aiAssistantService.getTranscriptionJob(user, jobId);
  }
}
