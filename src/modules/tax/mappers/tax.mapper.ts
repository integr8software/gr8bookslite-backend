import { SystemGeneratedAuditLabel } from '../../../common/utils/audit-user.util';
import type { TaxDetails } from '../types/tax-details.type';

export function mapTax(tax: TaxDetails, userNames: Map<number, string>) {
  const now = new Date();
  const currentRate =
    tax.rateVersions.find((rate) => rate.status === 'ACTIVE' && rate.effectiveFrom <= now && (!rate.effectiveTo || rate.effectiveTo >= now)) ?? null;

  return {
    id: tax.id.toString(),
    code: tax.code,
    name: tax.name,
    description: tax.description ?? '',
    jurisdictionCode: tax.jurisdictionCode,
    taxSystem: tax.taxSystem,
    treatment: tax.treatment,
    transactionScope: tax.transactionScope,
    percentage: Number(currentRate?.percentage ?? tax.percentage),
    calculationMethod: currentRate?.calculationMethod ?? tax.calculationMethod,
    recoverable: currentRate ? Number(currentRate.recoverablePercentage) > 0 : tax.recoverable,
    sourceTemplateCode: tax.sourceTemplateCode ?? '',
    sourceTemplateVersion: tax.sourceTemplateVersion,
    sortOrder: tax.sortOrder,
    status: tax.status,
    createdBy: tax.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(tax.createdByUserId) ?? null),
    createdAt: tax.createdAt,
    updatedBy: (tax.updatedByUserId && userNames.get(tax.updatedByUserId)) ?? null,
    updatedAt: tax.updatedAt,
    rateVersions: tax.rateVersions.map((rate) => ({
      id: rate.id.toString(),
      percentage: rate.percentage.toString(),
      calculationMethod: rate.calculationMethod,
      recoverablePercentage: rate.recoverablePercentage.toString(),
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo,
      status: rate.status,
    })),
    postingRules: tax.postingRules.map((rule) => ({
      id: rule.id.toString(),
      transactionScope: rule.transactionScope,
      postingEvent: rule.postingEvent,
      accountRole: rule.accountRole,
      entrySide: rule.entrySide,
      amountSource: rule.amountSource,
      priority: rule.priority,
      isActive: rule.isActive,
    })),
  };
}
