import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PettyCashFundController } from './petty-cash-fund.controller';
import { PettyCashFundService } from './petty-cash-fund.service';

describe('PettyCashFundController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new PettyCashFundController(service as unknown as PettyCashFundService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, PettyCashFundController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'PCF-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, 3)).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, 3);
  });

  it('delegates the complete petty-cash fund workflow with realistic data', async () => {
    const id = '101';
    const query = { page: 1, limit: 20, search: 'Juan dela Cruz' } as Parameters<typeof controller.findAll>[1];
    const createDto = {
      branchUnitId: 3,
      transactionNo: 'PCF-2026-0001',
      documentDate: '2026-09-01',
      partyId: '41',
      partyCode: 'EMP-0041',
      partyName: 'Juan dela Cruz',
      accountId: '12',
      accountCode: '100200',
      accountTitle: 'Petty Cash Fund',
      currencyCode: 'PHP',
      exchangeRate: 1,
      amount: 25000,
      remarks: 'Initial petty-cash fund for September operations',
      details: [{ lineNumber: 1, date: '2026-09-01', supplierName: 'QuickMart Office Supplies', particulars: 'Initial operating float', amount: 25000 }],
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, amount: 27000, remarks: 'Adjusted approved fund level' } as Parameters<typeof controller.update>[2];
    const statusDto = { status: 'FOR_APPROVAL' } as Parameters<typeof controller.updateStatus>[2];
    const record = { id, ...createDto, status: 'DRAFT' };
    const list = { data: [record], meta: { page: 1, limit: 20, total: 1 } };

    service.findAll.mockResolvedValue(list);
    service.findOne.mockResolvedValue(record);
    service.create.mockResolvedValue(record);
    service.update.mockResolvedValue({ ...record, ...updateDto });
    service.updateStatus.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });
    service.remove.mockResolvedValue({ deleted: true });

    await expect(controller.findAll(user, query)).resolves.toBe(list);
    await expect(controller.findOne(user, id)).resolves.toBe(record);
    await expect(controller.create(user, createDto)).resolves.toBe(record);
    await controller.update(user, id, updateDto);
    await controller.updateStatus(user, id, statusDto);
    await controller.remove(user, id);

    expect(service.findAll).toHaveBeenCalledWith(user, query);
    expect(service.findOne).toHaveBeenCalledWith(user, id);
    expect(service.create).toHaveBeenCalledWith(user, createDto);
    expect(service.update).toHaveBeenCalledWith(user, id, updateDto);
    expect(service.updateStatus).toHaveBeenCalledWith(user, id, statusDto);
    expect(service.remove).toHaveBeenCalledWith(user, id);
  });
});
