import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateApproverSetupDto } from './dto/create-approver-setup.dto';
import {
  ApproverSetupModulesResponse,
  ApproverSetupsPaginatedResponse,
  ApproverSetupUserResponse,
  CreateApproverSetupResponse,
} from './types/approver-setup-response.type';
import { GetApproverSetupsQueryDto, GetApproverSetupUsersQueryDto } from './dto/get-approver-setups-query.dto';
import { mapApproverSetup } from './mappers/approver-setup.mapper';

const ApproverSetupInclude = {
  approvers: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      sequence: 'asc',
    },
  },
} satisfies Prisma.ApproverSetupInclude;

@Injectable()
export class ApproverSetupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findModules(): Promise<ApproverSetupModulesResponse> {
    const modules = await this.prisma.module.findMany({
      where: {
        OR: ApproverSetupModuleTypeWhere,
        isActive: true,
      },
      select: {
        code: true,
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { modules };
  }

  async create(user: AuthUser, dto: CreateApproverSetupDto): Promise<CreateApproverSetupResponse> {
    const companyId = this.getCompanyContext(user);
    const approverUserIds = await this.getValidApproverUserIds(companyId, dto.approverUserIds);

    const setup = await this.prisma.$transaction(async (tx) =>
      tx.approverSetup.create({
        data: {
          companyId,
          approverCondition: dto.approverCondition.trim(),
          levelName: dto.levelName.trim(),
          type: dto.type.trim(),
          status: dto.status.trim(),
          level: dto.level ?? null,
          moduleScope: dto.moduleScope.trim(),
          validUntil: getApproverSetupValidUntil(dto),
          approvers: {
            create: approverUserIds.map((userId, index) => ({
              userId,
              sequence: index + 1,
              moduleScope: dto.moduleScope.trim(),
            })),
          },
        },
        include: ApproverSetupInclude,
      }),
    );

    return {
      message: 'Approver setup created.',
      setup: mapApproverSetup(setup),
    };
  }

  async update(user: AuthUser, setupId: string, dto: CreateApproverSetupDto): Promise<CreateApproverSetupResponse> {
    const companyId = this.getCompanyContext(user);
    const approverUserIds = await this.getValidApproverUserIds(companyId, dto.approverUserIds);
    await this.assertSetupBelongsToCompany(companyId, setupId);

    const setup = await this.prisma.$transaction(async (tx) => {
      await tx.approverSetupUser.deleteMany({
        where: {
          approverSetupId: setupId,
        },
      });

      return tx.approverSetup.update({
        where: {
          id: setupId,
        },
        data: {
          approverCondition: dto.approverCondition.trim(),
          levelName: dto.levelName.trim(),
          type: dto.type.trim(),
          status: dto.status.trim(),
          level: dto.level ?? null,
          moduleScope: dto.moduleScope.trim(),
          validUntil: getApproverSetupValidUntil(dto),
          approvers: {
            create: approverUserIds.map((userId, index) => ({
              userId,
              sequence: index + 1,
              moduleScope: dto.moduleScope.trim(),
            })),
          },
        },
        include: ApproverSetupInclude,
      });
    });

    return {
      message: 'Approver setup updated.',
      setup: mapApproverSetup(setup),
    };
  }

  async updateStatus(user: AuthUser, setupId: string, status: string): Promise<CreateApproverSetupResponse> {
    const companyId = this.getCompanyContext(user);
    await this.assertSetupBelongsToCompany(companyId, setupId);

    const setup = await this.prisma.approverSetup.update({
      where: {
        id: setupId,
      },
      data: {
        status: status.trim(),
      },
      include: ApproverSetupInclude,
    });

    return {
      message: 'Approver setup status updated.',
      setup: mapApproverSetup(setup),
    };
  }

  async remove(user: AuthUser, setupId: string) {
    const companyId = this.getCompanyContext(user);
    await this.assertSetupBelongsToCompany(companyId, setupId);

    await this.prisma.approverSetup.delete({
      where: {
        id: setupId,
      },
    });

    return {
      message: 'Approver setup deleted.',
      id: setupId,
    };
  }

  async findAll(user: AuthUser, query: GetApproverSetupsQueryDto): Promise<ApproverSetupsPaginatedResponse> {
    const companyId = this.getCompanyContext(user);
    const page = Math.max(query.page, 1);
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const where: Prisma.ApproverSetupWhereInput = {
      companyId,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.approverSetup.findMany({
        where,
        include: ApproverSetupInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.approverSetup.count({ where }),
    ]);

    return {
      items: items.map(mapApproverSetup),
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  async findCompanyUsers(user: AuthUser, query: GetApproverSetupUsersQueryDto): Promise<ApproverSetupUserResponse[]> {
    const companyId = this.getCompanyContext(user);
    const page = Math.max(query.page, 1);
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      memberships: {
        some: {
          companyId,
        },
      },
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return users;
  }

  private getCompanyContext(user: AuthUser) {
    if (!user.companyId) {
      throw new ForbiddenException('An active company context is required.');
    }

    return user.companyId;
  }

  private async assertSetupBelongsToCompany(companyId: number, setupId: string) {
    const setup = await this.prisma.approverSetup.findFirst({
      where: {
        id: setupId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!setup) {
      throw new NotFoundException('Approver setup not found.');
    }
  }

  private async getValidApproverUserIds(companyId: number, userIds: number[]) {
    const approverUserIds = [...new Set(userIds)];
    const existingUsers = await this.prisma.user.findMany({
      where: {
        id: {
          in: approverUserIds,
        },
        memberships: {
          some: {
            companyId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUsers.length !== approverUserIds.length) {
      const existingUserIds = new Set(existingUsers.map((user) => user.id));
      const missingIds = approverUserIds.filter((userId) => !existingUserIds.has(userId));
      throw new BadRequestException(`Approver user ids do not belong to this company: ${missingIds.join(', ')}`);
    }

    return approverUserIds;
  }
}

const ApproverSetupModuleTypeWhere = [
  { type: { array_contains: ['transaction'] } },
  { type: { array_contains: ['Transaction'] } },
] satisfies Prisma.ModuleWhereInput[];

function getApproverSetupValidUntil(dto: CreateApproverSetupDto) {
  if (dto.type.trim() !== 'Temporary') {
    return null;
  }

  if (!dto.validUntil?.trim()) {
    throw new BadRequestException('Enter a valid until date.');
  }

  const validUntil = new Date(`${dto.validUntil.trim().slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(validUntil.getTime())) {
    throw new BadRequestException('Enter a valid until date.');
  }

  return validUntil;
}
