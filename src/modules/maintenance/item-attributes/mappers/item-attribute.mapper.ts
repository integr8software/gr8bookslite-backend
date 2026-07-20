import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { ItemAttributeWithValues } from '../types/item-attribute-with-values.type';

export function mapItemAttribute(attribute: ItemAttributeWithValues, userNames: Map<number, string>) {
  return {
    id: attribute.id.toString(),
    code: attribute.code,
    name: attribute.name,
    usage: attribute.usage,
    values: attribute.values.map((value) => ({
      id: value.id.toString(),
      label: value.label,
      isUsed: value.isUsed,
      status: value.status,
    })),
    requiredOnItem: attribute.requiredOnItem,
    affectsStock: attribute.affectsStock,
    status: attribute.status,
    createdBy: attribute.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(attribute.createdByUserId) ?? null),
    createdAt: attribute.createdAt,
    updatedBy: (attribute.updatedByUserId && userNames.get(attribute.updatedByUserId)) ?? null,
    updatedAt: attribute.updatedAt,
  };
}
