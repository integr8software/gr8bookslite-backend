import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiToolAuthorizerService } from './tools/ai-tool-authorizer.service';
import { AiToolExecutorService } from './tools/ai-tool-executor.service';
import { AiToolRegistry } from './tools/ai-tool.registry';

@Module({
  imports: [AccessControlModule, AuthModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiToolAuthorizerService, AiToolExecutorService, AiToolRegistry],
})
export class AiAssistantModule {}
