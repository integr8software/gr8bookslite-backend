import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembershipRole, Prisma, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppRole } from '../../common/enums/app-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash: hashedPassword,
          systemRole: SystemRole.STANDARD,
        },
      });

      const companySlug = await this.generateUniqueCompanySlug(
        dto.companyName,
        tx,
      );

      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          slug: companySlug,
        },
      });

      await tx.membership.create({
        data: {
          userId: createdUser.id,
          companyId: company.id,
          role: MembershipRole.ADMIN,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        include: {
          memberships: {
            include: {
              company: true,
            },
          },
        },
      });
    });

    const defaultMembership = user.memberships[0];

    return this.buildAuthenticatedResponse(
      user,
      defaultMembership.companyId,
      AppRole.ADMIN,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findForAuthByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
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
      throw new UnauthorizedException('User is not assigned to any company.');
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
      user: this.sanitizeUser(user),
      companies: user.memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: this.mapMembershipRole(membership.role),
      })),
    };
  }

  private async generateUniqueCompanySlug(
    companyName: string,
    prisma: Prisma.TransactionClient,
  ): Promise<string> {
    const baseSlug = this.buildCompanySlug(companyName);
    let slug = baseSlug;
    let suffix = 1;

    while (await prisma.company.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }

  private buildCompanySlug(companyName: string): string {
    const slug = companyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'company';
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
      companies: memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: this.mapMembershipRole(membership.role),
      })),
    };
  }

  private buildAuthenticatedResponse(
    user: UserWithMemberships,
    companyId: number | null,
    role: AppRole,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      companyId,
      role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.sanitizeUser(user),
      companyId,
      role,
      companies: user.memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: this.mapMembershipRole(membership.role),
      })),
    };
  }

  private sanitizeUser(user: {
    id: number;
    email: string;
    name: string;
    systemRole: SystemRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapMembershipRole(role: MembershipRole): AppRole {
    return role === MembershipRole.ADMIN ? AppRole.ADMIN : AppRole.USER;
  }
}
