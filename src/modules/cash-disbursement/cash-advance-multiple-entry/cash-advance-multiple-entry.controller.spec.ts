import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CashAdvanceMultipleEntryController } from './cash-advance-multiple-entry.controller';
import { CashAdvanceMultipleEntryService } from './cash-advance-multiple-entry.service';

describe('CashAdvanceMultipleEntryController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new CashAdvanceMultipleEntryController(service as unknown as CashAdvanceMultipleEntryService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, CashAdvanceMultipleEntryController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'CAME-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, '3')).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, '3');
  });

  it('delegates the complete multiple-entry workflow with realistic data', async () => {
    const id = '1283f678-84a8-49cb-aab3-5ea71bde4ce3';
    const listQuery = { page: 1, limit: 20, status: 'DRAFT' } as Parameters<typeof controller.findAll>[1];
    const createDto = {
      branchUnitId: 3,
      transNo: 'CAME-2026-0001',
      documentDate: '2026-09-01',
      accountCode: '110300',
      accountTitle: 'Employee Cash Advances',
      currency: 'PHP',
      remarks: 'Weekly field-team cash advances',
      items: [
        { partyCode: 'EMP-014', partyName: 'Maria Santos', particulars: 'Cebu travel', amount: '8500.00' },
        { partyCode: 'EMP-027', partyName: 'Jose Reyes', particulars: 'Davao travel', amount: '7200.00' },
      ],
      accountingEntries: [{ accountCode: '110300', accountTitle: 'Employee Cash Advances', debit: '15700.00', credit: '0.00' }],
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, remarks: 'Updated weekly field-team advances' } as Parameters<typeof controller.update>[2];
    const statusDto = { status: 'FOR_APPROVAL' } as Parameters<typeof controller.updateStatus>[2];
    const record = { id, ...createDto, status: 'DRAFT' };
    const list = { data: [record], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };

    service.findAll.mockResolvedValue(list);
    service.findOne.mockResolvedValue(record);
    service.create.mockResolvedValue(record);
    service.update.mockResolvedValue({ ...record, ...updateDto });
    service.updateStatus.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });
    service.remove.mockResolvedValue({ message: 'Cash advance multiple-entry batch cancelled.' });

    await expect(controller.findAll(user, listQuery)).resolves.toBe(list);
    await expect(controller.findOne(user, id)).resolves.toBe(record);
    await expect(controller.create(user, createDto)).resolves.toBe(record);
    await controller.update(user, id, updateDto);
    await controller.updateStatus(user, id, statusDto);
    await controller.remove(user, id);

    expect(service.findAll).toHaveBeenCalledWith(user, listQuery);
    expect(service.findOne).toHaveBeenCalledWith(user, id);
    expect(service.create).toHaveBeenCalledWith(user, createDto);
    expect(service.update).toHaveBeenCalledWith(user, id, updateDto);
    expect(service.updateStatus).toHaveBeenCalledWith(user, id, statusDto);
    expect(service.remove).toHaveBeenCalledWith(user, id);
  });
});
