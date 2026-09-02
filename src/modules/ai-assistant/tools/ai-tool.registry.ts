import { Injectable } from '@nestjs/common';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import { AiModuleTools, AiModuleToolName } from '../catalog/ai-module-profile.types';
import type { AiToolDefinition } from './ai-tool.interface';

const AiToolDefinitions: readonly AiToolDefinition[] = [
  { name: AiModuleTools.EXPLAIN, permissionAction: PermissionAction.VIEW },
  { name: AiModuleTools.OPEN, permissionAction: PermissionAction.VIEW },
  { name: AiModuleTools.PURCHASE_REQUEST_PREPARE, permissionAction: PermissionAction.CREATE },
  { name: AiModuleTools.TERMS_FILTER, permissionAction: PermissionAction.VIEW },
  { name: AiModuleTools.TERMS_PREPARE, permissionAction: PermissionAction.CREATE },
  { name: AiModuleTools.TERMS_SEARCH, permissionAction: PermissionAction.VIEW },
  { name: AiModuleTools.TERMS_UPDATE_PREVIEW, permissionAction: PermissionAction.UPDATE },
];

@Injectable()
export class AiToolRegistry {
  private readonly definitions = new Map(AiToolDefinitions.map((definition) => [definition.name, definition]));

  get(toolName: AiModuleToolName) {
    return this.definitions.get(toolName);
  }

  has(toolName: string): toolName is AiModuleToolName {
    return this.definitions.has(toolName as AiModuleToolName);
  }
}
