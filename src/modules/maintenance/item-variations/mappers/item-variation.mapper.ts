import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { ItemVariationWithValues } from '../types/item-variation-with-values.type';

export function mapItemVariation(variation: ItemVariationWithValues, userNames: Map<number, string>) {
  return {
    id: variation.id.toString(),
    code: variation.code,
    name: variation.name,
    usage: variation.usage,
    values: variation.values.map((value) => ({
      id: value.id.toString(),
      label: value.label,
      isUsed: value.isUsed,
      status: value.status,
    })),
    requiredOnItem: variation.requiredOnItem,
    affectsStock: variation.affectsStock,
    status: variation.status,
    createdBy: variation.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(variation.createdByUserId) ?? null),
    createdAt: variation.createdAt,
    updatedBy: (variation.updatedByUserId && userNames.get(variation.updatedByUserId)) ?? null,
    updatedAt: variation.updatedAt,
  };
}
