import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PettyCashVoucherController } from './petty-cash-voucher.controller';
import { PettyCashVoucherService } from './petty-cash-voucher.service';

describe('PettyCashVoucherController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new PettyCashVoucherController(service as unknown as PettyCashVoucherService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, PettyCashVoucherController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'PCV-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, 3)).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, 3);
  });

  it('delegates the complete petty-cash voucher workflow with realistic data', async () => {
    const id = '301';
    const query = { page: 1, limit: 20, search: 'QuickMart' } as Parameters<typeof controller.findAll>[1];
    const createDto = {
      branchUnitId: 3,
      voucherNo: 'PCV-2026-0001',
      transactionNo: 'PCV-2026-0001',
      documentDate: '2026-09-01',
      partyCode: 'SUP-0102',
      partyName: 'QuickMart Office Supplies',
      accountCode: '610100',
      accountTitle: 'Office Supplies Expense',
      currencyCode: 'PHP',
      exchangeRate: 1,
      grossAmount: 1850,
      amount: 1850,
      netAmount: 1850,
      vatAmount: 0,
      ewtAmount: 0,
      remarks: 'Printer ink and bond paper purchase',
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, grossAmount: 1950, amount: 1950, netAmount: 1950 } as Parameters<typeof controller.update>[2];
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
