import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AiModuleToolName } from '../catalog/ai-module-profile.types';
import type { AiAssistantActionDto } from '../dto/ai-assistant-response.dto';

export type AiToolDefinition = {
  name: AiModuleToolName;
  permissionAction: PermissionAction;
};

export type AiToolAuthorizationResult = {
  allowed: boolean;
  denialMessage?: string;
};

export type AiToolExecutionResult = {
  action: AiAssistantActionDto | null;
  denialMessage?: string;
};

export type AiModuleCommandCandidate = {
  type?: unknown;
  moduleCode?: unknown;
  command?: unknown;
  label?: unknown;
};
