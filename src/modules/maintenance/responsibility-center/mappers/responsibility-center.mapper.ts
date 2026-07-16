import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { ResponsibilityCenterWithRelations } from '../types/responsibility-center-with-relations.type';

export function mapResponsibilityCenter(
  center: ResponsibilityCenterWithRelations,
  userNames: Map<number, string>,
) {
  return {
    id: center.id.toString(),
    code: center.code,
    name: center.name,
    classificationId: center.type.classificationId.toString(),
    classificationCode: center.type.classification.code,
    classificationName: center.type.classification.name,
    typeId: center.typeId.toString(),
    typeName: center.type.name,
    typeCodePrefix: center.type.codePrefix,
    category: center.category,
    financialType: center.financialType,
    manager: center.manager ?? '',
    parentId: center.parentId?.toString() ?? null,
    parentName: center.parent?.name ?? null,
    status: center.status,
    description: center.description ?? '',
    createdBy:
      center.createdByUserId === null
        ? SystemGeneratedAuditLabel
        : (userNames.get(center.createdByUserId) ?? null),
    createdAt: center.createdAt,
    updatedBy:
      (center.updatedByUserId && userNames.get(center.updatedByUserId)) ?? null,
    updatedAt: center.updatedAt,
  };
}
