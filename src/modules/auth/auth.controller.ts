import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { ActivateWorkspaceUserDto } from './dto/activate-workspace-user.dto';
import { ChangeAuthenticatedPasswordDto } from './dto/change-authenticated-password.dto';
import { ChangeVerificationEmailDto } from './dto/change-verification-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchCompanyContextDto } from './dto/switch-company-context.dto';
import { VerifyForgotPasswordCodeDto } from './dto/verify-forgot-password-code.dto';
import { VerifyPasswordChangeCodeDto } from './dto/verify-password-change-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  clearAuthAccessTokenCookie,
  setAuthAccessTokenCookie,
} from './utils/auth-cookie.util';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyEmail(dto);
    this.setCookieIfAuthenticated(response, result);
    return result;
  }

  @Public()
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('change-verification-email')
  changeVerificationEmail(@Body() dto: ChangeVerificationEmailDto) {
    return this.authService.changeVerificationEmail(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('resend-forgot-password')
  resendForgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendForgotPassword(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('verify-forgot-password-code')
  verifyForgotPasswordCode(@Body() dto: VerifyForgotPasswordCodeDto) {
    return this.authService.verifyForgotPasswordCode(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('workspace-invitation/activate')
  activateWorkspaceUser(@Body() dto: ActivateWorkspaceUserDto) {
    return this.authService.activateWorkspaceUser(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setCookieIfAuthenticated(response, result, dto.rememberMe ?? false);
    return result;
  }

  @Public()
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @Get('google')
  googleAuth(
    @Query('mode') mode: string | undefined,
    @Res() response: Response,
  ) {
    response.redirect(this.authService.beginGoogleAuth(mode));
  }

  @Public()
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    response.redirect(
      await this.authService.handleGoogleCallback({
        code,
        state,
        error,
      }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthAccessTokenCookie(response);
    return this.authService.logout();
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Post('context/company')
  async switchCompanyContext(
    @CurrentUser() user: AuthUser,
    @Body() dto: SwitchCompanyContextDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.switchCompanyContext(
      user,
      dto.companyId,
    );
    this.setCookieIfAuthenticated(response, result);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password/otp')
  requestPasswordChangeOtp(@CurrentUser() user: AuthUser) {
    return this.authService.requestPasswordChangeOtp(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password/verify-otp')
  verifyPasswordChangeOtp(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyPasswordChangeCodeDto,
  ) {
    return this.authService.verifyPasswordChangeOtp(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  changeAuthenticatedPassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeAuthenticatedPasswordDto,
  ) {
    return this.authService.changeAuthenticatedPassword(user, dto);
  }

  private setCookieIfAuthenticated(
    response: Response,
    result: unknown,
    rememberMe = false,
  ) {
    if (
      result &&
      typeof result === 'object' &&
      'accessToken' in result &&
      typeof result.accessToken === 'string'
    ) {
      setAuthAccessTokenCookie(response, result.accessToken, rememberMe);
    }
  }
}
