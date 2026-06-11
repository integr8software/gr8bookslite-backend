import type { WorkspaceAuditLogRecord } from '../prisma/workspace-audit-log.include';

const WorkspaceBranch = { id: 'workspace', name: 'Workspace' };

export function mapWorkspaceAuditLog(log: WorkspaceAuditLogRecord) {
  const metadata = isRecord(log.metadata) ? log.metadata : {};
  const branchId = getString(metadata.branchId) ?? WorkspaceBranch.id;
  const branchName = getString(metadata.branchName) ?? WorkspaceBranch.name;
  const action = toTitleCaseAction(log.action);
  const moduleName = getModuleName(metadata, log.entityType);
  const recordId =
    getString(metadata.recordId) ??
    getNumericString(metadata.module) ??
    getPathRecordId(metadata.path) ??
    log.entityId;

  return {
    id: log.id.toString(),
    companyId: log.companyId,
    companyName: log.company?.name ?? null,
    actorUserId: log.actorUserId,
    actorName: log.actorUser?.name ?? getString(metadata.actorName) ?? 'System',
    actorRole:
      getString(metadata.actorRole) ??
      formatEntityType(log.actorUser?.systemRole ?? 'System'),
    action,
    entityType: log.entityType,
    entityId: log.entityId,
    description:
      getDescription(metadata, action, moduleName, recordId ?? undefined) ??
      createDescription(action, moduleName, recordId ?? undefined),
    ipAddress: log.ipAddress,
    module: moduleName,
    branchId,
    branchName,
    createdAt: log.createdAt.toISOString(),
  };
}

function getModuleName(metadata: Record<string, unknown>, entityType: string) {
  const metadataModule = getString(metadata.module);

  if (metadataModule && !isNumericString(metadataModule)) {
    return metadataModule;
  }

  return getModuleNameFromPath(metadata.path) ?? formatEntityType(entityType);
}

function getDescription(
  metadata: Record<string, unknown>,
  action: string,
  moduleName: string,
  recordId: string | undefined,
) {
  const description = getString(metadata.description);

  if (!description || isNumericOpenedDescription(description)) {
    return undefined;
  }

  if (
    recordId &&
    action === 'View' &&
    description === `${moduleName} was opened.`
  ) {
    return createDescription(action, moduleName, recordId);
  }

  return description;
}

function toTitleCaseAction(action: string) {
  const normalized = action.trim().toUpperCase();

  if (normalized === 'CREATE') return 'Create';
  if (normalized === 'UPDATE') return 'Update';
  if (normalized === 'DELETE' || normalized === 'DEACTIVATE') return 'Delete';
  if (normalized === 'APPROVE') return 'Approve';
  if (normalized === 'REJECT') return 'Reject';
  if (normalized === 'EXPORT') return 'Export';
  if (normalized === 'LOGIN') return 'Login';
  if (normalized === 'LOGOUT') return 'Logout';
  if (normalized === 'VIEW') return 'View';

  return formatEntityType(action);
}

function createDescription(
  action: string,
  moduleName: string,
  recordId: string | undefined,
) {
  const subject = recordId ? `${moduleName} record ${recordId}` : moduleName;
  const pastTense: Record<string, string> = {
    Approve: 'approved',
    Create: 'created',
    Delete: 'deleted',
    Export: 'exported',
    Login: 'logged in',
    Logout: 'logged out',
    Reject: 'rejected',
    Update: 'updated',
    View: 'viewed',
  };

  return `${subject} was ${pastTense[action] ?? action.toLowerCase()}.`;
}

function formatEntityType(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(
      /\w\S*/g,
      (word) => word[0].toUpperCase() + word.slice(1).toLowerCase(),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getNumericString(value: unknown) {
  const stringValue = getString(value);

  return stringValue && isNumericString(stringValue) ? stringValue : undefined;
}

function isNumericString(value: string) {
  return /^\d+$/.test(value.trim());
}

function isNumericOpenedDescription(value: string) {
  return /^\d+ was opened\.$/.test(value.trim());
}

function getModuleNameFromPath(value: unknown) {
  const path = getString(value);

  if (!path) {
    return undefined;
  }

  const segments = path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const editIndex = segments.findIndex((segment) => segment === 'edit');
  const numericIndex = findLastIndex(segments, isNumericString);
  const moduleSegment =
    editIndex > 0
      ? segments[editIndex - 1]
      : numericIndex > 0
        ? segments[numericIndex - 1]
        : segments[segments.length - 1];

  return moduleSegment && !isNumericString(moduleSegment)
    ? formatEntityType(moduleSegment)
    : undefined;
}

function getPathRecordId(value: unknown) {
  const path = getString(value);

  if (!path) {
    return undefined;
  }

  return path
    .split('/')
    .map((segment) => segment.trim())
    .reverse()
    .find(isNumericString);
}

function findLastIndex<T>(values: T[], predicate: (value: T) => boolean) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (predicate(values[index])) {
      return index;
    }
  }

  return -1;
}
