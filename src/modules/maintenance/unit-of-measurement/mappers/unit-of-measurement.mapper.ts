import type { UnitOfMeasurement } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';

export function mapUnitOfMeasurement(unit: UnitOfMeasurement, userNames: Map<number, string>) {
  return {
    id: unit.id.toString(),
    name: unit.name,
    symbol: unit.symbol,
    quantityMode: unit.quantityMode,
    status: unit.status,
    createdBy: unit.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(unit.createdByUserId) ?? null),
    createdAt: unit.createdAt,
    updatedBy: (unit.updatedByUserId && userNames.get(unit.updatedByUserId)) ?? null,
    updatedAt: unit.updatedAt,
  };
}
