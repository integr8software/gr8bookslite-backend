import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApprovalManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async findTransactionModules() {
    const modules = await this.prisma.module.findMany({
      where: {
        OR: TransactionModuleTypeWhere,
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
}

const TransactionModuleTypeWhere = [
  { type: { array_contains: ['transaction'] } },
  { type: { array_contains: ['Transaction'] } },
] satisfies Prisma.ModuleWhereInput[];
