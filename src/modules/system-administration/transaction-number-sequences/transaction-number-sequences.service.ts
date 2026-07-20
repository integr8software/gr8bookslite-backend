import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyUnitType, MembershipRole, MembershipStatus, Prisma, TransactionNumberInputMode, TransactionNumberStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateTransactionNumberSequenceDto } from './dto/update-transaction-number-sequence.dto';
import { mapModuleTransactionNumberSetup } from './mappers/transaction-number-sequence.mapper';
export {
  findTransactionNumberForCompanyBranch,
  formatTransactionNumber,
  generateTransactionNumberForCompanyBranch,
} from './transaction-number-sequence.helper';

@Injectable()
export class TransactionNumberSequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findBootstrap(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const [branches, modules, sequences] = await Promise.all([this.findBranches(companyId), this.findTransactionSubmodules(), this.findSequences(companyId)]);
    const sequencesByModuleId = groupSequencesByModuleId(sequences);
    const activeBranchIds = branches.map((branch) => branch.id);

    return {
      branches: branches.map((branch) => ({
        id: branch.id,
        code: branch.code,
        name: branch.name,
      })),
      sequences: modules.map((module) =>
        mapModuleTransactionNumberSetup({
          activeBranchIds,
          module,
          sequences: sequencesByModuleId.get(module.id) ?? [],
        }),
      ),
    };
  }

  async update(user: AuthUser, moduleId: number, dto: UpdateTransactionNumberSequenceDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    const [branches, module] = await Promise.all([
      this.findBranches(companyId),
      this.prisma.module.findFirst({
        where: {
          OR: RegistryModuleTypeWhere,
          id: moduleId,
          isActive: true,
        },
        select: {
          code: true,
          id: true,
          name: true,
        },
      }),
    ]);

    if (!module) {
      throw new NotFoundException('Transaction module not found.');
    }

    const branchUnitIds = dto.scope === 'all' ? branches.map((branch) => branch.id) : await this.resolveBranchUnitIds(companyId, dto.branchUnitIds);

    if (branchUnitIds.length === 0) {
      throw new BadRequestException('Select at least one branch.');
    }

    const currentNumber = Math.max(dto.currentNumber, dto.startingNumber);
    const data = {
      currentNumber,
      inputMode: mapInputMode(dto.inputMode),
      padding: dto.padding,
      prefix: dto.prefix.trim(),
      startingNumber: dto.startingNumber,
      status: mapStatus(dto.status),
      suffix: dto.suffix?.trim() ?? '',
    } satisfies Omit<Prisma.TransactionNumberSequenceUncheckedCreateInput, 'branchUnitId' | 'moduleId'>;

    if (data.inputMode === TransactionNumberInputMode.AUTO && !data.prefix) {
      throw new BadRequestException('Complete the numbering setup.');
    }

    await this.prisma.$transaction([
      this.prisma.transactionNumberSequence.deleteMany({
        where: {
          moduleId,
          branchUnit: {
            companyId,
          },
          branchUnitId: {
            notIn: branchUnitIds,
          },
        },
      }),
      ...branchUnitIds.map((branchUnitId) =>
        this.prisma.transactionNumberSequence.upsert({
          where: {
            moduleId_branchUnitId: {
              branchUnitId,
              moduleId,
            },
          },
          create: {
            ...data,
            branchUnitId,
            moduleId,
          },
          update: data,
        }),
      ),
    ]);

    const updatedSequences = await this.prisma.transactionNumberSequence.findMany({
      where: {
        moduleId,
        branchUnit: {
          companyId,
        },
      },
      orderBy: {
        branchUnitId: 'asc',
      },
    });

    return {
      message: 'Transaction number setup updated.',
      sequence: mapModuleTransactionNumberSetup({
        activeBranchIds: branches.map((branch) => branch.id),
        module,
        sequences: updatedSequences,
      }),
    };
  }

  private async findBranches(companyId: number) {
    return this.prisma.companyUnit.findMany({
      where: {
        companyId,
        isActive: true,
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  private async findTransactionSubmodules() {
    const modules = await this.prisma.module.findMany({
      where: {
        OR: RegistryModuleTypeWhere,
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

    return modules;
  }

  private async findSequences(companyId: number) {
    return this.prisma.transactionNumberSequence.findMany({
      where: {
        branchUnit: {
          companyId,
        },
      },
      orderBy: [{ moduleId: 'asc' }, { branchUnitId: 'asc' }],
    });
  }

  private async resolveBranchUnitIds(companyId: number, branchUnitIds: number[]) {
    const uniqueBranchUnitIds = [...new Set(branchUnitIds)];

    if (uniqueBranchUnitIds.length !== 1) {
      throw new BadRequestException('Select one branch.');
    }

    const branches = await this.prisma.companyUnit.findMany({
      where: {
        id: {
          in: uniqueBranchUnitIds,
        },
        companyId,
        isActive: true,
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
        },
      },
      select: {
        id: true,
      },
    });

    if (branches.length !== uniqueBranchUnitIds.length) {
      throw new BadRequestException('Select an active branch.');
    }

    return uniqueBranchUnitIds;
  }

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new NotFoundException('Company not found.');
    }
  }

  private async ensureCompanyAdminAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE || membership.role !== MembershipRole.ADMIN) {
      throw new ForbiddenException('Admin access is required to manage transaction module numbering.');
    }
  }
}

const RegistryModuleTypeWhere = [{ type: { array_contains: ['registry'] } }, { type: { array_contains: ['Registry'] } }] satisfies Prisma.ModuleWhereInput[];

function mapInputMode(inputMode: 'Auto' | 'Manual') {
  return inputMode === 'Auto' ? TransactionNumberInputMode.AUTO : TransactionNumberInputMode.MANUAL;
}

function mapStatus(status: 'Active' | 'Inactive') {
  return status === 'Active' ? TransactionNumberStatus.ACTIVE : TransactionNumberStatus.INACTIVE;
}

function groupSequencesByModuleId<TSequence extends { moduleId: number }>(sequences: TSequence[]) {
  return sequences.reduce((groups, sequence) => {
    const current = groups.get(sequence.moduleId) ?? [];

    current.push(sequence);
    groups.set(sequence.moduleId, current);

    return groups;
  }, new Map<number, TSequence[]>());
}
