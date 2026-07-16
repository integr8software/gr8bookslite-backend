import type { ChartAccount } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { TaxMaintenanceWithAccounts } from '../types/tax-maintenance-with-accounts.type';

export function mapTaxMaintenance(tax: TaxMaintenanceWithAccounts, userNames: Map<number, string>) {
  return {
    id: tax.id.toString(),
    name: tax.name,
    description: tax.description ?? '',
    percentage: Number(tax.percentage),
    inputVatAccountId: tax.inputVatAccountId?.toString() ?? '',
    outputVatAccountId: tax.outputVatAccountId?.toString() ?? '',
    deferredVatAccountId: tax.deferredVatAccountId?.toString() ?? '',
    expandedWithholdingTaxAccountId: tax.expandedWithholdingTaxAccountId?.toString() ?? '',
    creditableWithholdingTaxAccountId: tax.creditableWithholdingTaxAccountId?.toString() ?? '',
    withholdingVatableTaxAccountId: tax.withholdingVatableTaxAccountId?.toString() ?? '',
    finalWithholdingTaxAccountId: tax.finalWithholdingTaxAccountId?.toString() ?? '',
    accounts: {
      inputVatAccount: mapChartAccountSummary(tax.inputVatAccount),
      outputVatAccount: mapChartAccountSummary(tax.outputVatAccount),
      deferredVatAccount: mapChartAccountSummary(tax.deferredVatAccount),
      expandedWithholdingTaxAccount: mapChartAccountSummary(tax.expandedWithholdingTaxAccount),
      creditableWithholdingTaxAccount: mapChartAccountSummary(tax.creditableWithholdingTaxAccount),
      withholdingVatableTaxAccount: mapChartAccountSummary(tax.withholdingVatableTaxAccount),
      finalWithholdingTaxAccount: mapChartAccountSummary(tax.finalWithholdingTaxAccount),
    },
    status: tax.status,
    createdBy: tax.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(tax.createdByUserId) ?? null),
    createdAt: tax.createdAt,
    updatedBy: (tax.updatedByUserId && userNames.get(tax.updatedByUserId)) ?? null,
    updatedAt: tax.updatedAt,
  };
}

function mapChartAccountSummary(account: ChartAccount | null) {
  return account
    ? {
        id: account.id.toString(),
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
      }
    : null;
}
