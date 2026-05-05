import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipRole,
  Prisma,
  SystemRole,
  UserStatus,
  VerificationPurpose,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { sanitizeUser } from '../../common/mappers/user.mapper';
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
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = this.otpService.generateCode();
    const codeHash = await this.otpService.hashCode(verificationCode);
    const expiresAt = this.buildVerificationExpiry();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.fullName,
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
      email: user.email,
      maskedEmail: this.otpService.maskEmail(user.email),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findForAuthByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('Verification request is invalid.');
    }

    if (user.status === UserStatus.ACTIVE && user.emailVerifiedAt) {
      return {
        ...this.buildAuthenticatedResponse(user, null, AppRole.USER),
        requiresCompanySetup: user.memberships.length === 0,
      };
    }

    const verification = await this.getLatestActiveVerification(
      user.id,
      dto.email,
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

    const verifiedUser = await this.usersService.findForAuthByEmail(dto.email);

    if (!verifiedUser) {
      throw new BadRequestException('Verified user could not be loaded.');
    }

    return {
      ...this.buildAuthenticatedResponse(verifiedUser, null, AppRole.USER),
      requiresCompanySetup: verifiedUser.memberships.length === 0,
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(dto.email);

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
    if (dto.currentEmail === dto.newEmail) {
      throw new BadRequestException('New email must be different.');
    }

    const user = await this.usersService.findByEmail(dto.currentEmail);

    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('User is not awaiting verification.');
    }

    const userWithNewEmail = await this.usersService.findByEmail(dto.newEmail);

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
          email: dto.newEmail,
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
          email: dto.newEmail,
          purpose: VerificationPurpose.SIGNUP,
          codeHash,
          expiresAt,
        },
      });
    });

    await this.authMailService.sendVerificationCode(
      dto.newEmail,
      verificationCode,
    );

    return {
      message: 'Verification email updated.',
      maskedEmail: this.otpService.maskEmail(dto.newEmail),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

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

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('Password reset request is invalid.');
    }

    const verification = await this.getLatestActiveVerification(
      user.id,
      dto.email,
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
    const user = await this.usersService.findForAuthByEmail(dto.email);

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
      return this.buildAuthenticatedResponse(
        user,
        dto.companyId ?? null,
        AppRole.SUPER_ADMIN,
      );
    }

    if (user.memberships.length === 0) {
      return {
        ...this.buildAuthenticatedResponse(user, null, AppRole.USER),
        requiresCompanySetup: true,
      };
    }

    if (dto.companyId) {
      const membership = user.memberships.find(
        (item) => item.companyId === dto.companyId,
      );

      if (!membership) {
        throw new UnauthorizedException('You do not belong to this company.');
      }

      return this.buildAuthenticatedResponse(
        user,
        membership.companyId,
        this.mapMembershipRole(membership.role),
      );
    }

    if (user.memberships.length === 1) {
      const membership = user.memberships[0];

      return this.buildAuthenticatedResponse(
        user,
        membership.companyId,
        this.mapMembershipRole(membership.role),
      );
    }

    return {
      message: 'Company selection is required.',
      user: sanitizeUser(user),
      companies: this.mapCompanies(user),
    };
  }

  async getProfile(userId: number, companyId: number | null) {
    const user = await this.usersService.findById(userId);

    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { company: true },
    });

    return {
      user,
      activeCompanyId: companyId,
      requiresCompanySetup: memberships.length === 0,
      companies: memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: this.mapMembershipRole(membership.role),
      })),
    };
  }

  logout() {
    return {
      message: 'Logged out successfully.',
    };
  }

  private buildAuthenticatedResponse(
    user: UserWithMemberships,
    companyId: number | null,
    role: AppRole,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      companyId,
      role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: sanitizeUser(user),
      companyId,
      role,
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
    }));
  }
}
