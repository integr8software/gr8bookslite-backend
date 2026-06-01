import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';

@Module({
  imports: [AccessControlModule, AuthModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
})
export class AiAssistantModule {}
