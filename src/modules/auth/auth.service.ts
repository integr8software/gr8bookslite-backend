import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipStatus,
  MembershipRole,
  Prisma,
  SystemRole,
  UserStatus,
  VerificationPurpose,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AccessControlService } from '../../common/access/access-control.service';
import { AppRole } from '../../common/enums/app-role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { sanitizeUser } from '../../common/mappers/user.mapper';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ChangeVerificationEmailDto } from './dto/change-verification-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthMailService } from './services/auth-mail.service';
import { OtpService } from './services/otp.service';

type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        companyRole: true;
        company: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authMailService: AuthMailService,
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
      await this.incrementVerificationAttempt(
        verification.id,
      );

      throw new BadRequestException('Verification code is invalid.');
    }

    const verifiedAt = new Date();

    await this.prisma.$transaction([
      this.consumeVerificationCode(
        verification.id,
        verifiedAt,
      ),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: verifiedAt,
        },
      }),
    ]);

    const verifiedUser = await this.usersService.findForAuthByEmail(
      normalizedEmail,
    );

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

    await this.authMailService.sendVerificationCode(
      newEmail,
      verificationCode,
    );

    return {
      message: 'Verification email updated.',
      maskedEmail: this.otpService.maskEmail(newEmail),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return {
        message:
          'If the email is registered, a password reset code will be sent.',
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
          resendCount: previousReset?.resendCount ?? 0,
        },
      });
    });

    await this.authMailService.sendPasswordResetCode(user.email, resetCode);

    return {
      message:
        'If the email is registered, a password reset code will be sent.',
      maskedEmail: this.otpService.maskEmail(user.email),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException('Password reset request is invalid.');
    }

    const verification = await this.getLatestActiveVerification(
      user.id,
      normalizedEmail,
      VerificationPurpose.PASSWORD_RESET,
    );

    if (!verification) {
      throw new BadRequestException('No active reset code was found.');
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset code has expired.');
    }

    const isValidCode = await this.otpService.compareCode(
      dto.code,
      verification.codeHash,
    );

    if (!isValidCode) {
      await this.incrementVerificationAttempt(
        verification.id,
      );

      throw new BadRequestException('Reset code is invalid.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    const resetAt = new Date();

    await this.prisma.$transaction([
      this.consumeVerificationCode(
        verification.id,
        resetAt,
      ),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
        },
      }),
    ]);

    return {
      message: 'Password has been reset successfully.',
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const user = await this.usersService.findForAuthByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is suspended.');
    }

    if (user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return this.buildAuthenticatedResponse(user, dto.companyId ?? null);
    }

    const activeMemberships = user.memberships.filter(
      (membership) => membership.status === MembershipStatus.ACTIVE,
    );

    if (activeMemberships.length === 0) {
      return this.buildAuthenticatedResponse(user, null);
    }

    if (dto.companyId) {
      const membership = user.memberships.find(
        (item) => item.companyId === dto.companyId,
      );

      if (!membership) {
        throw new UnauthorizedException('You do not belong to this company.');
      }

      if (membership.status !== MembershipStatus.ACTIVE) {
        throw new UnauthorizedException('Your company membership is not active.');
      }

      return this.buildAuthenticatedResponse(user, membership.companyId);
    }

    if (activeMemberships.length === 1) {
      return this.buildAuthenticatedResponse(
        user,
        activeMemberships[0].companyId,
      );
    }

    const onboarding = this.buildOnboardingState(user, null);

    return {
      message: 'Company selection is required.',
      user: sanitizeUser(user),
      companies: this.mapCompanies(user),
      onboarding,
      requiresCompanySetup: onboarding.requiresCompanySetup,
      hasCompany: onboarding.hasCompany,
      hasActiveCompany: onboarding.hasActiveCompany,
      hasActiveCompanyContext: onboarding.hasActiveCompanyContext,
      canManageCompany: onboarding.canManageCompany,
    };
  }

  async getProfile(user: AuthUser) {
    const profileUser = await this.usersService.findById(user.id);

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        company: true,
        companyRole: true,
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

    const onboarding = this.buildOnboardingStateFromMemberships(
      memberships,
      user.companyId,
    );

    return {
      user: profileUser,
      activeCompanyId: user.companyId,
      activeAccess,
      onboarding,
      requiresCompanySetup: onboarding.requiresCompanySetup,
      hasCompany: onboarding.hasCompany,
      hasActiveCompany: onboarding.hasActiveCompany,
      hasActiveCompanyContext: onboarding.hasActiveCompanyContext,
      canManageCompany: onboarding.canManageCompany,
      companies: memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: this.mapMembershipRole(membership.role),
        membershipStatus: membership.status,
        companyRoleId: membership.companyRoleId,
        companyRoleCode: membership.companyRole?.code ?? null,
      })),
    };
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
      requiresCompanySetup: onboarding.requiresCompanySetup,
      hasCompany: onboarding.hasCompany,
      hasActiveCompany: onboarding.hasActiveCompany,
      hasActiveCompanyContext: onboarding.hasActiveCompanyContext,
      canManageCompany: onboarding.canManageCompany,
      companies: this.mapCompanies(user),
    };
  }

  private buildVerificationExpiry(): Date {
    const expirySeconds = this.configService.get<number>(
      'EMAIL_VERIFICATION_EXPIRES_IN_SECONDS',
      300,
    );

    return new Date(Date.now() + expirySeconds * 1000);
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

  private consumeVerificationCode(
    id: number,
    consumedAt: Date,
  ) {
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
    return user.memberships.map((membership) => ({
      companyId: membership.companyId,
      companyName: membership.company.name,
      role: this.mapMembershipRole(membership.role),
      membershipStatus: membership.status,
      companyRoleId: membership.companyRoleId,
      companyRoleCode: membership.companyRole?.code ?? null,
    }));
  }

  private buildJwtAccessContext(user: UserWithMemberships, companyId: number | null) {
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

    const membership = user.memberships.find((item) => item.companyId === companyId);

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
    return this.buildOnboardingStateFromMemberships(
      user.memberships,
      activeCompanyId,
    );
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
        : activeMemberships.find(
            (membership) => membership.companyId === activeCompanyId,
          ) ?? null;

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
