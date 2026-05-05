import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppRole } from '../../../common/enums/app-role.enum';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'change-me-in-production',
      ),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      companyId: payload.companyId,
      role: payload.role ?? AppRole.USER,
    };
  }
}
