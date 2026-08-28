import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import type { AiAssistantAction } from '../ai-assistant.types';
import type { AiModuleToolName } from '../catalog/ai-module-profile.types';

export type AiToolDefinition = {
  name: AiModuleToolName;
  permissionAction: PermissionAction;
};

export type AiToolAuthorizationResult = {
  allowed: boolean;
  denialMessage?: string;
};

export type AiToolExecutionResult = {
  action: AiAssistantAction | null;
  denialMessage?: string;
};

export type AiModuleCommandCandidate = {
  type?: unknown;
  moduleCode?: unknown;
  command?: unknown;
  label?: unknown;
};

export type AiToolContext = {
  user: AuthUser;
  moduleCode: string;
};
