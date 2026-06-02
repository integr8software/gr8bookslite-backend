import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthProvider,
  CompanyStatus,
  MembershipStatus,
  MembershipRole,
  Prisma,
  SystemRole,
  UserStatus,
  VerificationPurpose,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AccessControlService } from '../../common/access/access-control.service';
import { AppRole } from '../../common/enums/app-role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { sanitizeUser } from '../../common/mappers/user.mapper';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { UserWithMemberships } from '../users/types/user-with-memberships.type';
import { UsersService } from '../users/users.service';
import { ActivateWorkspaceUserDto } from './dto/activate-workspace-user.dto';
import { ChangeAuthenticatedPasswordDto } from './dto/change-authenticated-password.dto';
import { ChangeVerificationEmailDto } from './dto/change-verification-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyForgotPasswordCodeDto } from './dto/verify-forgot-password-code.dto';
import { VerifyPasswordChangeCodeDto } from './dto/verify-password-change-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthMailService } from './services/auth-mail.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { OtpService } from './services/otp.service';
import type { GoogleCallbackParams } from './types/google-callback-params.type';
import type { GoogleUserProfile } from './types/google-user-profile.type';
import type { PasswordResetTokenPayload } from './types/password-reset-token-payload.type';
import type { WorkspaceInviteToken } from './types/workspace-invite-token.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authMailService: AuthMailService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly otpService: OtpService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const normalizedEmail = normalizeEmail(dto.email) as string;
    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const contactNumber = dto.contactNumber?.trim() || null;
    const verificationCode = this.otpService.generateCode();
    const codeHash = await this.otpService.hashCode(verificationCode);
    const expiresAt = this.buildVerificationExpiry();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: dto.fullName,
          contactNumber,
          passwordHash: hashedPassword,
          systemRole: SystemRole.STANDARD,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      await this.upsertPasswordIdentity(tx, createdUser);

      await tx.emailVerificationCode.create({
        data: {
          userId: createdUser.id,
          email: createdUser.email,
          purpose: VerificationPurpose.SIGNUP,
          codeHash,
          expiresAt,
        },
      });

      return createdUser;
    });

    await this.authMailService.sendVerificationCode(
      user.email,
      verificationCode,
    );

    return {
      message: 'Verification code sent to your email.',
      verificationRequired: true,
      nextStep: 'VERIFY_EMAIL',
      email: user.email,
      maskedEmail: this.otpService.maskEmail(user.email),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findForAuthByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException('Verification request is invalid.');
    }

    if (user.status === UserStatus.ACTIVE && user.emailVerifiedAt) {
      return this.buildAuthenticatedResponse(user, null);
    }

    const verification = await this.getLatestActiveVerification(
      user.id,
      normalizedEmail,
    );

    if (!verification) {
      throw new BadRequestException('No active verification code was found.');
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code has expired.');
    }

    const isValidCode = await this.otpService.compareCode(
      dto.code,
      verification.codeHash,
    );

    if (!isValidCode) {
      await this.incrementVerificationAttempt(verification.id);

      throw new BadRequestException('Verification code is invalid.');
    }

    const verifiedAt = new Date();

    await this.prisma.$transaction([
      this.consumeVerificationCode(verification.id, verifiedAt),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: verifiedAt,
        },
      }),
    ]);

    const verifiedUser =
      await this.usersService.findForAuthByEmail(normalizedEmail);

    if (!verifiedUser) {
      throw new BadRequestException('Verified user could not be loaded.');
    }

    return this.buildAuthenticatedResponse(verifiedUser, null);
  }

  async resendVerification(dto: ResendVerificationDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('User is not awaiting verification.');
    }

    return this.resendSignupVerificationCode(user);
  }

  async changeVerificationEmail(dto: ChangeVerificationEmailDto) {
    const currentEmail = normalizeEmail(dto.currentEmail) as string;
    const newEmail = normalizeEmail(dto.newEmail) as string;

    if (currentEmail === newEmail) {
      throw new BadRequestException('New email must be different.');
    }

    const user = await this.usersService.findByEmail(currentEmail);

    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('User is not awaiting verification.');
    }

    const userWithNewEmail = await this.usersService.findByEmail(newEmail);

    if (userWithNewEmail) {
      throw new ConflictException('Email is already in use.');
    }

    const verificationCode = this.otpService.generateCode();
    const codeHash = await this.otpService.hashCode(verificationCode);
    const expiresAt = this.buildVerificationExpiry();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: newEmail,
        },
      });

      await tx.userAuthIdentity.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          email: newEmail,
        },
      });

      await tx.emailVerificationCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId: user.id,
          email: newEmail,
          purpose: VerificationPurpose.SIGNUP,
          codeHash,
          expiresAt,
        },
      });
    });

    await this.authMailService.sendVerificationCode(newEmail, verificationCode);

    return {
      message: 'Verification email updated.',
      maskedEmail: this.otpService.maskEmail(newEmail),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    return this.issuePasswordResetCode(dto, false);
  }

  async resendForgotPassword(dto: ForgotPasswordDto) {
    return this.issuePasswordResetCode(dto, true);
  }

  async verifyForgotPasswordCode(dto: VerifyForgotPasswordCodeDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException('Reset code is invalid.');
    }

    const verification = await this.getLatestActiveVerification(
      user.id,
      normalizedEmail,
      VerificationPurpose.PASSWORD_RESET,
    );

    if (!verification) {
      throw new BadRequestException('Reset code is invalid.');
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset code has expired.');
    }

    const isValidCode = await this.otpService.compareCode(
      dto.code,
      verification.codeHash,
    );

    if (!isValidCode) {
      await this.incrementVerificationAttempt(verification.id);

      throw new BadRequestException('Reset code is invalid.');
    }

    const verifiedAt = new Date();

    await this.consumeVerificationCode(verification.id, verifiedAt);

    return {
      message: 'Reset code verified successfully.',
      resetToken: this.buildPasswordResetToken({
        sub: user.id,
        email: normalizedEmail,
        purpose: 'PASSWORD_RESET',
        verificationId: verification.id,
      }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const resetTokenPayload = this.verifyPasswordResetToken(dto.resetToken);
    const user = await this.usersService.findByEmail(resetTokenPayload.email);

    if (!user) {
      throw new BadRequestException('Password reset request is invalid.');
    }

    if (user.id !== resetTokenPayload.sub) {
      throw new BadRequestException('Password reset request is invalid.');
    }

    const verification = await this.prisma.emailVerificationCode.findFirst({
      where: {
        id: resetTokenPayload.verificationId,
        userId: user.id,
        email: resetTokenPayload.email,
        purpose: VerificationPurpose.PASSWORD_RESET,
      },
    });

    if (!verification || verification.consumedAt == null) {
      throw new BadRequestException('Password reset request is invalid.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
        },
      });

      await this.upsertPasswordIdentity(tx, updatedUser);
    });

    return {
      message: 'Password has been reset successfully.',
    };
  }

  async activateWorkspaceUser(dto: ActivateWorkspaceUserDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    if (!ActivateWorkspaceUserDto.isStrongPassword(dto.newPassword)) {
      throw new BadRequestException(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      );
    }

    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Invitation link is invalid.');
    }

    const invitation = await this.getLatestActiveVerification(
      user.id,
      normalizedEmail,
      VerificationPurpose.WORKSPACE_INVITE,
    );

    if (!invitation) {
      throw new BadRequestException('Invitation link is invalid.');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invitation link has expired.');
    }

    const isValidToken = await bcrypt.compare(dto.token, invitation.codeHash);

    if (!isValidToken) {
      await this.incrementVerificationAttempt(invitation.id);
      throw new BadRequestException('Invitation link is invalid.');
    }

    const verifiedAt = new Date();
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.update({
        where: { id: invitation.id },
        data: {
          consumedAt: verifiedAt,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          emailVerifiedAt: user.emailVerifiedAt ?? verifiedAt,
        },
      });

      await this.upsertPasswordIdentity(tx, updatedUser);
    });

    return {
      message: 'Password created. You can now log in to activate your account.',
    };
  }

  async requestPasswordChangeOtp(authUser: AuthUser) {
    const user = await this.usersService.findById(authUser.id);
    const resetCode = this.otpService.generateCode();
    const codeHash = await this.otpService.hashCode(resetCode);
    const expiresAt = this.buildVerificationExpiry();
    const previousReset = await this.getLatestActiveVerification(
      user.id,
      user.email,
      VerificationPurpose.PASSWORD_RESET,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.updateMany({
        where: {
          userId: user.id,
          purpose: VerificationPurpose.PASSWORD_RESET,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId: user.id,
          email: user.email,
          purpose: VerificationPurpose.PASSWORD_RESET,
          codeHash,
          expiresAt,
          resendCount: (previousReset?.resendCount ?? 0) + 1,
        },
      });
    });

    await this.authMailService.sendPasswordResetCode(user.email, resetCode);

    return {
      message: 'Password change OTP sent.',
      maskedEmail: this.otpService.maskEmail(user.email),
    };
  }

  async verifyPasswordChangeOtp(
    authUser: AuthUser,
    dto: VerifyPasswordChangeCodeDto,
  ) {
    const user = await this.usersService.findById(authUser.id);
    const verification = await this.getLatestActiveVerification(
      user.id,
      user.email,
      VerificationPurpose.PASSWORD_RESET,
    );

    if (!verification) {
      throw new BadRequestException('Password change code is invalid.');
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Password change code has expired.');
    }

    const isValidCode = await this.otpService.compareCode(
      dto.code,
      verification.codeHash,
    );

    if (!isValidCode) {
      await this.incrementVerificationAttempt(verification.id);

      throw new BadRequestException('Password change code is invalid.');
    }

    const verifiedAt = new Date();

    await this.consumeVerificationCode(verification.id, verifiedAt);

    return {
      message: 'Password change code verified successfully.',
      resetToken: this.buildPasswordResetToken({
        sub: user.id,
        email: user.email,
        purpose: 'PASSWORD_RESET',
        verificationId: verification.id,
      }),
    };
  }

  async changeAuthenticatedPassword(
    authUser: AuthUser,
    dto: ChangeAuthenticatedPasswordDto,
  ) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const resetTokenPayload = this.verifyPasswordResetToken(dto.resetToken);

    if (resetTokenPayload.sub !== authUser.id) {
      throw new BadRequestException('Password change request is invalid.');
    }

    const verification = await this.prisma.emailVerificationCode.findFirst({
      where: {
        id: resetTokenPayload.verificationId,
        userId: authUser.id,
        email: resetTokenPayload.email,
        purpose: VerificationPurpose.PASSWORD_RESET,
      },
    });

    if (!verification || verification.consumedAt == null) {
      throw new BadRequestException('Password change request is invalid.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: authUser.id },
        data: {
          passwordHash: hashedPassword,
        },
      });

      await this.upsertPasswordIdentity(tx, updatedUser);
    });

    return {
      message: 'Password changed successfully.',
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findForAuthByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Your account is not yet registered.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is suspended.');
    }

    const canUsePasswordLogin = await this.hasAuthIdentity(
      user.id,
      AuthProvider.PASSWORD,
    );

    if (!canUsePasswordLogin) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Continue with Google to sign in.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (
      user.status === UserStatus.PENDING_VERIFICATION &&
      user.emailVerifiedAt
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      });

      await this.notifyWorkspaceUserActivated(user.id, user.name, user.email);

      const activatedUser =
        await this.usersService.findForAuthByEmail(normalizedEmail);

      if (!activatedUser) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      return this.loginActivatedUser(activatedUser, dto.companyId ?? null);
    }

    if (user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) {
      const verificationResponse =
        await this.resendSignupVerificationCode(user);

      throw new UnauthorizedException({
        message:
          'Please verify your email before logging in. A new verification code was sent.',
        code: 'EMAIL_NOT_VERIFIED',
        nextStep: 'VERIFY_EMAIL',
        email: user.email,
        maskedEmail: verificationResponse.maskedEmail,
      });
    }

    return this.loginActivatedUser(user, dto.companyId ?? null);
  }

  async createWorkspaceInviteToken(
    userId: number,
    email: string,
  ): Promise<WorkspaceInviteToken> {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresInSeconds = Number(
      this.configService.get<string | number>(
        'WORKSPACE_INVITE_EXPIRES_IN_SECONDS',
        60 * 60 * 24 * 7,
      ),
    );
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.updateMany({
        where: {
          userId,
          purpose: VerificationPurpose.WORKSPACE_INVITE,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId,
          email,
          purpose: VerificationPurpose.WORKSPACE_INVITE,
          codeHash: tokenHash,
          expiresAt,
        },
      });
    });

    return { rawToken, tokenHash };
  }

  private async notifyWorkspaceUserActivated(
    activatedUserId: number,
    activatedUserName: string,
    activatedUserEmail: string,
  ) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: activatedUserId,
        status: MembershipStatus.ACTIVE,
      },
      select: {
        invitedBy: {
          select: {
            email: true,
            name: true,
          },
        },
        company: {
          select: {
            name: true,
            memberships: {
              where: {
                role: MembershipRole.ADMIN,
                status: MembershipStatus.ACTIVE,
                userId: { not: activatedUserId },
              },
              select: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const recipients = new Map<
      string,
      { name: string; companyNames: Set<string> }
    >();

    for (const membership of memberships) {
      const admins =
        membership.invitedBy != null
          ? [membership.invitedBy]
          : membership.company.memberships.map(({ user }) => user);

      for (const admin of admins) {
        if (!admin.email || admin.email === activatedUserEmail) {
          continue;
        }

        const existing = recipients.get(admin.email);

        if (existing) {
          existing.companyNames.add(membership.company.name);
          continue;
        }

        recipients.set(admin.email, {
          name: admin.name || admin.email,
          companyNames: new Set([membership.company.name]),
        });
      }
    }

    await Promise.all(
      [...recipients.entries()].map(([email, recipient]) =>
        this.authMailService.sendWorkspaceUserActivated(
          email,
          recipient.name,
          activatedUserName,
          activatedUserEmail,
          [...recipient.companyNames],
        ),
      ),
    );
  }

  private async loginActivatedUser(
    user: UserWithMemberships,
    requestedCompanyId: number | null,
  ) {
    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return this.buildAuthenticatedResponse(user, requestedCompanyId);
    }

    const activeMemberships = this.getActiveMemberships(user);

    if (activeMemberships.length === 0) {
      return this.buildAuthenticatedResponse(user, null);
    }

    const resolvedCompanyId = this.resolveDefaultCompanyContext(
      user,
      requestedCompanyId,
    );

    if (resolvedCompanyId != null) {
      await this.markMembershipAccessed(user.id, resolvedCompanyId);
      return this.buildAuthenticatedResponse(user, resolvedCompanyId);
    }

    const onboarding = this.buildOnboardingState(user, null);

    return {
      message: 'Company selection is required.',
      user: sanitizeUser(user),
      companies: this.mapCompanies(user),
      onboarding,
    };
  }

  private async markMembershipAccessed(userId: number, companyId: number) {
    await this.prisma.membership.update({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      data: {
        lastAccessedAt: new Date(),
      },
    });
  }

  beginGoogleAuth(mode?: string) {
    return this.googleOAuthService.beginAuth(mode);
  }

  async handleGoogleCallback(params: GoogleCallbackParams) {
    const state = this.googleOAuthService.readState(params.state);
    const mode = state.mode;

    if (params.error) {
      return this.googleOAuthService.buildFrontendRedirect({
        mode,
        error: 'Google sign-in was cancelled or could not be completed.',
      });
    }

    if (!params.code || !params.state) {
      return this.googleOAuthService.buildFrontendRedirect({
        mode,
        error: 'Google sign-in response was incomplete.',
      });
    }

    if (!state.isValid) {
      return this.googleOAuthService.buildFrontendRedirect({
        mode,
        error: 'Google sign-in state is invalid or expired.',
      });
    }

    try {
      const googleProfile = await this.googleOAuthService.fetchProfile(
        params.code,
      );
      const authenticatedResponse =
        await this.loginOrRegisterWithGoogleProfile(googleProfile);

      return this.googleOAuthService.buildFrontendRedirect({
        mode,
        accessToken: authenticatedResponse.accessToken,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Google sign-in could not be completed.';

      return this.googleOAuthService.buildFrontendRedirect({
        mode,
        error: message,
      });
    }
  }

  async getProfile(user: AuthUser) {
    const profileUser = await this.usersService.findById(user.id);

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        company: true,
        companyRole: true,
        unitAccess: {
          include: {
            unit: true,
          },
        },
      },
    });

    const activeAccess =
      user.companyId == null
        ? null
        : await this.accessControlService.resolveAuthUser({
            sub: user.id,
            companyId: user.companyId,
            role: user.role,
            systemRole: user.systemRole,
            membershipRole: user.membershipRole,
            companyRoleId: user.companyRoleId,
          });

    const onboarding =
      user.systemRole === SystemRole.SUPER_ADMIN
        ? this.buildSuperAdminOnboardingState()
        : this.buildOnboardingStateFromMemberships(memberships, user.companyId);

    return {
      user: profileUser,
      activeCompanyId: user.companyId,
      activeAccess,
      onboarding,
      companies: memberships.map((membership) =>
        this.mapProfileCompany(membership),
      ),
    };
  }

  async switchCompanyContext(user: AuthUser, companyId: number) {
    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Super admin accounts use the master workspace.',
      );
    }

    const authUser = await this.usersService.findForAuthById(user.id);

    if (!authUser) {
      throw new UnauthorizedException('User account was not found.');
    }

    if (authUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active.');
    }

    const resolvedCompanyId = this.resolveDefaultCompanyContext(
      authUser,
      companyId,
    );

    if (resolvedCompanyId == null) {
      throw new ForbiddenException('Company access is required.');
    }

    return this.buildAuthenticatedResponse(authUser, resolvedCompanyId);
  }

  logout() {
    return {
      message: 'Logged out successfully.',
    };
  }

  private async buildAuthenticatedResponse(
    user: UserWithMemberships,
    companyId: number | null,
  ) {
    const accessContext = this.buildJwtAccessContext(user, companyId);
    const payload: JwtPayload = {
      sub: user.id,
      companyId,
      role: accessContext.role,
      systemRole: user.systemRole,
      membershipRole: accessContext.membershipRole,
      companyRoleId: accessContext.companyRoleId,
    };
    const resolvedAccess =
      companyId == null && user.systemRole !== SystemRole.SUPER_ADMIN
        ? null
        : await this.accessControlService.resolveAuthUser(payload);
    const onboarding = this.buildOnboardingState(user, companyId);

    return {
      accessToken: this.jwtService.sign(payload),
      user: sanitizeUser(user),
      companyId,
      role: accessContext.role,
      access: resolvedAccess,
      onboarding,
      companies: this.mapCompanies(user),
    };
  }

  private async loginOrRegisterWithGoogleProfile(profile: GoogleUserProfile) {
    const normalizedEmail = normalizeEmail(profile.email) as string | null;
    const googleSubject = profile.sub?.trim();

    if (!normalizedEmail) {
      throw new BadRequestException(
        'Google did not return a valid email address.',
      );
    }

    if (!googleSubject) {
      throw new BadRequestException(
        'Google did not return a stable account identifier.',
      );
    }

    if (!profile.email_verified) {
      throw new BadRequestException(
        'Your Google account email address is not verified.',
      );
    }

    const now = new Date();
    const existingGoogleIdentity =
      await this.prisma.userAuthIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.GOOGLE,
            providerUserId: googleSubject,
          },
        },
        include: {
          user: true,
        },
      });
    const existingUser =
      existingGoogleIdentity?.user ??
      (await this.usersService.findByEmail(normalizedEmail));

    if (existingUser?.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is suspended.');
    }

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(
        randomBytes(32).toString('hex'),
        10,
      );

      await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: profile.name?.trim() || normalizedEmail.split('@')[0],
            contactNumber: null,
            passwordHash,
            systemRole: SystemRole.STANDARD,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: now,
          },
        });

        await this.upsertGoogleIdentity(tx, {
          userId: createdUser.id,
          email: normalizedEmail,
          providerUserId: googleSubject,
        });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            status:
              existingUser.status === UserStatus.PENDING_VERIFICATION
                ? UserStatus.ACTIVE
                : undefined,
            emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
            name:
              existingUser.name?.trim().length > 0
                ? existingUser.name
                : (profile.name?.trim() ?? existingUser.name),
          },
        });

        await this.upsertGoogleIdentity(tx, {
          userId: existingUser.id,
          email: normalizedEmail,
          providerUserId: googleSubject,
        });
      });
    }

    const user = await this.usersService.findForAuthByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException('Google user account could not be loaded.');
    }

    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return this.buildAuthenticatedResponse(user, null);
    }

    const resolvedCompanyId = this.resolveDefaultCompanyContext(user, null);

    if (resolvedCompanyId != null) {
      return this.buildAuthenticatedResponse(user, resolvedCompanyId);
    }

    return this.buildAuthenticatedResponse(user, null);
  }

  private getActiveMemberships(user: UserWithMemberships) {
    return user.memberships.filter(
      (membership) => membership.status === MembershipStatus.ACTIVE,
    );
  }

  private resolveDefaultCompanyContext(
    user: UserWithMemberships,
    requestedCompanyId: number | null,
  ) {
    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return requestedCompanyId;
    }

    const activeMemberships = this.getActiveMemberships(user);

    if (requestedCompanyId != null) {
      const membership = user.memberships.find(
        (item) => item.companyId === requestedCompanyId,
      );

      if (!membership) {
        throw new UnauthorizedException('You do not belong to this company.');
      }

      if (membership.status !== MembershipStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Your company membership is not active.',
        );
      }

      return membership.companyId;
    }

    if (activeMemberships.length === 1) {
      return activeMemberships[0].companyId;
    }

    return null;
  }

  private async issuePasswordResetCode(
    dto: ForgotPasswordDto,
    isResend: boolean,
  ) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      return {
        message:
          'If the email is registered, a password reset code will be sent.',
      };
    }

    if (
      user.status !== UserStatus.ACTIVE &&
      user.status !== UserStatus.PENDING_VERIFICATION
    ) {
      return {
        message:
          'If the email is registered, a password reset code will be sent.',
      };
    }

    const canUsePasswordLogin = await this.hasAuthIdentity(
      user.id,
      AuthProvider.PASSWORD,
    );

    if (!canUsePasswordLogin) {
      return {
        code: 'GOOGLE_ACCOUNT_PASSWORD_NOT_ENABLED',
        message:
          'This account uses Google sign-in. Continue with Google, or set a password from account settings after signing in.',
      };
    }

    const resetCode = this.otpService.generateCode();
    const codeHash = await this.otpService.hashCode(resetCode);
    const expiresAt = this.buildVerificationExpiry();

    const previousReset = await this.getLatestActiveVerification(
      user.id,
      user.email,
      VerificationPurpose.PASSWORD_RESET,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.updateMany({
        where: {
          userId: user.id,
          purpose: VerificationPurpose.PASSWORD_RESET,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId: user.id,
          email: user.email,
          purpose: VerificationPurpose.PASSWORD_RESET,
          codeHash,
          expiresAt,
          resendCount: (previousReset?.resendCount ?? 0) + (isResend ? 1 : 0),
        },
      });
    });

    await this.authMailService.sendPasswordResetCode(user.email, resetCode);

    return {
      message:
        'If the email is registered, a password reset code will be sent.',
    };
  }

  private hasAuthIdentity(userId: number, provider: AuthProvider) {
    return this.prisma.userAuthIdentity
      .count({
        where: {
          userId,
          provider,
        },
      })
      .then((count) => count > 0);
  }

  private upsertPasswordIdentity(
    tx: Prisma.TransactionClient,
    user: { id: number; email: string },
  ) {
    return tx.userAuthIdentity.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: AuthProvider.PASSWORD,
        },
      },
      update: {
        email: user.email,
      },
      create: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        email: user.email,
      },
    });
  }

  private upsertGoogleIdentity(
    tx: Prisma.TransactionClient,
    params: { userId: number; email: string; providerUserId: string },
  ) {
    return tx.userAuthIdentity.upsert({
      where: {
        userId_provider: {
          userId: params.userId,
          provider: AuthProvider.GOOGLE,
        },
      },
      update: {
        email: params.email,
        providerUserId: params.providerUserId,
      },
      create: {
        userId: params.userId,
        provider: AuthProvider.GOOGLE,
        providerUserId: params.providerUserId,
        email: params.email,
      },
    });
  }

  private buildVerificationExpiry(): Date {
    const expirySeconds = Number(
      this.configService.get<string | number>(
        'EMAIL_VERIFICATION_EXPIRES_IN_SECONDS',
        300,
      ),
    );

    return new Date(Date.now() + expirySeconds * 1000);
  }

  private async resendSignupVerificationCode(user: {
    id: number;
    email: string;
  }) {
    const verificationCode = this.otpService.generateCode();
    const codeHash = await this.otpService.hashCode(verificationCode);
    const expiresAt = this.buildVerificationExpiry();

    const previousVerification = await this.getLatestActiveVerification(
      user.id,
      user.email,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.updateMany({
        where: {
          userId: user.id,
          purpose: VerificationPurpose.SIGNUP,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId: user.id,
          email: user.email,
          purpose: VerificationPurpose.SIGNUP,
          codeHash,
          expiresAt,
          resendCount: (previousVerification?.resendCount ?? 0) + 1,
        },
      });
    });

    await this.authMailService.sendVerificationCode(
      user.email,
      verificationCode,
    );

    return {
      message: 'A new verification code was sent.',
      maskedEmail: this.otpService.maskEmail(user.email),
    };
  }

  private buildPasswordResetToken(payload: PasswordResetTokenPayload) {
    return this.jwtService.sign(payload, {
      expiresIn: Number(
        this.configService.get<string | number>(
          'RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS',
          600,
        ),
      ),
    });
  }

  private verifyPasswordResetToken(token: string): PasswordResetTokenPayload {
    try {
      const payload = this.jwtService.verify<PasswordResetTokenPayload>(token);

      if (payload.purpose !== 'PASSWORD_RESET') {
        throw new BadRequestException('Password reset token is invalid.');
      }

      return payload;
    } catch {
      throw new BadRequestException(
        'Password reset token is invalid or expired.',
      );
    }
  }

  private getLatestActiveVerification(
    userId: number,
    email: string,
    purpose: VerificationPurpose = VerificationPurpose.SIGNUP,
  ) {
    return this.prisma.emailVerificationCode.findFirst({
      where: {
        userId,
        email,
        purpose,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private incrementVerificationAttempt(id: number) {
    return this.prisma.emailVerificationCode.update({
      where: {
        id,
      },
      data: {
        attemptCount: {
          increment: 1,
        },
      },
    });
  }

  private consumeVerificationCode(id: number, consumedAt: Date) {
    return this.prisma.emailVerificationCode.update({
      where: {
        id,
      },
      data: {
        consumedAt,
      },
    });
  }

  private mapMembershipRole(role: MembershipRole): AppRole {
    return role === MembershipRole.ADMIN ? AppRole.ADMIN : AppRole.USER;
  }

  private mapCompanies(user: UserWithMemberships) {
    return user.memberships.map((membership) =>
      this.mapProfileCompany(membership),
    );
  }

  private mapProfileCompany(
    membership: UserWithMemberships['memberships'][number],
  ) {
    return {
      companyId: membership.companyId,
      companyName: membership.company.name,
      companyStatus: membership.company.status,
      isCompanyActive:
        membership.company.isActive &&
        membership.company.status === CompanyStatus.ACTIVE,
      logoPublicUrl: membership.company.logoPublicUrl,
      role: this.mapMembershipRole(membership.role),
      membershipStatus: membership.status,
      accessScope: membership.accessScope,
      companyRoleId: membership.companyRoleId,
      companyRoleCode: membership.companyRole?.code ?? null,
      accessibleUnitIds: membership.unitAccess.map((access) => access.unitId),
      units: membership.unitAccess.map((access) => ({
        id: access.unit.id,
        code: access.unit.code,
        name: access.unit.name,
        type: access.unit.type,
        isActive: access.unit.isActive,
        isMain: access.unit.type === 'HEAD_OFFICE',
      })),
    };
  }

  private buildJwtAccessContext(
    user: UserWithMemberships,
    companyId: number | null,
  ) {
    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return {
        role: AppRole.SUPER_ADMIN,
        membershipRole: null,
        companyRoleId: null,
      };
    }

    if (companyId == null) {
      return {
        role: AppRole.USER,
        membershipRole: null,
        companyRoleId: null,
      };
    }

    const membership = user.memberships.find(
      (item) => item.companyId === companyId,
    );

    return {
      role: membership ? this.mapMembershipRole(membership.role) : AppRole.USER,
      membershipRole: membership?.role ?? null,
      companyRoleId: membership?.companyRoleId ?? null,
    };
  }

  private buildOnboardingState(
    user: UserWithMemberships,
    activeCompanyId: number | null,
  ) {
    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return this.buildSuperAdminOnboardingState();
    }

    return this.buildOnboardingStateFromMemberships(
      user.memberships,
      activeCompanyId,
    );
  }

  private buildSuperAdminOnboardingState() {
    return {
      emailVerified: true,
      hasCompany: false,
      hasActiveCompany: false,
      hasActiveCompanyContext: false,
      requiresCompanySetup: false,
      canManageCompany: false,
      nextStep: 'APP_READY',
    };
  }

  private buildOnboardingStateFromMemberships(
    memberships: Array<{
      companyId: number;
      role: MembershipRole;
      status: MembershipStatus;
    }>,
    activeCompanyId: number | null,
  ) {
    const activeMemberships = memberships.filter(
      (membership) => membership.status === MembershipStatus.ACTIVE,
    );
    const activeMembership =
      activeCompanyId == null
        ? null
        : (activeMemberships.find(
            (membership) => membership.companyId === activeCompanyId,
          ) ?? null);

    return {
      emailVerified: true,
      hasCompany: memberships.length > 0,
      hasActiveCompany: activeMemberships.length > 0,
      hasActiveCompanyContext: activeMembership !== null,
      requiresCompanySetup: memberships.length === 0,
      canManageCompany: activeMembership?.role === MembershipRole.ADMIN,
      nextStep:
        memberships.length === 0
          ? 'COMPANY_SETUP'
          : activeMembership === null
            ? 'SELECT_COMPANY'
            : 'APP_READY',
    };
  }
}
