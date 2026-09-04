import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalRulePayload } from './mappers/approval-workflow.mapper';
import { ApprovalManagementService } from './approval-management.service';

describe('ApprovalManagementService', () => {
  it('creates approval progress with the first matching ordered amount rule for pending journal headers', async () => {
    const header = {
      branchUnitId: 2,
      companyId: 7,
      createdAt: new Date('2026-09-04T08:00:00.000Z'),
      id: 900n,
      jeno: 15n,
      remarks: 'Monthly service billing',
      referenceId: 5n,
      referenceNo: null,
      referenceType: 'JV',
      status: 'For Approval',
      totalDebit: new Prisma.Decimal('1500'),
      transactionDate: new Date('2026-09-04T00:00:00.000Z'),
    };
    const selectedRule = createApprovalRule({
      amount: '1,000',
      id: 'rule-condition-2',
      routeName: 'Condition 2',
    });
    const fallbackRule = createApprovalRule({
      amount: '',
      id: 'rule-default',
      routeName: 'Otherwise',
      ruleType: 'default',
    });
    const laterMatchingRule = createApprovalRule({
      amount: '1,000',
      id: 'rule-condition-10',
      routeName: 'Condition 10',
    });
    const approvalTransactionCreate = jest.fn(async (args: Record<string, any>) => ({
      amount: args.data.amount,
      approvers: args.data.approvers.create.map((approver: { sequence: number; status: string; userId: number }) => ({
        ...approver,
        approvedAt: null,
        remarks: null,
        user: {
          id: approver.userId,
          name: approver.userId === 22 ? 'Mara Santos' : 'Nico Reyes',
        },
      })),
      createdAt: new Date('2026-09-04T08:01:00.000Z'),
      id: 'approval-progress-1',
      moduleScope: args.data.moduleScope,
      referenceNo: args.data.referenceNo,
      rule: selectedRule,
      status: args.data.status,
    }));
    const prisma = {
      accountsPayableVoucher: { findMany: jest.fn().mockResolvedValue([]) },
      approvalRule: { findMany: jest.fn().mockResolvedValue([fallbackRule, laterMatchingRule, selectedRule]) },
      approvalTransaction: {
        create: approvalTransactionCreate,
        findFirst: jest.fn().mockResolvedValue(null),
      },
      journalEntryHeader: { findMany: jest.fn().mockResolvedValue([header]) },
      journalVoucher: { findMany: jest.fn().mockResolvedValue([{ id: 5n, transactionNo: 'JV-0005' }]) },
    } as unknown as PrismaService;
    const service = new ApprovalManagementService(prisma);

    const result = await service.findTransactions({ companyId: 7, id: 22 } as AuthUser);

    expect(approvalTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: new Prisma.Decimal('1500'),
          moduleScope: 'JV',
          referenceNo: 'JV-5',
          ruleId: 'rule-condition-2',
          status: 'For Approval',
          approvers: {
            create: [
              { sequence: 1, status: 'Pending', userId: 22 },
              { sequence: 2, status: 'Pending', userId: 33 },
            ],
          },
        }),
      }),
    );
    expect(result.transactions).toEqual([
      expect.objectContaining({
        amount: '1500',
        canUpdateStatus: true,
        currentApproverId: 22,
        id: '900',
        moduleName: 'Journal Voucher',
        moduleScope: 'JV',
        referenceNo: 'JV-0005',
        ruleId: 'rule-condition-2',
        ruleName: 'Condition 2',
        status: 'For Approval',
      }),
    ]);
  });
});

function createApprovalRule(overrides: Partial<ApprovalRulePayload> = {}): ApprovalRulePayload {
  return {
    amount: '0',
    amountRule: 'greaterThanOrEqual',
    approverSetupId: 'setup-1',
    description: '',
    id: 'rule-1',
    moduleName: 'Journal Voucher',
    moduleScope: 'JV',
    routeName: 'Condition 1',
    ruleType: 'amount',
    status: 'Active',
    updatedAt: new Date('2026-09-04T00:00:00.000Z'),
    approverSetup: {
      approverCondition: 'All approvers',
      approvers: [
        { sequence: 1, user: { id: 22, name: 'Mara Santos' }, userId: 22 },
        { sequence: 2, user: { id: 33, name: 'Nico Reyes' }, userId: 33 },
      ],
      id: 'setup-1',
      level: 1,
      levelName: 'Management Review',
    },
    ...overrides,
  };
}
