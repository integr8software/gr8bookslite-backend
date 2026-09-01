import { Injectable } from '@nestjs/common';
import { AiModuleTools } from '../catalog/ai-module-profile.types';
import { findAiModuleProfileByCode } from '../catalog/ai-module-profile.registry';
import type { AiModuleCommandCandidate, AiToolExecutionResult } from './ai-tool.interface';
import { AiToolAuthorizerService } from './ai-tool-authorizer.service';
import { AiToolRegistry } from './ai-tool.registry';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';

@Injectable()
export class AiToolExecutorService {
  constructor(
    private readonly toolRegistry: AiToolRegistry,
    private readonly toolAuthorizer: AiToolAuthorizerService,
  ) {}

  executeModuleCommand(user: AuthUser, candidate: AiModuleCommandCandidate): AiToolExecutionResult {
    if (candidate.type !== 'module_command' || candidate.command !== 'open' || typeof candidate.moduleCode !== 'string') {
      return { action: null };
    }

    const profile = findAiModuleProfileByCode(candidate.moduleCode);
    const tool = this.toolRegistry.get(AiModuleTools.OPEN);

    if (!profile) {
      return {
        action: null,
        denialMessage: 'That module is not available to Neo AI.',
      };
    }

    if (!tool || !profile.tools.includes(tool.name)) {
      return { action: null };
    }

    const authorization = this.toolAuthorizer.authorize(user, profile.moduleCode, tool.permissionAction);

    if (!authorization.allowed) {
      return {
        action: null,
        denialMessage: authorization.denialMessage,
      };
    }

    return {
      action: {
        type: 'module_command',
        moduleCode: profile.moduleCode,
        command: 'open',
        label: profile.name,
      },
    };
  }
}
