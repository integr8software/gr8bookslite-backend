import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalRulePayload } from './mappers/approval-workflow.mapper';
import { ApprovalManagementService } from './approval-management.service';

type ApprovalTransactionApproverCreateInput = {
  sequence: number;
  status: string;
  userId: number;
};

type ApprovalTransactionCreateArgs = {
  data: {
    amount: Prisma.Decimal;
    approvers: {
      create: ApprovalTransactionApproverCreateInput[];
    };
    moduleScope: string;
    referenceNo: string;
    ruleId: string;
    status: string;
  };
};

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
    const approvalTransactionCreate = jest.fn((args: ApprovalTransactionCreateArgs) =>
      Promise.resolve({
        amount: args.data.amount,
        approvers: args.data.approvers.create.map((approver) => ({
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
      }),
    );
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

    expect(approvalTransactionCreate.mock.calls[0]?.[0].data).toMatchObject({
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
    });
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

  it('uses cash and disbursement voucher numbers as approval transaction references', async () => {
    const cvHeader = {
      branchUnitId: 1,
      companyId: 7,
      createdAt: new Date('2026-09-11T05:29:00.000Z'),
      id: 901n,
      jeno: 3n,
      remarks: 'Cash voucher approval',
      referenceId: 6n,
      referenceNo: null,
      referenceType: 'CV',
      status: 'For Approval',
      totalDebit: new Prisma.Decimal('300'),
      transactionDate: new Date('2026-09-11T00:00:00.000Z'),
    };
    const dvHeader = {
      ...cvHeader,
      id: 902n,
      jeno: 4n,
      remarks: 'Disbursement voucher approval',
      referenceId: 8n,
      referenceType: 'DV',
    };
    const cvRule = createApprovalRule({
      id: 'rule-cv',
      moduleName: 'Cash Voucher',
      moduleScope: 'CV',
      routeName: 'Department Review',
      ruleType: 'default',
    });
    const dvRule = createApprovalRule({
      id: 'rule-dv',
      moduleName: 'Disbursement Voucher',
      moduleScope: 'DV',
      routeName: 'Department Review',
      ruleType: 'default',
    });
    const rulesById = new Map<string, ApprovalRulePayload>([
      [cvRule.id, cvRule],
      [dvRule.id, dvRule],
    ]);
    const approvalTransactionCreate = jest.fn((args: ApprovalTransactionCreateArgs) => {
      const rule = rulesById.get(args.data.ruleId)!;

      return Promise.resolve({
        amount: args.data.amount,
        approvers: args.data.approvers.create.map((approver) => ({
          ...approver,
          approvedAt: null,
          remarks: null,
          user: {
            id: approver.userId,
            name: approver.userId === 22 ? 'Mara Santos' : 'Nico Reyes',
          },
        })),
        createdAt: new Date('2026-09-11T05:30:00.000Z'),
        id: `approval-progress-${args.data.moduleScope}`,
        moduleScope: args.data.moduleScope,
        referenceNo: args.data.referenceNo,
        rule,
        status: args.data.status,
      });
    });
    const prisma = {
      accountsPayableVoucher: { findMany: jest.fn().mockResolvedValue([]) },
      approvalRule: { findMany: jest.fn().mockResolvedValue([cvRule, dvRule]) },
      approvalTransaction: {
        create: approvalTransactionCreate,
        findFirst: jest.fn().mockResolvedValue(null),
      },
      cashVoucher: { findMany: jest.fn().mockResolvedValue([{ id: 6n, voucherNo: 'CV-000003' }]) },
      disbursementVoucher: { findMany: jest.fn().mockResolvedValue([{ id: 8n, voucherNo: 'DV-000004' }]) },
      journalEntryHeader: { findMany: jest.fn().mockResolvedValue([cvHeader, dvHeader]) },
      journalVoucher: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new ApprovalManagementService(prisma);

    const result = await service.findTransactions({ companyId: 7, id: 22 } as AuthUser);

    expect(result.transactions).toEqual([
      expect.objectContaining({
        id: '901',
        moduleScope: 'CV',
        referenceNo: 'CV-000003',
      }),
      expect.objectContaining({
        id: '902',
        moduleScope: 'DV',
        referenceNo: 'DV-000004',
      }),
    ]);
    const cvCreateArg = approvalTransactionCreate.mock.calls.find(([args]) => args.data.moduleScope === 'CV')?.[0];
    const dvCreateArg = approvalTransactionCreate.mock.calls.find(([args]) => args.data.moduleScope === 'DV')?.[0];

    expect(cvCreateArg?.data.referenceNo).toBe('CV-6');
    expect(dvCreateArg?.data.referenceNo).toBe('DV-8');
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
