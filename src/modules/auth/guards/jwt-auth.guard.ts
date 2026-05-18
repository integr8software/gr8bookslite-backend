import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { lastValueFrom, Observable } from 'rxjs';
import { AccessControlService } from '../../../common/access/access-control.service';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = super.canActivate(context);
    const canActivate =
      result instanceof Observable ? await lastValueFrom(result) : await result;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload | AuthUser }>();

    if (!request.user) {
      throw new UnauthorizedException('Invalid or missing access token.');
    }

    request.user = await this.accessControlService.resolveAuthUser(
      request.user as JwtPayload,
    );

    return canActivate;
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or missing access token.');
    }

    return user;
  }
}
