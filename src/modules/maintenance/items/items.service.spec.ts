import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  function createService() {
    const prisma = {
      companyUser: {
        findFirst: jest.fn(),
      },
      itemBasicInfo: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      itemCategory: {
        findFirst: jest.fn(),
      },
      unitOfMeasurement: {
        findFirst: jest.fn(),
      },
      responsibilityCenter: {
        findFirst: jest.fn(),
      },
      itemPricing: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };

    return { prisma, service: new ItemsService(prisma as never) };
  }

  const mockUser = {
    id: 1,
    companyId: 10,
    role: AppRole.SUPER_ADMIN,
    activeCompanyId: 10,
  } as never;

  describe('validateCode', () => {
    it('throws BadRequestException if item code is empty or whitespace', async () => {
      const { service } = createService();
      await expect(callPrivate(service, 'validateCode', 10, '   ')).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if code already exists in the same company', async () => {
      const { prisma, service } = createService();
      prisma.itemBasicInfo.findFirst.mockResolvedValue({ id: 2n, code: 'ITEM-001' });

      await expect(callPrivate(service, 'validateCode', 10, 'ITEM-001')).rejects.toThrow(ConflictException);
      expect(prisma.itemBasicInfo.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 10,
          id: undefined,
          code: { equals: 'ITEM-001', mode: 'insensitive' },
        },
      });
    });

    it('allows code when no duplicate exists', async () => {
      const { prisma, service } = createService();
      prisma.itemBasicInfo.findFirst.mockResolvedValue(null);

      await expect(callPrivate(service, 'validateCode', 10, 'ITEM-002')).resolves.toBeUndefined();
    });
  });

  describe('validateReferences', () => {
    it('throws BadRequestException when category does not exist or is inactive', async () => {
      const { prisma, service } = createService();
      prisma.itemCategory.findFirst.mockResolvedValue(null);

      await expect(
        callPrivate(service, 'validateReferences', 10, { categoryId: '5' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when UOM does not exist or is inactive', async () => {
      const { prisma, service } = createService();
      prisma.unitOfMeasurement.findFirst.mockResolvedValue({ id: 3n, status: 'INACTIVE' });

      await expect(
        callPrivate(service, 'validateReferences', 10, { unitOfMeasurementId: '3' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when responsibility center is inactive', async () => {
      const { prisma, service } = createService();
      prisma.responsibilityCenter.findFirst.mockResolvedValue({ id: 7n, status: 'INACTIVE' });

      await expect(
        callPrivate(service, 'validateReferences', 10, { responsibilityCenterId: '7' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pricing logic', () => {
    it('returns default zero pricing when no pricing record exists', async () => {
      const { prisma, service } = createService();
      prisma.companyUser.findFirst.mockResolvedValue({ id: 1 });
      prisma.itemBasicInfo.findFirst.mockResolvedValue({ id: 100n, companyId: 10, deletedAt: null });
      prisma.itemPricing.findFirst.mockResolvedValue(null);

      const result = await service.getPricing(mockUser, '100');

      expect(result).toEqual({
        id: '',
        itemId: '100',
        cost: 0,
        sellingPrice: 0,
        suggestedPrice: 0,
        taxTreatment: null,
        updatedAt: null,
      });
    });

    it('upserts and returns item pricing details', async () => {
      const { prisma, service } = createService();
      prisma.companyUser.findFirst.mockResolvedValue({ id: 1 });
      prisma.itemBasicInfo.findFirst.mockResolvedValue({ id: 100n, companyId: 10, deletedAt: null });
      prisma.itemPricing.upsert.mockResolvedValue({
        id: 50n,
        companyId: 10,
        itemId: 100n,
        cost: new Prisma.Decimal(150),
        sellingPrice: new Prisma.Decimal(250),
        suggestedPrice: new Prisma.Decimal(230),
        taxTreatment: 'VAT 12% Exclusive',
        updatedAt: new Date('2026-09-07T10:00:00Z'),
      });

      const result = await service.upsertPricing(mockUser, '100', {
        cost: 150,
        sellingPrice: 250,
        suggestedPrice: 230,
        taxTreatment: 'VAT 12% Exclusive',
      });

      expect(result).toEqual({
        id: '50',
        itemId: '100',
        cost: 150,
        sellingPrice: 250,
        suggestedPrice: 230,
        taxTreatment: 'VAT 12% Exclusive',
        updatedAt: '2026-09-07T10:00:00.000Z',
      });
    });
  });
});

function callPrivate(service: ItemsService, methodName: string, ...args: unknown[]) {
  return (service as never as Record<string, (...values: unknown[]) => Promise<unknown>>)[methodName](...args);
}
