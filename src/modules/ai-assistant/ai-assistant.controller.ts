import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiAssistantService } from './ai-assistant.service';
import { AiAssistantChatDto } from './dto/ai-assistant-chat.dto';

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
}
