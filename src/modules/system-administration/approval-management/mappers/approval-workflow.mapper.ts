export const ApprovalRuleInclude = {
  approverSetup: {
    include: {
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
    },
  },
} as const;

type ApprovalRulePathEntry = {
  approverSetupId: string;
  sequence: number;
  userId: number;
};

export type ApprovalRulePayload = {
  id: string;
  approverSetupId: string;
  ruleType: string;
  routeName: string;
  amountRule: string;
  amount: string;
  moduleScope: string;
  moduleName: string;
  status: string;
  description: string;
  updatedAt: Date;
  approverSetup: {
    id: string;
    level: number | null;
    levelName: string;
    approverCondition: string;
    approvers: Array<{
      userId: number;
      sequence: number;
      user: {
        id: number;
        name: string;
      };
    }>;
  };
};

export function mapApprovalRulesToWorkflows(rules: ApprovalRulePayload[]) {
  const rulesByModule = new Map<string, ApprovalRulePayload[]>();

  for (const rule of rules) {
    rulesByModule.set(rule.moduleScope, [
      ...(rulesByModule.get(rule.moduleScope) ?? []),
      rule,
    ]);
  }

  return [...rulesByModule.entries()].map(([moduleScope, moduleRules]) => {
    const sortedRules = [...moduleRules].sort((first, second) =>
      first.routeName.localeCompare(second.routeName),
    );
    const primaryRule = sortedRules[0];
    const stageById = new Map<
      string,
      { entry: ApprovalRulePathEntry; setup: ApprovalRulePayload['approverSetup'] }
    >();
    const stageOrder: string[] = [];

    for (const rule of sortedRules) {
      for (const approver of rule.approverSetup.approvers) {
        const entry = {
          approverSetupId: rule.approverSetup.id,
          sequence: approver.sequence,
          userId: approver.userId,
        };
        const stageId = createStageId(entry);

        if (!stageById.has(stageId)) {
          stageById.set(stageId, { entry, setup: rule.approverSetup });
          stageOrder.push(stageId);
        }
      }
    }

    const stages = stageOrder
      .map((stageId, index) => {
        const stage = stageById.get(stageId);

        if (!stage) {
          return null;
        }

        const approver = stage.setup.approvers.find(
          (setupApprover) => setupApprover.userId === stage.entry.userId,
        );

        return {
          id: stageId,
          sequence: index + 1,
          name: stage.setup.levelName,
          approverIds: [stage.entry.userId],
          requirement: 'all',
          sourceApproverSetupId: stage.setup.id,
        };
      })
      .filter(Boolean);

    return {
      id: moduleScope,
      moduleCode: moduleScope,
      moduleName: primaryRule.moduleName || moduleScope,
      stageCount: stages.length,
      stages,
      routingRules: sortedRules.map((rule) => ({
        id: rule.id,
        sequence: sortedRules.indexOf(rule) + 1,
        name: rule.routeName,
        basis: rule.ruleType,
        amountOperator: rule.amountRule,
        amountValue: rule.amount,
        stageIds: rule.approverSetup.approvers.map((approver) =>
          createStageId({
            approverSetupId: rule.approverSetup.id,
            sequence: approver.sequence,
            userId: approver.userId,
          }),
        ),
      })),
      status: primaryRule.status,
      description: primaryRule.description,
      updatedAt: sortedRules.reduce(
        (latest, rule) =>
          rule.updatedAt.getTime() > latest.getTime() ? rule.updatedAt : latest,
        primaryRule.updatedAt,
      ),
    };
  });
}

function createStageId(entry: ApprovalRulePathEntry) {
  return `approval-stage-${entry.approverSetupId}-${entry.userId}`;
}
