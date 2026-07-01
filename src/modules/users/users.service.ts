import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { UserAvatarStorageService } from './services/user-avatar-storage.service';
import type { UploadedAvatarFile } from './types/uploaded-avatar-file.type';
import type { UserWithMemberships } from './types/user-with-memberships.type';
import { validateUserAvatarFile } from './utils/UserAvatarUpload.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userAvatarStorageService: UserAvatarStorageService,
  ) {}

  async create(dto: CreateUserDto) {
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const existingUser = await this.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new BadRequestException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
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

      return createdUser;
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
            unitAccess: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });
  }

  findForAuthById(id: number): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            company: true,
            companyRole: true,
            unitAccess: {
              include: {
                unit: true,
              },
            },
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

    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data,
      });

      if (dto.email) {
        await tx.userAuthIdentity.updateMany({
          where: { userId: updatedUser.id },
          data: { email: updatedUser.email },
        });
      }

      return updatedUser;
    });

    return sanitizeUser(user);
  }

  async updateOwnProfile(
    id: number,
    dto: {
      fullName?: string;
      contactNumber?: string;
    },
  ) {
    const name = dto.fullName?.trim();

    if (dto.fullName !== undefined && !name) {
      throw new BadRequestException('Full name is required.');
    }

    await this.ensureUserExists(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name,
        contactNumber:
          dto.contactNumber === undefined
            ? undefined
            : dto.contactNumber.trim() || null,
      },
    });

    return sanitizeUser(user);
  }

  async uploadOwnAvatar(id: number, file: UploadedAvatarFile | undefined) {
    const validatedFile = validateUserAvatarFile(file);
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        avatarStoragePath: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const upload = await this.userAvatarStorageService.uploadAvatar({
      userId: id,
      fileName: validatedFile.originalname,
      mimeType: validatedFile.mimetype,
      fileBuffer: validatedFile.buffer,
    });

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        avatarFileName: upload.fileName,
        avatarMimeType: upload.mimeType,
        avatarStoragePath: upload.storagePath,
        avatarPublicUrl: upload.publicUrl,
      },
    });

    await this.removeAvatarBestEffort(existingUser.avatarStoragePath);

    return sanitizeUser(user);
  }

  async removeOwnAvatar(id: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        avatarStoragePath: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        avatarFileName: null,
        avatarMimeType: null,
        avatarStoragePath: null,
        avatarPublicUrl: null,
      },
    });

    await this.userAvatarStorageService.removeAvatar(
      existingUser.avatarStoragePath,
    );

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

  private async removeAvatarBestEffort(storagePath: string | null | undefined) {
    if (!storagePath) {
      return;
    }

    try {
      await this.userAvatarStorageService.removeAvatar(storagePath);
    } catch (error) {
      this.logger.warn(
        `Unable to delete previous avatar "${storagePath}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
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
