import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApproverSetupsService } from './approver-setups.service';
import type { CreateApproverSetupDto } from './dto/create-approver-setup.dto';

describe('ApproverSetupsService', () => {
  const user = {
    id: 1,
    companyId: 7,
    role: AppRole.ADMIN,
  } as AuthUser;

  const createValidDto = (overrides: Partial<CreateApproverSetupDto> = {}): CreateApproverSetupDto => ({
    approverCondition: 'Any one approver',
    approverUserIds: [10, 20],
    level: 1,
    levelName: 'Department Review',
    moduleScope: 'APV',
    status: 'Active',
    type: 'Level-based',
    ...overrides,
  });

  const createMockSetupRecord = (id = 'setup-uuid-1', overrides: Record<string, any> = {}) => ({
    id,
    companyId: 7,
    approverCondition: 'Any one approver',
    levelName: 'Department Review',
    type: 'Level-based',
    status: 'Active',
    level: 1,
    moduleScope: 'APV',
    validUntil: null,
    createdAt: new Date('2026-09-08T00:00:00.000Z'),
    updatedAt: new Date('2026-09-08T00:00:00.000Z'),
    approvers: [{ user: { id: 10, name: 'Approver One', email: 'one@example.com' } }, { user: { id: 20, name: 'Approver Two', email: 'two@example.com' } }],
    ...overrides,
  });

  describe('create', () => {
    it('rejects creating duplicate approver setup with the same module scope and assignment type for a company', async () => {
      const dto = createValidDto();
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue({ id: 'existing-setup-id' }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);

      await expect(service.create(user, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(user, dto)).rejects.toThrow('Approver setup for module "APV" with type "Level-based" already exists.');
      expect(prisma.approverSetup.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 7,
          moduleScope: 'APV',
          type: 'Level-based',
        },
      });
    });

    it('creates approver setup and auto-provisions default approval rule when none exists for the module scope', async () => {
      const dto = createValidDto();
      const createdSetupRecord = createMockSetupRecord();

      const txApproverSetupCreate = jest.fn().mockResolvedValue(createdSetupRecord);
      const txApprovalRuleFindFirst = jest.fn().mockResolvedValue(null);
      const txApprovalRuleCreate = jest.fn().mockResolvedValue({ id: 'new-rule-id' });
      const txModuleFindFirst = jest.fn().mockResolvedValue({ name: 'Accounts Payable Voucher' });

      const tx = {
        approverSetup: { create: txApproverSetupCreate },
        approvalRule: {
          findFirst: txApprovalRuleFindFirst,
          create: txApprovalRuleCreate,
        },
        module: { findFirst: txModuleFindFirst },
      };

      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
        $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<any>) => cb(tx)),
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);
      const result = await service.create(user, dto);

      expect(txApproverSetupCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 7,
            moduleScope: 'APV',
            type: 'Level-based',
            levelName: 'Department Review',
          }),
        }),
      );

      expect(txApprovalRuleCreate).toHaveBeenCalledWith({
        data: {
          amount: '',
          amountRule: 'greaterThan',
          approverSetupId: 'setup-uuid-1',
          companyId: 7,
          description: 'Default approval rule from approver setup',
          moduleName: 'Accounts Payable Voucher',
          moduleScope: 'APV',
          routeName: 'Department Review',
          ruleType: 'default',
          status: 'Active',
        },
      });

      expect(result.message).toBe('Approver setup created.');
      expect(result.setup.id).toBe('setup-uuid-1');
      expect(result.setup.moduleScope).toBe('APV');
      expect(result.setup.type).toBe('Level-based');
    });

    it('creates approver setup without creating a redundant approval rule when an active rule already exists', async () => {
      const dto = createValidDto();
      const createdSetupRecord = createMockSetupRecord();

      const txApproverSetupCreate = jest.fn().mockResolvedValue(createdSetupRecord);
      const txApprovalRuleFindFirst = jest.fn().mockResolvedValue({ id: 'existing-rule-id' });
      const txApprovalRuleCreate = jest.fn();

      const tx = {
        approverSetup: { create: txApproverSetupCreate },
        approvalRule: {
          findFirst: txApprovalRuleFindFirst,
          create: txApprovalRuleCreate,
        },
        module: { findFirst: jest.fn() },
      };

      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
        $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<any>) => cb(tx)),
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);
      const result = await service.create(user, dto);

      expect(txApproverSetupCreate).toHaveBeenCalled();
      expect(txApprovalRuleCreate).not.toHaveBeenCalled();
      expect(result.setup.id).toBe('setup-uuid-1');
    });

    it('throws BadRequestException when approver user IDs do not belong to the company context', async () => {
      const dto = createValidDto({ approverUserIds: [10, 999] });
      const prisma = {
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }]),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);

      await expect(service.create(user, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(user, dto)).rejects.toThrow('Approver user ids do not belong to this company: 999');
    });

    it('throws BadRequestException when temporary assignment type lacks a valid until date', async () => {
      const dto = createValidDto({ type: 'Temporary', validUntil: '' });
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
        $transaction: jest.fn(async (cb: any) =>
          cb({
            approverSetup: { create: jest.fn() },
          }),
        ),
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);

      await expect(service.create(user, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(user, dto)).rejects.toThrow('Enter a valid until date.');
    });
  });

  describe('update', () => {
    it('rejects update if another approver setup with the same module scope and assignment type already exists', async () => {
      const dto = createValidDto();
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockImplementation((args: any) => {
            if (args.where?.id === 'target-setup-id') {
              return Promise.resolve({ id: 'target-setup-id' });
            }
            if (args.where?.type === 'Level-based') {
              return Promise.resolve({ id: 'another-setup-id' });
            }
            return Promise.resolve(null);
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);

      await expect(service.update(user, 'target-setup-id', dto)).rejects.toThrow(BadRequestException);
      await expect(service.update(user, 'target-setup-id', dto)).rejects.toThrow('Approver setup for module "APV" with type "Level-based" already exists.');
    });

    it('successfully updates approver setup and reconfigures approvers when valid', async () => {
      const dto = createValidDto({ levelName: 'Updated Level' });
      const updatedRecord = createMockSetupRecord('target-setup-id', { levelName: 'Updated Level' });

      const txApproverSetupUserDeleteMany = jest.fn().mockResolvedValue({ count: 2 });
      const txApproverSetupUpdate = jest.fn().mockResolvedValue(updatedRecord);

      const tx = {
        approverSetupUser: { deleteMany: txApproverSetupUserDeleteMany },
        approverSetup: { update: txApproverSetupUpdate },
      };

      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockImplementation((args: any) => {
            if (args.where?.id === 'target-setup-id') {
              return Promise.resolve({ id: 'target-setup-id' });
            }
            return Promise.resolve(null);
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
        $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<any>) => cb(tx)),
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);
      const result = await service.update(user, 'target-setup-id', dto);

      expect(txApproverSetupUserDeleteMany).toHaveBeenCalledWith({
        where: { approverSetupId: 'target-setup-id' },
      });
      expect(txApproverSetupUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-setup-id' },
          data: expect.objectContaining({
            levelName: 'Updated Level',
            moduleScope: 'APV',
            type: 'Level-based',
          }),
        }),
      );

      expect(result.message).toBe('Approver setup updated.');
      expect(result.setup.levelName).toBe('Updated Level');
    });

    it('throws NotFoundException when attempting to update a non-existent or inaccessible approver setup', async () => {
      const dto = createValidDto();
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);

      await expect(service.update(user, 'missing-setup-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update(user, 'missing-setup-id', dto)).rejects.toThrow('Approver setup not found.');
    });
  });

  describe('remove', () => {
    it('deletes approver setup after verifying company access', async () => {
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue({ id: 'target-setup-id' }),
          delete: jest.fn().mockResolvedValue({ id: 'target-setup-id' }),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);
      const result = await service.remove(user, 'target-setup-id');

      expect(prisma.approverSetup.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'target-setup-id',
          companyId: 7,
        },
        select: {
          id: true,
        },
      });
      expect(prisma.approverSetup.delete).toHaveBeenCalledWith({
        where: { id: 'target-setup-id' },
      });
      expect(result.id).toBe('target-setup-id');
    });

    it('throws NotFoundException if the setup does not belong to the company on remove', async () => {
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);

      await expect(service.remove(user, 'missing-setup-id')).rejects.toThrow(NotFoundException);
      expect(prisma.approverSetup.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates status of approver setup when company access is valid', async () => {
      const updatedRecord = createMockSetupRecord('target-setup-id', { status: 'Expired' });
      const prisma = {
        approverSetup: {
          findFirst: jest.fn().mockResolvedValue({ id: 'target-setup-id' }),
          update: jest.fn().mockResolvedValue(updatedRecord),
        },
      } as unknown as PrismaService;

      const service = new ApproverSetupsService(prisma);
      const result = await service.updateStatus(user, 'target-setup-id', 'Expired');

      expect(prisma.approverSetup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-setup-id' },
          data: { status: 'Expired' },
        }),
      );
      expect(result.message).toBe('Approver setup status updated.');
      expect(result.setup.status).toBe('Expired');
    });
  });
});
