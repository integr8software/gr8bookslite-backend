import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountsPayableVoucherStatus,
  AcknowledgementReceiptStatus,
  BillingInvoiceStatus,
  BillingStatementStatus,
  BillingStatus,
  CollectionReceiptStatus,
  JournalVoucherStatus,
  OfficialReceiptStatus,
  Prisma,
  ProvisionalReceiptStatus,
  ServiceInvoiceStatus,
} from '@prisma/client';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalTransactionActionDto } from './dto/approval-transaction-action.dto';
import { UpsertApprovalWorkflowDto } from './dto/upsert-approval-workflow.dto';
import { ApprovalRuleInclude, ApprovalRulePayload, mapApprovalRulesToWorkflows } from './mappers/approval-workflow.mapper';

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
    const db = this.approvalDb(this.prisma);
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
      const approvalTx = this.approvalDb(tx);

      await approvalTx.approvalRule.deleteMany({
        where: {
          companyId,
          moduleScope: moduleCode,
        },
      });

      const stageBySequence = new Map(dto.stages.map((stage) => [stage.sequence, stage]));
      const selectedApproverIds = [...new Set(dto.stages.flatMap((stage) => stage.approverIds))];
      const sourceApproverSetupIds = [
        ...new Set(dto.stages.map((stage) => stage.sourceApproverSetupId?.trim()).filter((setupId): setupId is string => Boolean(setupId))),
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

      const foundSourceApproverSetupIds = new Set(sourceApproverSetups.map((setup) => setup.id));

      if (sourceApproverSetupIds.some((setupId) => !foundSourceApproverSetupIds.has(setupId))) {
        throw new BadRequestException('Choose approver setup records that still exist for this module.');
      }

      const sourceApproverSetupById = new Map(sourceApproverSetups.map((setup) => [setup.id, setup]));

      const routingRules = dto.routingRules.length
        ? dto.routingRules
        : [
            {
              amountOperator: 'greaterThan',
              amountValue: '',
              basis: 'default' as const,
              name: 'Otherwise',
              sequence: 1,
              stageSequences: [...stageBySequence.keys()].sort((first, second) => first - second),
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
            : sourceApproverSetups.find((setup) => setup.approvers.some((approver) => approver.userId === userId));

          if (!sourceSetup?.approvers.some((approver) => approver.userId === userId)) {
            throw new BadRequestException('Choose approvers that still belong to the selected approver setup.');
          }

          return {
            approverSetupId: sourceSetup.id,
            sequence: index + 1,
            userId,
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
            amount: rule.amountValue?.trim() ?? '',
            amountRule: rule.amountOperator,
            approverSetupId: primaryApproverSetupId,
            companyId,
            description: dto.description?.trim() ?? '',
            moduleName: dto.moduleName.trim(),
            moduleScope: moduleCode,
            routeName: rule.name.trim(),
            ruleType: rule.basis,
            status: dto.status.trim(),
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
    const db = this.approvalDb(this.prisma);
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
    const headers = await this.findPendingJournalHeaders(companyId);
    const rulesByScope = await this.findActiveRulesByScope(companyId, [...new Set(headers.map((header) => header.referenceType))]);
    const apvAmounts = await this.findAccountsPayableVoucherAmounts(companyId, headers);
    const sourceReferenceNos = await this.findSourceTransactionReferenceNos(companyId, headers);
    const transactions: Array<ReturnType<typeof mapApprovalContext>> = [];

    for (const header of headers) {
      const context = await this.buildApprovalContext(this.prisma, companyId, header, rulesByScope, apvAmounts, sourceReferenceNos);

      if (context) {
        transactions.push(mapApprovalContext(context, user.id));
      }
    }

    return { transactions };
  }

  async approveTransaction(user: AuthUser, transactionId: string, dto: ApprovalTransactionActionDto = {}) {
    const companyId = this.getCompanyContext(user);
    const context = await this.getApprovalContextForAction(companyId, transactionId);
    const remarks = normalizeApprovalActionRemarks(dto.remarks);
    const approvers = [...context.progress.approvers].sort((first, second) => first.sequence - second.sequence);
    const currentApprover = approvers.find((approver) => approver.status !== ApprovalStatusApproved);
    const selectedApprover = approvers.find((approver) => approver.userId === user.id);
    const isSequential = isSequentialApprovalRule(context.rule.ruleType);

    this.assertUserCanAct({
      action: 'approve',
      currentApprover,
      isSequential,
      selectedApprover,
    });

    const now = new Date();
    const willComplete = approvers.every((approver) => approver.userId === user.id || approver.status === ApprovalStatusApproved);

    await this.prisma.$transaction(async (tx) => {
      const approvalTx = this.approvalDb(tx);

      await approvalTx.approvalTransactionApprover.update({
        where: {
          transactionId_userId: {
            transactionId: context.progress.id,
            userId: user.id,
          },
        },
        data: {
          approvedAt: now,
          remarks,
          status: ApprovalStatusApproved,
        },
      });

      await approvalTx.approvalTransaction.update({
        where: {
          id: context.progress.id,
        },
        data: {
          status: willComplete ? ApprovalStatusApproved : ApprovalStatusForApproval,
        },
      });

      if (willComplete) {
        await this.syncApprovedSourceTransaction(tx, context.header, user.id, now);
      }
    });

    return this.mapUpdatedApprovalTransaction(context, user.id);
  }

  async disapproveTransaction(user: AuthUser, transactionId: string, dto: ApprovalTransactionActionDto = {}) {
    const companyId = this.getCompanyContext(user);
    const context = await this.getApprovalContextForAction(companyId, transactionId);
    const remarks = normalizeApprovalActionRemarks(dto.remarks);
    const approvers = [...context.progress.approvers].sort((first, second) => first.sequence - second.sequence);
    const currentApprover = approvers.find((approver) => approver.status !== ApprovalStatusApproved);
    const selectedApprover = approvers.find((approver) => approver.userId === user.id);
    const isSequential = isSequentialApprovalRule(context.rule.ruleType);

    this.assertUserCanAct({
      action: 'disapprove',
      currentApprover,
      isSequential,
      selectedApprover,
    });

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const approvalTx = this.approvalDb(tx);

      await approvalTx.approvalTransactionApprover.update({
        where: {
          transactionId_userId: {
            transactionId: context.progress.id,
            userId: user.id,
          },
        },
        data: {
          approvedAt: now,
          remarks,
          status: ApprovalStatusDisapproved,
        },
      });

      await approvalTx.approvalTransaction.update({
        where: {
          id: context.progress.id,
        },
        data: {
          status: ApprovalStatusDisapproved,
        },
      });

      await this.syncDisapprovedSourceTransaction(tx, context.header, user.id, now);
    });

    return this.mapUpdatedApprovalTransaction(context, user.id);
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
    const approverIds = [...new Set(dto.stages.flatMap((stage) => stage.approverIds))];
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

  private async findPendingJournalHeaders(companyId: number) {
    const db = this.approvalDb(this.prisma);

    return (await db.journalEntryHeader.findMany({
      where: {
        companyId,
        referenceType: {
          in: SupportedApprovalSourceScopes,
        },
        status: ApprovalStatusForApproval,
      },
      select: JournalEntryHeaderSelect,
      orderBy: [
        {
          transactionDate: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    })) as JournalEntryHeaderPayload[];
  }

  private async findActiveRulesByScope(companyId: number, scopes: string[]) {
    if (!scopes.length) {
      return new Map<string, ApprovalRulePayload[]>();
    }

    const db = this.approvalDb(this.prisma);
    const rules = (await db.approvalRule.findMany({
      where: {
        companyId,
        moduleScope: {
          in: scopes,
        },
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
    })) as ApprovalRulePayload[];
    const rulesByScope = new Map<string, ApprovalRulePayload[]>();

    for (const rule of rules) {
      rulesByScope.set(rule.moduleScope, [...(rulesByScope.get(rule.moduleScope) ?? []), rule]);
    }

    return rulesByScope;
  }

  private async findAccountsPayableVoucherAmounts(companyId: number, headers: JournalEntryHeaderPayload[]) {
    const apvIds = headers.filter((header) => header.referenceType === AccountsPayableVoucherReferenceType).map((header) => header.referenceId);

    if (!apvIds.length) {
      return new Map<string, Prisma.Decimal>();
    }

    const db = this.approvalDb(this.prisma);
    const vouchers = (await db.accountsPayableVoucher.findMany({
      where: {
        apvId: {
          in: apvIds,
        },
        companyId,
      },
      select: {
        amount: true,
        apvId: true,
      },
    })) as Array<{ amount: Prisma.Decimal; apvId: bigint }>;

    return new Map(vouchers.map((voucher) => [voucher.apvId.toString(), voucher.amount]));
  }

  private async findSourceTransactionReferenceNos(companyId: number, headers: JournalEntryHeaderPayload[]) {
    const db = this.approvalDb(this.prisma);
    const referenceNos = new Map<string, string>();
    const apvIds = headers.filter((header) => header.referenceType === 'APV').map((header) => header.referenceId);
    const jvIds = headers.filter((header) => header.referenceType === 'JV').map((header) => header.referenceId);

    if (apvIds.length) {
      const vouchers = (await db.accountsPayableVoucher.findMany({
        where: {
          apvId: {
            in: apvIds,
          },
          companyId,
        },
        select: {
          apvId: true,
          transactionNo: true,
        },
      })) as Array<{ apvId: bigint; transactionNo: string }>;

      for (const voucher of vouchers) {
        referenceNos.set(getSourceReferenceKey('APV', voucher.apvId), voucher.transactionNo);
      }
    }

    if (jvIds.length) {
      const vouchers = (await db.journalVoucher.findMany({
        where: {
          companyId,
          id: {
            in: jvIds,
          },
        },
        select: {
          id: true,
          transactionNo: true,
        },
      })) as Array<{ id: bigint; transactionNo: string }>;

      for (const voucher of vouchers) {
        referenceNos.set(getSourceReferenceKey('JV', voucher.id), voucher.transactionNo);
      }
    }

    return referenceNos;
  }

  private async buildApprovalContext(
    client: unknown,
    companyId: number,
    header: JournalEntryHeaderPayload,
    rulesByScope: Map<string, ApprovalRulePayload[]>,
    apvAmounts: Map<string, Prisma.Decimal>,
    sourceReferenceNos: Map<string, string>,
  ): Promise<ApprovalContext | null> {
    const amount = this.getApprovalAmount(header, apvAmounts);

    if (!amount) {
      return null;
    }

    const rule = findMatchingApprovalRule(rulesByScope.get(header.referenceType) ?? [], amount);
    const approvalPath = rule ? getRuleApprovalPath(rule) : [];

    if (!rule || !approvalPath.length) {
      return null;
    }

    const progress = await this.ensureApprovalProgress(client, companyId, header, rule, amount, approvalPath);

    return {
      amount,
      displayReferenceNo: getJournalEntryDisplayReferenceNo(header, sourceReferenceNos),
      header,
      progress,
      rule,
    };
  }

  private getApprovalAmount(header: JournalEntryHeaderPayload, apvAmounts: Map<string, Prisma.Decimal>) {
    if (header.referenceType !== AccountsPayableVoucherReferenceType) {
      return new Prisma.Decimal(header.totalDebit);
    }

    const amount = apvAmounts.get(header.referenceId.toString());

    return amount ? new Prisma.Decimal(amount) : null;
  }

  private async ensureApprovalProgress(
    client: unknown,
    companyId: number,
    header: JournalEntryHeaderPayload,
    rule: ApprovalRulePayload,
    amount: Prisma.Decimal,
    approvalPath: RuleApprovalPathEntry[],
  ) {
    const db = this.approvalDb(client);
    const referenceNo = getApprovalStateReferenceNo(header);
    const existing = (await db.approvalTransaction.findFirst({
      where: {
        companyId,
        moduleScope: header.referenceType,
        referenceNo,
      },
      include: ApprovalTransactionInclude,
    })) as ApprovalTransactionPayload | null;

    if (!existing) {
      return (await db.approvalTransaction.create({
        data: {
          amount,
          companyId,
          moduleScope: header.referenceType,
          referenceNo,
          ruleId: rule.id,
          status: ApprovalStatusForApproval,
          approvers: {
            create: approvalPath.map((approver) => ({
              sequence: approver.sequence,
              status: ApprovalStatusPending,
              userId: approver.userId,
            })),
          },
        },
        include: ApprovalTransactionInclude,
      })) as ApprovalTransactionPayload;
    }

    const shouldReset = existing.rule.id !== rule.id || isTerminalApprovalStatus(existing.status) || !hasSameApprovalPath(existing.approvers, approvalPath);

    await db.approvalTransaction.update({
      where: {
        id: existing.id,
      },
      data: {
        amount,
        ruleId: rule.id,
        status: shouldReset ? ApprovalStatusForApproval : existing.status,
      },
    });

    if (shouldReset) {
      await db.approvalTransactionApprover.deleteMany({
        where: {
          transactionId: existing.id,
        },
      });
      await db.approvalTransactionApprover.createMany({
        data: approvalPath.map((approver) => ({
          sequence: approver.sequence,
          status: ApprovalStatusPending,
          transactionId: existing.id,
          userId: approver.userId,
        })),
      });
    }

    const updated = await db.approvalTransaction.findFirst({
      where: {
        id: existing.id,
        companyId,
      },
      include: ApprovalTransactionInclude,
    });

    if (!updated) {
      throw new NotFoundException('Approval transaction not found.');
    }

    return updated as ApprovalTransactionPayload;
  }

  private async getApprovalContextForAction(companyId: number, transactionId: string) {
    const headerId = parseJournalEntryHeaderId(transactionId);
    const db = this.approvalDb(this.prisma);
    const header = (await db.journalEntryHeader.findFirst({
      where: {
        companyId,
        id: headerId,
      },
      select: JournalEntryHeaderSelect,
    })) as JournalEntryHeaderPayload | null;

    if (!header) {
      throw new NotFoundException('Approval transaction not found.');
    }

    if (header.status !== ApprovalStatusForApproval) {
      throw new BadRequestException('This transaction is no longer pending approval.');
    }

    if (!isSupportedApprovalSourceScope(header.referenceType)) {
      throw new BadRequestException(`Approval actions are not supported yet for ${header.referenceType}.`);
    }

    const rulesByScope = await this.findActiveRulesByScope(companyId, [header.referenceType]);
    const apvAmounts = await this.findAccountsPayableVoucherAmounts(companyId, [header]);
    const sourceReferenceNos = await this.findSourceTransactionReferenceNos(companyId, [header]);
    const context = await this.buildApprovalContext(this.prisma, companyId, header, rulesByScope, apvAmounts, sourceReferenceNos);

    if (!context) {
      throw new BadRequestException('No active approval workflow applies to this transaction.');
    }

    return context;
  }

  private assertUserCanAct({
    currentApprover,
    isSequential,
    selectedApprover,
  }: {
    action: 'approve' | 'disapprove';
    currentApprover: ApprovalTransactionApproverPayload | undefined;
    isSequential: boolean;
    selectedApprover: ApprovalTransactionApproverPayload | undefined;
  }) {
    if (!currentApprover) {
      throw new BadRequestException('This transaction is already approved.');
    }

    if (!selectedApprover || selectedApprover.status !== ApprovalStatusPending) {
      throw new BadRequestException('You are not a pending approver for this transaction.');
    }

    if (isSequential && currentApprover.userId !== selectedApprover.userId) {
      throw new BadRequestException(`Waiting for ${currentApprover.user.name} to approve first.`);
    }
  }

  private async syncApprovedSourceTransaction(client: unknown, header: JournalEntryHeaderPayload, userId: number, now: Date) {
    const db = this.approvalDb(client);
    const data = getApprovedSourceTransactionData(header.referenceType, userId, now);
    const result = await updateSourceTransaction(db, header, data);

    if (result.count === 0) {
      throw new NotFoundException('Source transaction not found.');
    }

    await db.journalEntryHeader.update({
      where: {
        id: header.id,
      },
      data: {
        status: JournalEntryStatusPosted,
      },
    });
  }

  private async syncDisapprovedSourceTransaction(client: unknown, header: JournalEntryHeaderPayload, userId: number, now: Date) {
    const db = this.approvalDb(client);
    const data = getDisapprovedSourceTransactionData(header.referenceType, userId, now);
    const result = await updateSourceTransaction(db, header, data);

    if (result.count === 0) {
      throw new NotFoundException('Source transaction not found.');
    }

    await db.journalEntryHeader.update({
      where: {
        id: header.id,
      },
      data: {
        status: ApprovalStatusDisapproved,
      },
    });
  }

  private async mapUpdatedApprovalTransaction(context: ApprovalContext, currentUserId: number) {
    const db = this.approvalDb(this.prisma);
    const updated = (await db.approvalTransaction.findFirst({
      where: {
        id: context.progress.id,
        companyId: context.header.companyId,
      },
      include: ApprovalTransactionInclude,
    })) as ApprovalTransactionPayload | null;

    if (!updated) {
      throw new NotFoundException('Approval transaction not found.');
    }

    return mapApprovalContext(
      {
        amount: new Prisma.Decimal(updated.amount),
        displayReferenceNo: context.displayReferenceNo,
        header: context.header,
        progress: updated,
        rule: updated.rule,
      },
      currentUserId,
    );
  }

  private approvalDb(client: unknown) {
    return client as ApprovalManagementPrismaClient;
  }
}

const AccountsPayableVoucherReferenceType = 'APV';
const JournalEntryStatusPosted = 'Posted';
const ApprovalStatusApproved = 'Approved';
const ApprovalStatusDisapproved = 'Disapproved';
const ApprovalStatusForApproval = 'For Approval';
const ApprovalStatusPending = 'Pending';
const ApprovalActionRemarksMaxLength = 500;

const SupportedApprovalSourceScopes = ['APV', 'JV', 'SI', 'OR', 'CR', 'AR', 'PVR', 'BI', 'BILL', 'BS'] as const;
type SupportedApprovalSourceScope = (typeof SupportedApprovalSourceScopes)[number];

function isSupportedApprovalSourceScope(referenceType: string): referenceType is SupportedApprovalSourceScope {
  return (SupportedApprovalSourceScopes as readonly string[]).includes(referenceType);
}

const TransactionModuleTypeWhere = [
  { type: { array_contains: ['transaction'] } },
  { type: { array_contains: ['Transaction'] } },
] satisfies Prisma.ModuleWhereInput[];

const JournalEntryHeaderSelect = {
  branchUnitId: true,
  companyId: true,
  createdAt: true,
  id: true,
  jeno: true,
  remarks: true,
  referenceId: true,
  referenceNo: true,
  referenceType: true,
  status: true,
  totalDebit: true,
  transactionDate: true,
} as const;

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
  rule: {
    include: ApprovalRuleInclude,
  },
};

type ApprovalManagementPrismaClient = {
  accountsPayableVoucher: SourceDelegate & {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  acknowledgementReceipt: SourceDelegate;
  approvalRule: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    updateMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  approvalTransaction: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  approvalTransactionApprover: {
    createMany: (args: Record<string, unknown>) => Promise<unknown>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  approverSetup: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  approverSetupUser: {
    updateMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  billing: SourceDelegate;
  billingInvoice: SourceDelegate;
  billingStatement: SourceDelegate;
  collectionReceipt: SourceDelegate;
  journalEntryHeader: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  journalVoucher: SourceDelegate & {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  officialReceipt: SourceDelegate;
  provisionalReceipt: SourceDelegate;
  serviceInvoice: SourceDelegate;
};

type SourceDelegate = {
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
};

type ApproverSetupWithUsers = {
  id: string;
  approvers: Array<{
    userId: number;
  }>;
};

type JournalEntryHeaderPayload = {
  branchUnitId: number;
  companyId: number;
  createdAt: Date;
  id: bigint;
  jeno: bigint;
  remarks: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
  status: string;
  totalDebit: Prisma.Decimal | number | string;
  transactionDate: Date;
};

type ApprovalTransactionPayload = {
  amount: Prisma.Decimal | number | string;
  approvers: ApprovalTransactionApproverPayload[];
  createdAt: Date;
  id: string;
  moduleScope: string;
  referenceNo: string;
  rule: ApprovalRulePayload;
  status: string;
};

type ApprovalTransactionApproverPayload = {
  approvedAt: Date | null;
  remarks: string | null;
  sequence: number;
  status: string;
  user: {
    id: number;
    name: string;
  };
  userId: number;
};

type ApprovalContext = {
  amount: Prisma.Decimal;
  displayReferenceNo: string;
  header: JournalEntryHeaderPayload;
  progress: ApprovalTransactionPayload;
  rule: ApprovalRulePayload;
};

type RuleApprovalPathEntry = {
  sequence: number;
  userId: number;
};

function findMatchingApprovalRule(rules: ApprovalRulePayload[], amount: Prisma.Decimal) {
  const amountRules = rules.filter((rule) => rule.ruleType === 'amount').sort(compareApprovalRules);
  const matchedAmountRule = amountRules.find((rule) => matchesAmountRule(rule, amount));

  if (matchedAmountRule) {
    return matchedAmountRule;
  }

  return rules.filter((rule) => rule.ruleType === 'default').sort(compareApprovalRules)[0];
}

function compareApprovalRules(first: ApprovalRulePayload, second: ApprovalRulePayload) {
  const firstOrder = getApprovalRuleOrder(first);
  const secondOrder = getApprovalRuleOrder(second);

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.routeName.localeCompare(second.routeName);
}

function getApprovalRuleOrder(rule: ApprovalRulePayload) {
  const match = rule.routeName.match(/(?:condition|route)\s*(\d+)/i);
  const sequence = match ? Number(match[1]) : Number.NaN;

  return Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER;
}

function matchesAmountRule(rule: ApprovalRulePayload, amount: Prisma.Decimal) {
  const ruleAmount = parseApprovalAmount(rule.amount);

  if (!ruleAmount) {
    return false;
  }

  if (rule.amountRule === 'greaterThan') {
    return amount.greaterThan(ruleAmount);
  }

  if (rule.amountRule === 'greaterThanOrEqual') {
    return amount.greaterThanOrEqualTo(ruleAmount);
  }

  if (rule.amountRule === 'lessThan') {
    return amount.lessThan(ruleAmount);
  }

  if (rule.amountRule === 'lessThanOrEqual') {
    return amount.lessThanOrEqualTo(ruleAmount);
  }

  return false;
}

function parseApprovalAmount(amount: string) {
  const parsed = Number(amount.replaceAll(',', '').trim());

  return Number.isFinite(parsed) && parsed > 0 ? new Prisma.Decimal(parsed) : null;
}

function getRuleApprovalPath(rule: ApprovalRulePayload): RuleApprovalPathEntry[] {
  return rule.approverSetup.approvers
    .map((approver) => ({
      sequence: approver.sequence,
      userId: approver.userId,
    }))
    .sort((first, second) => first.sequence - second.sequence);
}

function hasSameApprovalPath(approvers: ApprovalTransactionApproverPayload[], approvalPath: RuleApprovalPathEntry[]) {
  const sortedApprovers = [...approvers].sort((first, second) => first.sequence - second.sequence);

  return (
    sortedApprovers.length === approvalPath.length &&
    sortedApprovers.every((approver, index) => {
      const pathEntry = approvalPath[index];

      return pathEntry && approver.sequence === pathEntry.sequence && approver.userId === pathEntry.userId;
    })
  );
}

function getJournalEntryDisplayReferenceNo(header: JournalEntryHeaderPayload, sourceReferenceNos: Map<string, string>) {
  const sourceReferenceNo = sourceReferenceNos.get(getSourceReferenceKey(header.referenceType, header.referenceId));

  if (sourceReferenceNo) {
    return sourceReferenceNo;
  }

  return header.referenceNo?.trim() || `JE-${header.jeno.toString()}`;
}

function getApprovalStateReferenceNo(header: JournalEntryHeaderPayload) {
  return `${header.referenceType}-${header.referenceId.toString()}`;
}

function getSourceReferenceKey(referenceType: string, referenceId: bigint) {
  return `${referenceType}-${referenceId.toString()}`;
}

function parseJournalEntryHeaderId(transactionId: string) {
  const trimmed = transactionId.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new BadRequestException('Approval transaction id is invalid.');
  }

  return BigInt(trimmed);
}

function normalizeApprovalActionRemarks(remarks: string | null | undefined) {
  const normalized = remarks?.trim() ?? '';

  if (normalized.length > ApprovalActionRemarksMaxLength) {
    throw new BadRequestException(`Remarks cannot exceed ${ApprovalActionRemarksMaxLength} characters.`);
  }

  return normalized || null;
}

function getApprovedSourceTransactionData(referenceType: string, userId: number, now: Date) {
  if (referenceType === 'APV') {
    return {
      closedAt: now,
      closedByUserId: userId,
      status: AccountsPayableVoucherStatus.CLOSED,
      updatedByUserId: userId,
    };
  }

  return {
    postedAt: now,
    postedByUserId: userId,
    status: getPostedSourceStatus(referenceType),
    updatedByUserId: userId,
  };
}

function getDisapprovedSourceTransactionData(referenceType: string, userId: number, now: Date) {
  if (referenceType === 'APV') {
    return {
      approvedAt: null,
      approvedByUserId: null,
      closedAt: null,
      closedByUserId: null,
      disapprovedAt: now,
      disapprovedByUserId: userId,
      status: AccountsPayableVoucherStatus.DISAPPROVED,
      updatedByUserId: userId,
    };
  }

  return {
    disapprovedAt: now,
    disapprovedByUserId: userId,
    status: getDisapprovedSourceStatus(referenceType),
    updatedByUserId: userId,
  };
}

function getPostedSourceStatus(referenceType: string) {
  switch (referenceType) {
    case 'JV':
      return JournalVoucherStatus.POSTED;
    case 'SI':
      return ServiceInvoiceStatus.POSTED;
    case 'OR':
      return OfficialReceiptStatus.POSTED;
    case 'CR':
      return CollectionReceiptStatus.POSTED;
    case 'AR':
      return AcknowledgementReceiptStatus.POSTED;
    case 'PVR':
      return ProvisionalReceiptStatus.POSTED;
    case 'BI':
      return BillingInvoiceStatus.POSTED;
    case 'BILL':
      return BillingStatus.POSTED;
    case 'BS':
      return BillingStatementStatus.POSTED;
    default:
      throw new BadRequestException(`Approval actions are not supported yet for ${referenceType}.`);
  }
}

function getDisapprovedSourceStatus(referenceType: string) {
  switch (referenceType) {
    case 'JV':
      return JournalVoucherStatus.DISAPPROVED;
    case 'SI':
      return ServiceInvoiceStatus.DISAPPROVED;
    case 'OR':
      return OfficialReceiptStatus.DISAPPROVED;
    case 'CR':
      return CollectionReceiptStatus.DISAPPROVED;
    case 'AR':
      return AcknowledgementReceiptStatus.DISAPPROVED;
    case 'PVR':
      return ProvisionalReceiptStatus.DISAPPROVED;
    case 'BI':
      return BillingInvoiceStatus.DISAPPROVED;
    case 'BILL':
      return BillingStatus.DISAPPROVED;
    case 'BS':
      return BillingStatementStatus.DISAPPROVED;
    default:
      throw new BadRequestException(`Approval actions are not supported yet for ${referenceType}.`);
  }
}

async function updateSourceTransaction(db: ApprovalManagementPrismaClient, header: JournalEntryHeaderPayload, data: Record<string, unknown>) {
  switch (header.referenceType) {
    case 'APV':
      return db.accountsPayableVoucher.updateMany({
        where: {
          apvId: header.referenceId,
          companyId: header.companyId,
        },
        data,
      });
    case 'JV':
      return db.journalVoucher.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'SI':
      return db.serviceInvoice.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'OR':
      return db.officialReceipt.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'CR':
      return db.collectionReceipt.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'AR':
      return db.acknowledgementReceipt.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'PVR':
      return db.provisionalReceipt.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'BI':
      return db.billingInvoice.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'BILL':
      return db.billing.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    case 'BS':
      return db.billingStatement.updateMany({
        where: {
          companyId: header.companyId,
          id: header.referenceId,
        },
        data,
      });
    default:
      throw new BadRequestException(`Approval actions are not supported yet for ${header.referenceType}.`);
  }
}

function mapApprovalContext(context: ApprovalContext, currentUserId: number) {
  const approvers = [...context.progress.approvers].sort((first, second) => first.sequence - second.sequence);
  const isTerminal = isTerminalApprovalStatus(context.progress.status);
  const firstPendingApprover = isTerminal ? undefined : approvers.find((approver) => approver.status !== ApprovalStatusApproved);
  const selectedApprover = approvers.find((approver) => approver.userId === currentUserId);
  const isSequential = isSequentialApprovalRule(context.rule.ruleType);
  const canCurrentUserAct = Boolean(
    !isTerminal && selectedApprover?.status === ApprovalStatusPending && (!isSequential || firstPendingApprover?.userId === currentUserId),
  );
  const currentApprover = isSequential ? firstPendingApprover : canCurrentUserAct ? selectedApprover : firstPendingApprover;

  return {
    id: context.header.id.toString(),
    amount: context.amount.toString(),
    moduleScope: context.header.referenceType,
    moduleName: context.rule.moduleName || context.header.referenceType,
    referenceNo: context.displayReferenceNo,
    remarks: context.header.remarks?.trim() ?? '',
    requestedAt: context.header.createdAt ?? context.header.transactionDate,
    ruleId: context.rule.id,
    ruleName: context.rule.routeName,
    status: context.progress.status || context.header.status,
    canUpdateStatus: canCurrentUserAct,
    isSequential,
    blockerName: isSequential && !canCurrentUserAct ? firstPendingApprover?.user.name : undefined,
    currentApproverId: currentApprover?.userId ?? null,
    approvers: approvers.map((approver) => ({
      approvedAt: approver.approvedAt,
      name: approver.user.name,
      remarks: approver.remarks,
      sequence: approver.sequence,
      status: approver.status,
      userId: approver.userId,
    })),
  };
}

function isSequentialApprovalRule(ruleType: string) {
  return ruleType === 'amount';
}

function isTerminalApprovalStatus(status: string) {
  return status === ApprovalStatusApproved || status === ApprovalStatusDisapproved;
}
