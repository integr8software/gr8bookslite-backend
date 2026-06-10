export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  CANCEL = 'cancel',
  UNCANCEL = 'uncancel',
  EXPORT = 'export',
  // Legacy actions kept temporarily for existing guards and clients.
  DELETE = 'delete',
  APPROVE = 'approve',
}
