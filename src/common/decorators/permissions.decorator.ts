import { SetMetadata } from '@nestjs/common';
import { PermissionRequirement } from '../interfaces/permission-requirement.interface';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionRequirement[]) => SetMetadata(PERMISSIONS_KEY, permissions);
