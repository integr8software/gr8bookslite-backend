export const ActivePermissionActions = ['view', 'create', 'update', 'cancel', 'uncancel', 'export'] as const;

export type ActivePermissionAction = (typeof ActivePermissionActions)[number];
