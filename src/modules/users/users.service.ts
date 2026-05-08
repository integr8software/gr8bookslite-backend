import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppRole } from '../../common/enums/app-role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { sanitizeUser } from '../../common/mappers/user.mapper';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserWithMemberships } from './types/user-with-memberships.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const existingUser = await this.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new BadRequestException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: dto.name,
        contactNumber: dto.contactNumber?.trim() || null,
        passwordHash: hashedPassword,
        systemRole: dto.systemRole ?? SystemRole.STANDARD,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    return sanitizeUser(user);
  }

  async findAll(authUser: AuthUser) {
    if (authUser.role === AppRole.SUPER_ADMIN) {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return users.map((user) => sanitizeUser(user));
    }

    this.ensureCompanyContext(authUser);

    const users = await this.prisma.user.findMany({
      where: {
        memberships: {
          some: {
            companyId: authUser.companyId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => sanitizeUser(user));
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) as string },
    });
  }

  findForAuthByEmail(email: string): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) as string },
      include: {
        memberships: {
          include: {
            company: true,
            companyRole: true,
          },
        },
      },
    });
  }

  async findById(id: number, authUser?: AuthUser) {
    if (!authUser || authUser.role === AppRole.SUPER_ADMIN) {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      return sanitizeUser(user);
    }

    this.ensureCompanyContext(authUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        memberships: {
          some: {
            companyId: authUser.companyId,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in this company.');
    }

    return sanitizeUser(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureUserExists(id);

    const data: Prisma.UserUpdateInput = {
      email: dto.email ? (normalizeEmail(dto.email) as string) : dto.email,
      name: dto.name,
      contactNumber:
        dto.contactNumber === undefined
          ? undefined
          : dto.contactNumber.trim() || null,
      systemRole: dto.systemRole,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return sanitizeUser(user);
  }

  async remove(id: number) {
    await this.ensureUserExists(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully.' };
  }

  private async ensureUserExists(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private ensureCompanyContext(
    authUser: AuthUser,
  ): asserts authUser is AuthUser & {
    companyId: number;
  } {
    if (!authUser.companyId) {
      throw new ForbiddenException('An active company context is required.');
    }
  }
}
