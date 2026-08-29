import { RevolvingFundDetailDto } from '../dto/revolving-fund-detail.dto';
import { RevolvingFundResponseDto } from '../dto/revolving-fund-response.dto';
import {
  RevolvingFundDetailWithRelations,
  RevolvingFundWithDetails,
} from '../types/revolving-fund-with-details.type';

export class RevolvingFundMapper {
  static toResponseDto(record: RevolvingFundWithDetails): RevolvingFundResponseDto {
    return {
      id: record.id.toString(),
      companyId: record.companyId,
      branchUnitId: record.branchUnitId,
      transactionNo: record.transactionNo,
      documentDate: record.documentDate.toISOString().slice(0, 10),
      partyId: record.partyId?.toString() ?? null,
      partyCodeSnapshot: record.partyCodeSnapshot,
      partyNameSnapshot: record.partyNameSnapshot,
      partyCode: record.party?.partyCodeNo ?? record.partyCodeSnapshot,
      partyName: record.party?.partyName ?? record.partyNameSnapshot,
      creditAccountId: record.creditAccountId?.toString() ?? null,
      accountId: record.creditAccountId?.toString() ?? null,
      accountCodeSnapshot: record.accountCodeSnapshot,
      accountTitleSnapshot: record.accountTitleSnapshot,
      accountCode: record.creditAccount?.accountCode ?? record.accountCodeSnapshot,
      accountTitle: record.creditAccount?.accountTitle ?? record.accountTitleSnapshot,
      responsibilityCenterId: record.responsibilityCenterId?.toString() ?? null,
      responsibilityCenterCodeSnapshot: record.responsibilityCenterCodeSnapshot,
      responsibilityCenterSnapshot: record.responsibilityCenterSnapshot,
      responsibilityCenterCode: record.responsibilityCenter?.code ?? record.responsibilityCenterCodeSnapshot,
      responsibilityCenter: record.responsibilityCenter?.name ?? record.responsibilityCenterSnapshot,
      projectCode: record.projectCode,
      projectName: record.projectName,
      currencyCode: record.currencyCode,
      currency: record.currencyCode,
      exchangeRate: Number(record.exchangeRate),
      amount: Number(record.amount),
      remarks: record.remarks,
      status: record.status,
      details: (record.details ?? []).map((detail) => this.toDetailDto(detail)),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  static toDetailDto(detail: RevolvingFundDetailWithRelations): RevolvingFundDetailDto {
    return {
      id: detail.id.toString(),
      lineNumber: detail.lineNumber,
      date: detail.date ? detail.date.toISOString().slice(0, 10) : undefined,
      partyId: detail.partyId?.toString() ?? undefined,
      supplierCodeSnapshot: detail.supplierCodeSnapshot ?? undefined,
      supplierNameSnapshot: detail.supplierNameSnapshot ?? undefined,
      supplierCode: detail.party?.partyCodeNo ?? detail.supplierCodeSnapshot ?? undefined,
      supplierName: detail.party?.partyName ?? detail.supplierNameSnapshot ?? undefined,
      orNo: detail.orNo ?? undefined,
      tinNo: detail.tinNo ?? undefined,
      particulars: detail.particulars ?? undefined,
      remarks: detail.remarks ?? undefined,
      amount: Number(detail.amount),
      grossAmount: Number(detail.grossAmount),
      netAmount: Number(detail.netAmount),
      disburseAmount: Number(detail.disburseAmount),
      vatType: detail.vatType ?? undefined,
      vatPercent: Number(detail.vatPercent),
      vatAmount: Number(detail.vatAmount),
      ewtCode: detail.ewtCode ?? undefined,
      ewtPercent: Number(detail.ewtPercent),
      ewtAmount: Number(detail.ewtAmount),
      expenseType: detail.expenseType ?? undefined,
      responsibilityCenterId: detail.responsibilityCenterId?.toString() ?? undefined,
      responsibilityCenterCodeSnapshot: detail.responsibilityCenterCodeSnapshot ?? undefined,
      responsibilityCenterSnapshot: detail.responsibilityCenterSnapshot ?? undefined,
      responsibilityCenterCode: detail.responsibilityCenter?.code ?? detail.responsibilityCenterCodeSnapshot ?? undefined,
      responsibilityCenter: detail.responsibilityCenter?.name ?? detail.responsibilityCenterSnapshot ?? undefined,
    };
  }
}
