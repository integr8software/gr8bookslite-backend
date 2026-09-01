import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { DisbursementVoucherController } from './disbursement-voucher.controller';
import { DisbursementVoucherService } from './disbursement-voucher.service';
import type { GetDisbursementVoucherListQueryDto } from './dto/get-disbursement-voucher-list-query.dto';

describe('DisbursementVoucherController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new DisbursementVoucherController(service as unknown as DisbursementVoucherService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, DisbursementVoucherController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const query = { branchUnitId: 3 } as GetDisbursementVoucherListQueryDto;
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'DV-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, query)).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, 3);
  });

  it('delegates the complete disbursement-voucher workflow with realistic data', async () => {
    const id = '35b8399b-6857-4104-a940-daf7cd83512b';
    const query = { page: 1, limit: 20, branchUnitId: 3, status: 'DRAFT' } as GetDisbursementVoucherListQueryDto;
    const createDto = {
      branchUnitId: 3,
      transactionNo: 'DV-2026-0001',
      voucherNo: 'DV-2026-0001',
      documentDate: '2026-09-01',
      partyCode: 'SUP-001',
      partyName: 'Pacific Office Supplies',
      creditAccountCode: '100100',
      creditAccountTitle: 'Cash in Bank',
      paymentMethod: 'Check',
      paymentDetails: { bankAccountCode: '100200', checkNo: 'CHK-0001', checkDate: '2026-09-01' },
      currencyCode: 'PHP',
      exchangeRate: 1,
      amount: 12500,
      remarks: 'Payment for office equipment',
      details: [{ lineNumber: 1, accountCode: '610100', accountTitle: 'Office Supplies Expense', debit: 12500, credit: 0 }],
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, remarks: 'Updated office equipment payment' };
    const statusDto = { status: 'FOR_APPROVAL' };
    const record = { id, ...createDto, status: 'DRAFT' };
    const list = { data: [record], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };

    service.findAll.mockResolvedValue(list);
    service.findOne.mockResolvedValue(record);
    service.create.mockResolvedValue(record);
    service.update.mockResolvedValue({ ...record, ...updateDto });
    service.updateStatus.mockResolvedValue({ ...record, status: 'FOR_APPROVAL' });
    service.remove.mockResolvedValue({ message: 'Disbursement Voucher cancelled.' });

    await expect(controller.findAll(user, query)).resolves.toBe(list);
    await expect(controller.findOne(user, id, query)).resolves.toBe(record);
    await expect(controller.create(user, createDto)).resolves.toBe(record);
    await controller.updatePut(user, id, updateDto);
    await controller.updatePatch(user, id, updateDto);
    await controller.updateStatus(user, id, statusDto);
    await controller.remove(user, id);

    expect(service.findAll).toHaveBeenCalledWith(user, query);
    expect(service.findOne).toHaveBeenCalledWith(user, id, 3);
    expect(service.create).toHaveBeenCalledWith(user, createDto);
    expect(service.update).toHaveBeenNthCalledWith(1, user, id, updateDto);
    expect(service.update).toHaveBeenNthCalledWith(2, user, id, updateDto);
    expect(service.updateStatus).toHaveBeenCalledWith(user, id, statusDto);
    expect(service.remove).toHaveBeenCalledWith(user, id);
  });
});
