import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CashAdvanceController } from './cash-advance.controller';
import { CashAdvanceService } from './cash-advance.service';

describe('CashAdvanceController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    submitApproval: jest.fn(),
  };
  const controller = new CashAdvanceController(service as unknown as CashAdvanceService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, CashAdvanceController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'CA-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, '3')).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, '3');
  });

  it('delegates the complete cash-advance workflow with realistic data', async () => {
    const id = '837cc3c5-c381-4bb2-9f69-fd8ab1c668a1';
    const listQuery = { page: 1, limit: 20, status: 'DRAFT', partyCode: 'EMP-014' } as Parameters<typeof controller.findAll>[1];
    const createDto = {
      branchUnitId: 3,
      transNo: 'CA-2026-0001',
      documentDate: '2026-09-01',
      partyCode: 'EMP-014',
      partyName: 'Maria Santos',
      accountCode: '110300',
      accountTitle: 'Employee Cash Advances',
      currency: 'PHP',
      amount: '8500.00',
      remarks: 'Travel cash advance for Cebu client visit',
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, amount: '9000.00' } as Parameters<typeof controller.update>[2];
    const statusDto = { status: 'FOR_APPROVAL' } as Parameters<typeof controller.updateStatus>[2];
    const record = { id, ...createDto, status: 'DRAFT' };
    const list = { data: [record], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };

    service.findAll.mockResolvedValue(list);
    service.findOne.mockResolvedValue(record);
    service.create.mockResolvedValue(record);
    service.update.mockResolvedValue({ ...record, ...updateDto });
    service.remove.mockResolvedValue({ message: 'Cash advance cancelled.' });
    service.updateStatus.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });
    service.submitApproval.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });

    await expect(controller.findAll(user, listQuery)).resolves.toBe(list);
    await expect(controller.findOne(user, id)).resolves.toBe(record);
    await expect(controller.create(user, createDto)).resolves.toBe(record);
    await controller.update(user, id, updateDto);
    await controller.remove(user, id);
    await controller.updateStatus(user, id, statusDto);
    await controller.submitApproval(user, id);

    expect(service.findAll).toHaveBeenCalledWith(user, listQuery);
    expect(service.findOne).toHaveBeenCalledWith(user, id);
    expect(service.create).toHaveBeenCalledWith(user, createDto);
    expect(service.update).toHaveBeenCalledWith(user, id, updateDto);
    expect(service.remove).toHaveBeenCalledWith(user, id);
    expect(service.updateStatus).toHaveBeenCalledWith(user, id, statusDto);
    expect(service.submitApproval).toHaveBeenCalledWith(user, id);
  });
});
