/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Inspecting Jest mock call arguments. */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ItemSupplierDto } from './dto/item-supplier.dto';
import { CreateItemBasicInfoDto, UpdateItemBasicInfoDto } from './dto/item-basic-info.dto';
import { ItemsService } from './items.service';
import { AppRole } from '../../../common/enums/app-role.enum';

const row = { supplierId: '2', supplierCode: 'SKU-2', leadTime: '3 days', cost: 12.34, isDefault: true };

describe('Item supplier validation', () => {
  it.each([
    { supplierId: '' },
    { supplierId: 'vendor-name' },
    { cost: -1 },
    { cost: 1.001 },
    { cost: Infinity },
    { cost: '12' },
    { isDefault: 'true' },
    { leadTime: '-2 days' },
    { leadTime: 'tomorrow' },
    { supplierCode: 'x'.repeat(101) },
  ])('rejects invalid supplier values: %j', async (invalid) => {
    expect((await validate(plainToInstance(ItemSupplierDto, { ...row, ...invalid }))).length).toBeGreaterThan(0);
  });

  it('accepts zero cost and optional lead time', async () => {
    expect(await validate(plainToInstance(ItemSupplierDto, { ...row, cost: 0, leadTime: '' }))).toEqual([]);
  });

  it('validates nested rows on create and patch, including null', async () => {
    for (const Dto of [CreateItemBasicInfoDto, UpdateItemBasicInfoDto]) {
      const dto = plainToInstance(Dto, { code: 'I-1', name: 'Item', categoryId: '1', unitOfMeasurementId: '1', suppliers: [{ ...row, cost: -1 }] });
      expect((await validate(dto)).some((error) => error.property === 'suppliers')).toBe(true);
      expect((await validate(plainToInstance(Dto, { ...dto, suppliers: null }))).some((error) => error.property === 'suppliers')).toBe(true);
    }
  });
});

describe('Item supplier persistence', () => {
  const user = { id: 1, companyId: 10, role: AppRole.SUPER_ADMIN } as never;
  function setup() {
    const saved = {
      id: 1n,
      categoryId: 1n,
      unitOfMeasurementId: 1n,
      category: { name: 'Category' },
      unitOfMeasurement: { symbol: 'PC' },
      tags: [],
      suppliers: [],
    };
    const prisma = {
      party: { count: jest.fn().mockResolvedValue(1) },
      itemBasicInfo: { findFirst: jest.fn().mockResolvedValue(saved), update: jest.fn().mockResolvedValue(saved) },
    };
    return { prisma, service: new ItemsService(prisma as never) };
  }

  it.each([[{ ...row, isDefault: false }], [row, { ...row, supplierId: '3' }], [row, { ...row, isDefault: false }]])(
    'rejects invalid defaults or duplicates before writing: %j',
    async (...rows) => {
      const { prisma, service } = setup();
      await expect(service.update(user, '1', { suppliers: rows })).rejects.toThrow();
      expect(prisma.itemBasicInfo.update).not.toHaveBeenCalled();
    },
  );

  it('rejects foreign-company, deleted, inactive, or non-vendor parties', async () => {
    const { prisma, service } = setup();
    prisma.party.count.mockResolvedValue(0);
    await expect(service.update(user, '1', { suppliers: [row] })).rejects.toThrow('active vendor');
    expect(prisma.party.count).toHaveBeenCalledWith({
      where: { id: { in: [2n] }, companyId: 10, deletedAt: null, status: 'ACTIVE', partyTypes: { has: 'VENDOR' } },
    });
    expect(prisma.itemBasicInfo.update).not.toHaveBeenCalled();
  });

  it('replaces suppliers inside the parent update and supports clearing all rows', async () => {
    const { prisma, service } = setup();
    await service.update(user, '1', { suppliers: [row] });
    expect(prisma.itemBasicInfo.update.mock.calls[0][0].data.suppliers).toEqual({
      deleteMany: {},
      create: [{ supplierId: 2n, supplierCode: 'SKU-2', leadTime: '3 days', cost: 12.34, isDefault: true, sortOrder: 0 }],
    });
    prisma.party.count.mockResolvedValue(0);
    await service.update(user, '1', { suppliers: [] });
    expect(prisma.itemBasicInfo.update.mock.calls[1][0].data.suppliers).toEqual({ deleteMany: {}, create: [] });
  });

  it('preserves supplier rows when omitted from a status-only patch', async () => {
    const { prisma, service } = setup();
    await service.update(user, '1', {});
    expect(prisma.itemBasicInfo.update.mock.calls[0][0].data.suppliers).toBeUndefined();
    expect(prisma.party.count).not.toHaveBeenCalled();
  });
});
