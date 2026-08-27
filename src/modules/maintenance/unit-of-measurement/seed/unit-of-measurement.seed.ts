import { Prisma, UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type UnitOfMeasurementWriteClient = Pick<PrismaService, 'unitOfMeasurement'> | Prisma.TransactionClient;

export const UnitOfMeasurementSeedRecords = [
  { name: 'Piece', symbol: 'PC', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Pair', symbol: 'PR', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Set', symbol: 'SET', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Dozen', symbol: 'DOZ', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Pack', symbol: 'PK', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Sachet', symbol: 'SCH', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Box', symbol: 'BOX', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Carton', symbol: 'CTN', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Case', symbol: 'CASE', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Bag', symbol: 'BAG', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Sack', symbol: 'SACK', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Bundle', symbol: 'BDL', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Roll', symbol: 'ROLL', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Reel', symbol: 'REEL', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Sheet', symbol: 'SHT', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Ream', symbol: 'REAM', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Bottle', symbol: 'BTL', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Can', symbol: 'CAN', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Jar', symbol: 'JAR', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Pouch', symbol: 'PCH', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Tube', symbol: 'TUBE', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Tray', symbol: 'TRAY', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Pail', symbol: 'PAIL', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Drum', symbol: 'DRM', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Pallet', symbol: 'PLT', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Crate', symbol: 'CRT', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Kit', symbol: 'KIT', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Kilogram', symbol: 'KG', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Gram', symbol: 'G', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Metric Ton', symbol: 'MT', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Pound', symbol: 'LB', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Liter', symbol: 'L', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Milliliter', symbol: 'ML', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Gallon', symbol: 'GAL', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Cubic Meter', symbol: 'M3', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Meter', symbol: 'M', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Centimeter', symbol: 'CM', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Millimeter', symbol: 'MM', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Inch', symbol: 'IN', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Foot', symbol: 'FT', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Yard', symbol: 'YD', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Square Meter', symbol: 'M2', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Square Foot', symbol: 'FT2', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Cubic Foot', symbol: 'FT3', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Hour', symbol: 'HR', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Day', symbol: 'DAY', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
  { name: 'Month', symbol: 'MO', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Job', symbol: 'JOB', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Session', symbol: 'SESSION', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
  { name: 'Trip', symbol: 'TRIP', quantityMode: UnitOfMeasurementQuantityMode.INTEGER },
] as const;

export async function seedCompanyUnitOfMeasurementDefaults(tx: UnitOfMeasurementWriteClient, companyId: number) {
  const existingUnits = await tx.unitOfMeasurement.findMany({
    where: {
      companyId,
      OR: [
        { name: { in: UnitOfMeasurementSeedRecords.map((unit) => unit.name), mode: 'insensitive' } },
        { symbol: { in: UnitOfMeasurementSeedRecords.map((unit) => unit.symbol), mode: 'insensitive' } },
      ],
    },
    select: { name: true, symbol: true },
  });
  const existingNames = new Set(existingUnits.map((unit) => unit.name.toLowerCase()));
  const existingSymbols = new Set(existingUnits.map((unit) => unit.symbol.toUpperCase()));
  const missingUnits = UnitOfMeasurementSeedRecords.filter(
    (unit) => !existingNames.has(unit.name.toLowerCase()) && !existingSymbols.has(unit.symbol.toUpperCase()),
  );

  if (missingUnits.length === 0) {
    return 0;
  }

  const result = await tx.unitOfMeasurement.createMany({
    data: missingUnits.map((unit) => ({
      companyId,
      name: unit.name,
      symbol: unit.symbol,
      quantityMode: unit.quantityMode,
      status: UnitOfMeasurementStatus.ACTIVE,
      createdByUserId: null,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
