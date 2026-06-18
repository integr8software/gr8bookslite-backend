import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Prisma,
  TransactionNumberInputMode,
  TransactionNumberStatus,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateTransactionNumberSequenceDto } from './dto/update-transaction-number-sequence.dto';
import { mapPlatformSubmoduleTransactionNumberSetup } from './mappers/transaction-number-sequence.mapper';

@Injectable()
export class TransactionNumberSequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findBootstrap(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const [branches, platformSubmodules, sequences] = await Promise.all([
      this.findBranches(companyId),
      this.findTransactionSubmodules(),
      this.findSequences(companyId),
    ]);
    const sequencesByPlatformSubmoduleId =
      groupSequencesByPlatformSubmoduleId(sequences);
    const activeBranchIds = branches.map((branch) => branch.id);

    return {
      branches: branches.map((branch) => ({
        id: branch.id,
        code: branch.code,
        name: branch.name,
      })),
      sequences: platformSubmodules.map((platformSubmodule) =>
        mapPlatformSubmoduleTransactionNumberSetup({
          activeBranchIds,
          platformSubmodule,
          sequences:
            sequencesByPlatformSubmoduleId.get(platformSubmodule.id) ?? [],
        }),
      ),
    };
  }

  async update(
    user: AuthUser,
    platformSubmoduleId: number,
    dto: UpdateTransactionNumberSequenceDto,
  ) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    const [branches, platformSubmodule] = await Promise.all([
      this.findBranches(companyId),
      this.prisma.platformSubmodule.findFirst({
        where: {
          configurationTypes: {
            array_contains: ['Transaction'],
          },
          id: platformSubmoduleId,
          isActive: true,
          module: {
            isActive: true,
          },
        },
        select: {
          code: true,
          id: true,
          name: true,
        },
      }),
    ]);

    if (!platformSubmodule) {
      throw new NotFoundException('Transaction module not found.');
    }

    const branchUnitIds =
      dto.scope === 'all'
        ? branches.map((branch) => branch.id)
        : await this.resolveBranchUnitIds(companyId, dto.branchUnitIds);

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
    } satisfies Omit<
      Prisma.TransactionNumberSequenceUncheckedCreateInput,
      'branchUnitId' | 'platformSubmoduleId'
    >;

    if (data.inputMode === TransactionNumberInputMode.AUTO && !data.prefix) {
      throw new BadRequestException('Complete the numbering setup.');
    }

    await this.prisma.$transaction([
      this.prisma.transactionNumberSequence.deleteMany({
        where: {
          platformSubmoduleId,
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
            platformSubmoduleId_branchUnitId: {
              branchUnitId,
              platformSubmoduleId,
            },
          },
          create: {
            ...data,
            branchUnitId,
            platformSubmoduleId,
          },
          update: data,
        }),
      ),
    ]);

    const updatedSequences =
      await this.prisma.transactionNumberSequence.findMany({
        where: {
          platformSubmoduleId,
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
      sequence: mapPlatformSubmoduleTransactionNumberSetup({
        activeBranchIds: branches.map((branch) => branch.id),
        platformSubmodule,
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
          in: [
            CompanyUnitType.HEAD_OFFICE,
            CompanyUnitType.BRANCH,
            CompanyUnitType.SATELLITE,
          ],
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  private async findTransactionSubmodules() {
    const platformSubmodules = await this.prisma.platformSubmodule.findMany({
      where: {
        configurationTypes: {
          array_contains: ['Transaction'],
        },
        isActive: true,
        module: {
          isActive: true,
        },
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

    return platformSubmodules;
  }

  private async findSequences(companyId: number) {
    return this.prisma.transactionNumberSequence.findMany({
      where: {
        branchUnit: {
          companyId,
        },
      },
      orderBy: [{ platformSubmoduleId: 'asc' }, { branchUnitId: 'asc' }],
    });
  }

  private async resolveBranchUnitIds(
    companyId: number,
    branchUnitIds: number[],
  ) {
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
          in: [
            CompanyUnitType.HEAD_OFFICE,
            CompanyUnitType.BRANCH,
            CompanyUnitType.SATELLITE,
          ],
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

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Admin access is required to manage transaction module numbering.',
      );
    }
  }
}

function mapInputMode(inputMode: 'Auto' | 'Manual') {
  return inputMode === 'Auto'
    ? TransactionNumberInputMode.AUTO
    : TransactionNumberInputMode.MANUAL;
}

function mapStatus(status: 'Active' | 'Inactive') {
  return status === 'Active'
    ? TransactionNumberStatus.ACTIVE
    : TransactionNumberStatus.INACTIVE;
}

function groupSequencesByPlatformSubmoduleId<
  TSequence extends { platformSubmoduleId: number },
>(sequences: TSequence[]) {
  return sequences.reduce((groups, sequence) => {
    const current = groups.get(sequence.platformSubmoduleId) ?? [];

    current.push(sequence);
    groups.set(sequence.platformSubmoduleId, current);

    return groups;
  }, new Map<number, TSequence[]>());
}
