import type { ChartAccount } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { TaxMaintenanceWithAccounts } from '../types/tax-maintenance-with-accounts.type';

export function mapTaxMaintenance(
  tax: TaxMaintenanceWithAccounts,
  userNames: Map<number, string>,
) {
  return {
    id: tax.id.toString(),
    name: tax.name,
    percentage: Number(tax.percentage),
    inputVatAccountId: tax.inputVatAccountId?.toString() ?? '',
    outputVatAccountId: tax.outputVatAccountId?.toString() ?? '',
    vatPayableAccountId: tax.vatPayableAccountId?.toString() ?? '',
    deferredInputTaxAccountId: tax.deferredInputTaxAccountId?.toString() ?? '',
    deferredOutputVatAccountId:
      tax.deferredOutputVatAccountId?.toString() ?? '',
    accounts: {
      inputVatAccount: mapChartAccountSummary(tax.inputVatAccount),
      outputVatAccount: mapChartAccountSummary(tax.outputVatAccount),
      vatPayableAccount: mapChartAccountSummary(tax.vatPayableAccount),
      deferredInputTaxAccount: mapChartAccountSummary(
        tax.deferredInputTaxAccount,
      ),
      deferredOutputVatAccount: mapChartAccountSummary(
        tax.deferredOutputVatAccount,
      ),
    },
    status: tax.status,
    createdBy:
      tax.createdByUserId === null
        ? SystemGeneratedAuditLabel
        : (userNames.get(tax.createdByUserId) ?? null),
    createdAt: tax.createdAt,
    updatedBy:
      (tax.updatedByUserId && userNames.get(tax.updatedByUserId)) ?? null,
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
