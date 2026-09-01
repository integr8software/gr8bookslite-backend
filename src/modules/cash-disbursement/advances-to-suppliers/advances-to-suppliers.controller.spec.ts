import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { AdvancesToSuppliersController } from './advances-to-suppliers.controller';
import { AdvancesToSuppliersService } from './advances-to-suppliers.service';

describe('AdvancesToSuppliersController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    submitApproval: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new AdvancesToSuppliersController(service as unknown as AdvancesToSuppliersService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, AdvancesToSuppliersController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'ATS-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, '3')).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, '3');
  });

  it('delegates the complete supplier-advance workflow with realistic data', async () => {
    const id = '2d33a370-f62d-4b12-82e4-b6296d175720';
    const listQuery = { page: 1, limit: 20, status: 'DRAFT', partyCode: 'SUP-001' } as Parameters<typeof controller.findAll>[1];
    const createDto = {
      branchUnitId: 3,
      transactionNo: 'ATS-2026-0001',
      documentDate: '2026-09-01',
      partyCode: 'SUP-001',
      partyName: 'Pacific Office Supplies',
      accountCode: '110500',
      accountTitle: 'Advances to Suppliers',
      currency: 'PHP',
      totalPoAmount: '50000.00',
      advancePaymentAmount: '12500.00',
      remarks: '25% advance for office equipment',
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, remarks: 'Updated supplier advance terms' } as Parameters<typeof controller.update>[2];
    const statusDto = { status: 'FOR_APPROVAL' } as Parameters<typeof controller.updateStatus>[2];
    const record = { id, ...createDto, status: 'DRAFT' };
    const list = { data: [record], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };

    service.findAll.mockResolvedValue(list);
    service.findOne.mockResolvedValue(record);
    service.create.mockResolvedValue(record);
    service.update.mockResolvedValue({ ...record, ...updateDto });
    service.updateStatus.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });
    service.submitApproval.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });
    service.remove.mockResolvedValue({ message: 'Advances to Suppliers record deleted.' });

    await expect(controller.findAll(user, listQuery)).resolves.toBe(list);
    await expect(controller.findOne(user, id)).resolves.toBe(record);
    await expect(controller.create(user, createDto)).resolves.toBe(record);
    await controller.update(user, id, updateDto);
    await controller.updateStatus(user, id, statusDto);
    await controller.submitApproval(user, id);
    await controller.remove(user, id);

    expect(service.findAll).toHaveBeenCalledWith(user, listQuery);
    expect(service.findOne).toHaveBeenCalledWith(user, id);
    expect(service.create).toHaveBeenCalledWith(user, createDto);
    expect(service.update).toHaveBeenCalledWith(user, id, updateDto);
    expect(service.updateStatus).toHaveBeenCalledWith(user, id, statusDto);
    expect(service.submitApproval).toHaveBeenCalledWith(user, id);
    expect(service.remove).toHaveBeenCalledWith(user, id);
  });
});
