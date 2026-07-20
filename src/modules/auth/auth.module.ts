import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccessControlModule } from '../../common/access/access-control.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthMailService } from './services/auth-mail.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { OtpService } from './services/otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getJwtExpiresInSeconds, getJwtSecret } from './utils/jwt-config.util';

@Module({
  imports: [
    ConfigModule,
    AccessControlModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: getJwtExpiresInSeconds(configService),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AuthMailService, GoogleOAuthService, OtpService],
  exports: [AuthService, JwtAuthGuard, AuthMailService],
})
export class AuthModule {}
