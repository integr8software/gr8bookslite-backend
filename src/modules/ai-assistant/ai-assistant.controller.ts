import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AiAssistantService,
  MAX_TRANSCRIPTION_AUDIO_SIZE_BYTES,
} from './ai-assistant.service';
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
  chat(@Body() dto: AiAssistantChatDto) {
    return this.aiAssistantService.chat(dto);
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
  transcribe(@UploadedFile() file: UploadedAiAssistantAudioFile | undefined) {
    return this.aiAssistantService.transcribe(file);
  }
}
