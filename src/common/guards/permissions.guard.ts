import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access/access-control.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';
import { PermissionRequirement } from '../interfaces/permission-requirement.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const hasAllPermissions = requiredPermissions.every((requirement) =>
      this.accessControlService.hasPermission(user, requirement.permission, requirement.action),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
