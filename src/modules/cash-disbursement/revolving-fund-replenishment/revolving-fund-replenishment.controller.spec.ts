import { PATH_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { RevolvingFundReplenishmentController } from './revolving-fund-replenishment.controller';
import { RevolvingFundReplenishmentService } from './revolving-fund-replenishment.service';

describe('RevolvingFundReplenishmentController', () => {
  const service = {
    suggestTransactionNumber: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new RevolvingFundReplenishmentController(service as unknown as RevolvingFundReplenishmentService);
  const user = { id: 1, companyId: 2 } as AuthUser;

  beforeEach(() => jest.clearAllMocks());

  it('exposes the canonical transaction-number route', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(PATH_METADATA, RevolvingFundReplenishmentController.prototype.suggestTransactionNumber)).toBe('transaction-number');
  });

  it('delegates transaction number suggestions to the service', async () => {
    const response = { branchUnitId: 3, inputMode: 'AUTO', transactionNo: 'RFR-0001' };
    service.suggestTransactionNumber.mockResolvedValue(response);

    await expect(controller.suggestTransactionNumber(user, 3)).resolves.toBe(response);
    expect(service.suggestTransactionNumber).toHaveBeenCalledWith(user, 3);
  });

  it('delegates the complete revolving-fund replenishment workflow with realistic data', async () => {
    const id = '501';
    const query = { page: 1, limit: 20, search: 'Operations replenishment' } as Parameters<typeof controller.findAll>[1];
    const createDto = {
      branchUnitId: 3,
      transactionNo: 'RFR-2026-0001',
      documentDate: '2026-09-01',
      partyId: '52',
      partyCode: 'EMP-0052',
      partyName: 'Ana Reyes',
      accountId: '18',
      accountCode: '100300',
      accountTitle: 'Revolving Fund',
      currencyCode: 'PHP',
      exchangeRate: 1,
      amount: 16750,
      remarks: 'September operations fund replenishment',
      details: [
        { lineNumber: 1, revolvingFundNo: 'RF-EXP-0142', particulars: 'Courier and delivery costs', amount: 6750 },
        { lineNumber: 2, revolvingFundNo: 'RF-EXP-0143', particulars: 'Emergency equipment repair', amount: 10000 },
      ],
    } as Parameters<typeof controller.create>[1];
    const updateDto = { ...createDto, amount: 17000, remarks: 'Replenishment with corrected expense total' } as Parameters<typeof controller.update>[2];
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
