import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import {
  AuthAccessTokenCookieName,
  readCookieValue,
} from '../utils/auth-cookie.util';

type JwtRequest = {
  headers?: {
    cookie?: string;
  };
};

function extractJwtFromCookie(request: JwtRequest) {
  return readCookieValue(request.headers?.cookie, AuthAccessTokenCookieName);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'change-me-in-production',
      ),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
