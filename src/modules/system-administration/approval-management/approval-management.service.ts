import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertApprovalWorkflowDto } from './dto/upsert-approval-workflow.dto';
import {
  ApprovalRuleInclude,
  ApprovalRulePayload,
  mapApprovalRulesToWorkflows,
} from './mappers/approval-workflow.mapper';

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

  async findWorkflows(user: AuthUser) {
    const companyId = this.getCompanyContext(user);
    const db = this.prisma as unknown as ApprovalRulePrismaClient;
    const rules = await db.approvalRule.findMany({
      where: {
        companyId,
      },
      include: ApprovalRuleInclude,
      orderBy: [
        {
          moduleScope: 'asc',
        },
        {
          routeName: 'asc',
        },
      ],
    });

    return {
      workflows: mapApprovalRulesToWorkflows(rules as ApprovalRulePayload[]),
    };
  }

  async upsertWorkflow(user: AuthUser, moduleCodeParam: string, dto: UpsertApprovalWorkflowDto) {
    const companyId = this.getCompanyContext(user);
    const moduleCode = dto.moduleCode.trim();

    if (!moduleCode || moduleCode !== moduleCodeParam.trim()) {
      throw new BadRequestException('Module code does not match the requested workflow.');
    }

    await this.assertTransactionModuleExists(moduleCode);
    await this.assertApproversBelongToCompany(companyId, dto);

    const rules = await this.prisma.$transaction(async (tx) => {
      const approvalTx = tx as unknown as ApprovalRulePrismaClient;

      await approvalTx.approvalRule.deleteMany({
        where: {
          companyId,
          moduleScope: moduleCode,
        },
      });

      const stageBySequence = new Map(dto.stages.map((stage) => [stage.sequence, stage]));
      const selectedApproverIds = [
        ...new Set(dto.stages.flatMap((stage) => stage.approverIds)),
      ];
      const sourceApproverSetupIds = [
        ...new Set(
          dto.stages
            .map((stage) => stage.sourceApproverSetupId?.trim())
            .filter((setupId): setupId is string => Boolean(setupId)),
        ),
      ];
      const sourceApproverSetups = (await approvalTx.approverSetup.findMany({
        where: {
          companyId,
          moduleScope: moduleCode,
          OR: [
            ...(sourceApproverSetupIds.length
              ? [
                  {
                    id: {
                      in: sourceApproverSetupIds,
                    },
                  },
                ]
              : []),
            {
              approvers: {
                some: {
                  userId: {
                    in: selectedApproverIds,
                  },
                },
              },
            },
          ],
        },
        include: {
          approvers: true,
        },
      })) as ApproverSetupWithUsers[];

      const foundSourceApproverSetupIds = new Set(
        sourceApproverSetups.map((setup) => setup.id),
      );

      if (sourceApproverSetupIds.some((setupId) => !foundSourceApproverSetupIds.has(setupId))) {
        throw new BadRequestException('Choose approver setup records that still exist for this module.');
      }

      const sourceApproverSetupById = new Map(
        sourceApproverSetups.map((setup) => [setup.id, setup]),
      );

      const routingRules = dto.routingRules.length
        ? dto.routingRules
        : [
            {
              amountOperator: 'greaterThan',
              amountValue: '',
              basis: 'default' as const,
              name: 'Otherwise',
              sequence: 1,
              stageSequences: [...stageBySequence.keys()].sort(
                (first, second) => first - second,
              ),
            },
          ];

      for (const rule of routingRules.sort((first, second) => first.sequence - second.sequence)) {
        const selectedStages = rule.stageSequences.map((sequence) => stageBySequence.get(sequence));

        if (selectedStages.some((stage) => !stage)) {
          throw new BadRequestException('Choose approval stages that still exist in this workflow.');
        }

        const approvalPath = selectedStages.map((stage, index) => {
            const selectedStage = stage as (typeof dto.stages)[number];
            const userId = selectedStage.approverIds[0];
            const sourceSetupId = selectedStage.sourceApproverSetupId?.trim();
            const sourceSetup = sourceSetupId
              ? sourceApproverSetupById.get(sourceSetupId)
              : sourceApproverSetups.find((setup) =>
                  setup.approvers.some((approver) => approver.userId === userId),
                );

            if (!sourceSetup?.approvers.some((approver) => approver.userId === userId)) {
              throw new BadRequestException('Choose approvers that still belong to the selected approver setup.');
            }

            return {
              approverSetupId: sourceSetup.id,
              userId,
              sequence: index + 1,
            };
          });
        const primaryApproverSetupId = approvalPath[0]?.approverSetupId;

        if (!primaryApproverSetupId) {
          throw new BadRequestException('Choose at least one approval path for every rule.');
        }

        if (new Set(approvalPath.map((entry) => entry.approverSetupId)).size > 1) {
          throw new BadRequestException('Each approval rule must use approvers from one approver setup.');
        }

        await Promise.all(
          approvalPath.map((entry) =>
            approvalTx.approverSetupUser.updateMany({
              where: {
                approverSetupId: entry.approverSetupId,
                userId: entry.userId,
              },
              data: {
                sequence: entry.sequence,
              },
            }),
          ),
        );

        await approvalTx.approvalRule.create({
          data: {
            companyId,
            approverSetupId: primaryApproverSetupId,
            ruleType: rule.basis,
            routeName: rule.name.trim(),
            amountRule: rule.amountOperator,
            amount: rule.amountValue?.trim() ?? '',
            moduleScope: moduleCode,
            moduleName: dto.moduleName.trim(),
            status: dto.status.trim(),
            description: dto.description?.trim() ?? '',
          },
        });
      }

      return approvalTx.approvalRule.findMany({
        where: {
          companyId,
          moduleScope: moduleCode,
        },
        include: ApprovalRuleInclude,
        orderBy: {
          routeName: 'asc',
        },
      });
    });

    const [workflow] = mapApprovalRulesToWorkflows(rules as ApprovalRulePayload[]);

    return {
      message: 'Approval workflow saved.',
      workflow,
    };
  }

  async inactivateWorkflow(user: AuthUser, workflowId: string) {
    const companyId = this.getCompanyContext(user);
    const moduleScope = workflowId.trim();
    const db = this.prisma as unknown as ApprovalRulePrismaClient;
    const existingRule = await db.approvalRule.findFirst({
      where: {
        companyId,
        moduleScope,
      },
      select: {
        id: true,
      },
    });

    if (!existingRule) {
      throw new NotFoundException('Approval workflow not found.');
    }

    await db.approvalRule.updateMany({
      where: {
        companyId,
        moduleScope,
      },
      data: {
        status: 'Inactive',
      },
    });

    const rules = await db.approvalRule.findMany({
      where: {
        companyId,
        moduleScope,
      },
      include: ApprovalRuleInclude,
      orderBy: {
        routeName: 'asc',
      },
    });
    const [workflow] = mapApprovalRulesToWorkflows(rules as ApprovalRulePayload[]);

    return workflow;
  }

  async findTransactions(user: AuthUser) {
    const companyId = this.getCompanyContext(user);

    await this.ensureApprovalTransactions(companyId);

    const db = this.prisma as unknown as ApprovalRulePrismaClient;
    const transactions = await db.approvalTransaction.findMany({
      where: {
        companyId,
      },
      include: ApprovalTransactionInclude,
      orderBy: [
        {
          moduleScope: 'asc',
        },
        {
          referenceNo: 'asc',
        },
      ],
    });

    return {
      transactions: transactions.map((transaction) =>
        mapApprovalTransaction(transaction as ApprovalTransactionPayload, user.id),
      ),
    };
  }

  async approveTransaction(user: AuthUser, transactionId: string) {
    const companyId = this.getCompanyContext(user);
    const db = this.prisma as unknown as ApprovalRulePrismaClient;
    const transaction = await db.approvalTransaction.findFirst({
      where: {
        id: transactionId,
        companyId,
      },
      include: ApprovalTransactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Approval transaction not found.');
    }

    const approvalTransaction = transaction as ApprovalTransactionPayload;
    const approvers = [...approvalTransaction.approvers].sort(
      (first, second) => first.sequence - second.sequence,
    );
    const currentApprover = approvers.find((approver) => approver.status !== ApprovalStatusApproved);
    const selectedApprover = approvers.find((approver) => approver.userId === user.id);
    const isSequential = isSequentialApprovalRule(approvalTransaction.rule.ruleType);

    if (!currentApprover) {
      throw new BadRequestException('This transaction is already approved.');
    }

    if (!selectedApprover || selectedApprover.status === ApprovalStatusApproved) {
	  throw new BadRequestException('You are not a pending approver for this transaction.');
	}

    if (isSequential && currentApprover.userId !== user.id) {
      throw new BadRequestException(`Waiting for ${currentApprover.user.name} to approve first.`);
    }

    await db.approvalTransactionApprover.update({
      where: {
        transactionId_userId: {
          transactionId,
          userId: user.id,
        },
      },
      data: {
        approvedAt: new Date(),
        status: ApprovalStatusApproved,
      },
    });

    const pendingApproverCount = approvers.filter(
      (approver) => approver.userId !== user.id && approver.status !== ApprovalStatusApproved,
    ).length;
    await db.approvalTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status: pendingApproverCount === 0 ? ApprovalStatusApproved : ApprovalStatusForApproval,
      },
    });

    const updatedTransaction = await db.approvalTransaction.findFirst({
      where: {
        id: transactionId,
        companyId,
      },
      include: ApprovalTransactionInclude,
    });

    if (!updatedTransaction) {
      throw new NotFoundException('Approval transaction not found.');
    }

    return mapApprovalTransaction(updatedTransaction as ApprovalTransactionPayload, user.id);
  }

  async disapproveTransaction(user: AuthUser, transactionId: string) {
    const companyId = this.getCompanyContext(user);
    const db = this.prisma as unknown as ApprovalRulePrismaClient;
    const transaction = await db.approvalTransaction.findFirst({
      where: {
        id: transactionId,
        companyId,
      },
      include: ApprovalTransactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Approval transaction not found.');
    }

    const approvalTransaction = transaction as ApprovalTransactionPayload;
    const approvers = [...approvalTransaction.approvers].sort(
      (first, second) => first.sequence - second.sequence,
    );
    const currentApprover = approvers.find((approver) => approver.status !== ApprovalStatusApproved);
    const selectedApprover = approvers.find((approver) => approver.userId === user.id);
    const isSequential = isSequentialApprovalRule(approvalTransaction.rule.ruleType);

    if (!currentApprover) {
      throw new BadRequestException('This transaction is already approved.');
    }

    if (!selectedApprover || selectedApprover.status === ApprovalStatusApproved) {
	  throw new BadRequestException('You are not a pending approver for this transaction.');
	}

    if (isSequential && currentApprover.userId !== user.id) {
      throw new BadRequestException(`Waiting for ${currentApprover.user.name} to approve first.`);
    }

    await db.approvalTransactionApprover.update({
      where: {
        transactionId_userId: {
          transactionId,
          userId: user.id,
        },
      },
      data: {
        approvedAt: new Date(),
        status: ApprovalStatusDisapproved,
      },
    });

    await db.approvalTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status: ApprovalStatusDisapproved,
      },
    });

    const updatedTransaction = await db.approvalTransaction.findFirst({
      where: {
        id: transactionId,
        companyId,
      },
      include: ApprovalTransactionInclude,
    });

    if (!updatedTransaction) {
      throw new NotFoundException('Approval transaction not found.');
    }

    return mapApprovalTransaction(updatedTransaction as ApprovalTransactionPayload, user.id);
  }

  private async assertTransactionModuleExists(moduleCode: string) {
    const module = await this.prisma.module.findFirst({
      where: {
        code: moduleCode,
        OR: TransactionModuleTypeWhere,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!module) {
      throw new BadRequestException('Select a valid transaction module.');
    }
  }

  private async assertApproversBelongToCompany(companyId: number, dto: UpsertApprovalWorkflowDto) {
    const approverIds = [
      ...new Set(dto.stages.flatMap((stage) => stage.approverIds)),
    ];
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: approverIds,
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

    if (users.length !== approverIds.length) {
      const existingUserIds = new Set(users.map((approver) => approver.id));
      const missingIds = approverIds.filter((approverId) => !existingUserIds.has(approverId));

      throw new BadRequestException(`Approver user ids do not belong to this company: ${missingIds.join(', ')}`);
    }
  }

  private getCompanyContext(user: AuthUser) {
    if (!user.companyId) {
      throw new ForbiddenException('An active company context is required.');
    }

    return user.companyId;
  }

  private async ensureApprovalTransactions(companyId: number) {
    const db = this.prisma as unknown as ApprovalRulePrismaClient;
    const rules = await db.approvalRule.findMany({
      where: {
        companyId,
        status: 'Active',
      },
      include: ApprovalRuleInclude,
      orderBy: [
        {
          moduleScope: 'asc',
        },
        {
          routeName: 'asc',
        },
      ],
    });

    for (const rule of rules as ApprovalRuleSeedPayload[]) {
      const approvalPath = getRuleApprovalPath(rule);

      if (approvalPath.length === 0) {
        continue;
      }

      for (const index of [1, 2, 3]) {
        const referenceNo = `${rule.moduleScope}-${String(2600 + index).padStart(4, '0')}`;
        const existingTransaction = await db.approvalTransaction.findFirst({
          where: {
            companyId,
            moduleScope: rule.moduleScope,
            referenceNo,
          },
          select: {
            id: true,
          },
        });

        if (existingTransaction) {
          continue;
        }

        await db.approvalTransaction.create({
          data: {
            amount: createSeedTransactionAmount(rule.amount, index),
            companyId,
            moduleScope: rule.moduleScope,
            referenceNo,
            ruleId: rule.id,
            status: ApprovalStatusForApproval,
            approvers: {
              create: approvalPath.map((pathEntry) => ({
                userId: pathEntry.userId,
                sequence: pathEntry.sequence,
                status: ApprovalStatusPending,
              })),
            },
          },
        });
      }
    }
  }
}

const TransactionModuleTypeWhere = [
  { type: { array_contains: ['transaction'] } },
  { type: { array_contains: ['Transaction'] } },
] satisfies Prisma.ModuleWhereInput[];

type ApprovalRulePrismaClient = {
  approvalRule: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    findFirst: (args: Record<string, unknown>) => Promise<{ id: string } | null>;
    create: (args: Record<string, unknown>) => Promise<unknown>;
    updateMany: (args: Record<string, unknown>) => Promise<unknown>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  approverSetup: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  approverSetupUser: {
    updateMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  approvalTransaction: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
    findFirst: (args: Record<string, unknown>) => Promise<unknown | null>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  approvalTransactionApprover: {
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

type ApproverSetupWithUsers = {
  id: string;
  approvers: Array<{
    userId: number;
  }>;
};

const ApprovalStatusApproved = 'Approved';
const ApprovalStatusDisapproved = 'Disapproved';
const ApprovalStatusForApproval = 'For Approval';
const ApprovalStatusPending = 'Pending';

const ApprovalTransactionInclude = {
  approvers: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      sequence: 'asc',
    },
  },
  rule: true,
};

type ApprovalRuleSeedPayload = {
  id: string;
  amount: string;
  moduleScope: string;
  routeName: string;
  approverSetup: {
    approvers: Array<{
      sequence: number;
      userId: number;
    }>;
  };
};

type ApprovalTransactionPayload = {
  id: string;
  amount: Prisma.Decimal | number | string;
  moduleScope: string;
  referenceNo: string;
  status: string;
  createdAt: Date;
  rule: {
    id: string;
    ruleType: string;
    routeName: string;
    moduleName: string;
    moduleScope: string;
  };
  approvers: Array<{
    userId: number;
    sequence: number;
    status: string;
    approvedAt: Date | null;
    user: {
      id: number;
      name: string;
    };
  }>;
};

type RuleApprovalPathEntry = {
  sequence: number;
  userId: number;
};

function getRuleApprovalPath(rule: ApprovalRuleSeedPayload): RuleApprovalPathEntry[] {
	return rule.approverSetup.approvers
		.map((approver) => ({
			sequence: approver.sequence,
			userId: approver.userId,
		}))
		.sort((first, second) => first.sequence - second.sequence);
}

function createSeedTransactionAmount(amountValue: string, index: number) {
  const baseAmount = Number(amountValue.replaceAll(',', '').trim());
  const amount = Number.isFinite(baseAmount) && baseAmount > 0
    ? baseAmount + index * 1250
    : 10000 + index * 2750;

  return new Prisma.Decimal(amount);
}

function mapApprovalTransaction(transaction: ApprovalTransactionPayload, currentUserId: number) {
  const approvers = [...transaction.approvers].sort(
    (first, second) => first.sequence - second.sequence,
  );
  const isTerminal = transaction.status === ApprovalStatusApproved || transaction.status === ApprovalStatusDisapproved;
  const firstPendingApprover = isTerminal
    ? undefined
    : approvers.find((approver) => approver.status !== ApprovalStatusApproved);
  const selectedApprover = approvers.find((approver) => approver.userId === currentUserId);
  const isSequential = isSequentialApprovalRule(transaction.rule.ruleType);
  const canCurrentUserAct = Boolean(
    !isTerminal &&
    selectedApprover?.status !== ApprovalStatusApproved &&
    (!isSequential || firstPendingApprover?.userId === currentUserId),
  );
  const currentApprover = isSequential
    ? firstPendingApprover
    : canCurrentUserAct
      ? selectedApprover
      : firstPendingApprover;

  return {
    id: transaction.id,
    amount: transaction.amount.toString(),
    moduleScope: transaction.moduleScope,
    moduleName: transaction.rule.moduleName || transaction.rule.moduleScope,
    referenceNo: transaction.referenceNo,
    requestedAt: transaction.createdAt,
    ruleId: transaction.rule.id,
    ruleName: transaction.rule.routeName,
    status: transaction.status,
    canUpdateStatus: canCurrentUserAct,
    blockerName: isSequential && !canCurrentUserAct ? firstPendingApprover?.user.name : undefined,
    currentApproverId: currentApprover?.userId ?? null,
    approvers: approvers.map((approver) => ({
      approvedAt: approver.approvedAt,
      name: approver.user.name,
      sequence: approver.sequence,
      status: approver.status,
      userId: approver.userId,
    })),
  };
}

function isSequentialApprovalRule(ruleType: string) {
  return ruleType === 'amount';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
