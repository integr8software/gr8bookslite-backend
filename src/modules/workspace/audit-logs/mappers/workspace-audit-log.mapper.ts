import type { WorkspaceAuditLogRecord } from '../prisma/workspace-audit-log.include';

const WorkspaceBranch = { id: 'workspace', name: 'Workspace' };

export function mapWorkspaceAuditLog(log: WorkspaceAuditLogRecord) {
  const metadata = isRecord(log.metadata) ? log.metadata : {};
  const branchId = getString(metadata.branchId) ?? WorkspaceBranch.id;
  const branchName = getString(metadata.branchName) ?? WorkspaceBranch.name;
  const action = toTitleCaseAction(log.action);
  const moduleName =
    log.module?.name ??
    getString(metadata.module) ??
    formatEntityType(log.entityType);
  const recordId = log.entityId ?? getString(metadata.recordId);
  const severity = getString(metadata.severity) ?? getSeverity(action);

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
      getString(metadata.description) ??
      createDescription(action, moduleName, recordId),
    ipAddress: log.ipAddress,
    module: moduleName,
    branchId,
    branchName,
    severity,
    createdAt: log.createdAt.toISOString(),
  };
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

function getSeverity(action: string) {
  if (action === 'Delete') {
    return 'Critical';
  }

  if (action === 'Reject') {
    return 'Warning';
  }

  return 'Info';
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
