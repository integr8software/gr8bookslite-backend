import { CompanyUnitType, Prisma, WarehouseBranchAvailabilityMode, WarehouseStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type WarehouseWriteClient = Pick<PrismaService, 'warehouse' | 'warehouseBranch' | 'companyUnit'> | Prisma.TransactionClient;

export const WarehouseMaintenanceSeedRecords = [
  {
    code: 'WH-MAIN',
    name: 'Main Warehouse',
    description: 'Primary company warehouse.',
  },
] as const;

export async function seedCompanyWarehouseMaintenanceDefaults(tx: WarehouseWriteClient, companyId: number) {
  const headOffice = await tx.companyUnit.findFirst({
    where: {
      companyId,
      type: CompanyUnitType.HEAD_OFFICE,
      isActive: true,
    },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  const existingWarehouse = await tx.warehouse.findFirst({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        ...WarehouseMaintenanceSeedRecords.map((warehouse) => ({
          code: warehouse.code,
        })),
        ...WarehouseMaintenanceSeedRecords.map((warehouse) => ({
          name: warehouse.name,
        })),
      ],
    },
    select: { id: true },
  });

  const warehouse =
    existingWarehouse ??
    (await tx.warehouse.create({
      data: {
        companyId,
        code: WarehouseMaintenanceSeedRecords[0].code,
        name: WarehouseMaintenanceSeedRecords[0].name,
        description: WarehouseMaintenanceSeedRecords[0].description,
        status: WarehouseStatus.ACTIVE,
        branchAvailabilityMode: WarehouseBranchAvailabilityMode.ALL,
        createdByUserId: null,
      },
      select: { id: true },
    }));

  if (headOffice) {
    await tx.warehouseBranch.upsert({
      where: {
        warehouseId_unitId: {
          warehouseId: warehouse.id,
          unitId: headOffice.id,
        },
      },
      update: {},
      create: {
        warehouseId: warehouse.id,
        unitId: headOffice.id,
      },
    });
  }

  return existingWarehouse ? 0 : 1;
}
