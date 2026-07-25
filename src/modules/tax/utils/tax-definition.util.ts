import { Prisma, TaxTreatment } from '@prisma/client';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import type { TaxDetails } from '../types/tax-details.type';

const ZeroAmountTreatments = new Set<TaxTreatment>([TaxTreatment.ZERO_RATED, TaxTreatment.EXEMPT, TaxTreatment.OUT_OF_SCOPE]);

export function normalizeTaxPercentage(treatment: TaxTreatment | undefined, percentage: number | undefined) {
  return treatment && ZeroAmountTreatments.has(treatment) ? 0 : (percentage ?? 0);
}

export function normalizeTaxRecoverable(treatment: TaxTreatment | undefined, recoverable: boolean | undefined) {
  return treatment === TaxTreatment.EXEMPT || treatment === TaxTreatment.OUT_OF_SCOPE ? false : (recoverable ?? true);
}

export function buildCreateTaxData(dto: CreateTaxDto) {
  return {
    code: dto.code.trim().toUpperCase(),
    name: dto.name.trim(),
    description: cleanOptional(dto.description),
    jurisdictionCode: dto.jurisdictionCode.trim().toUpperCase(),
    taxSystem: dto.taxSystem,
    treatment: dto.treatment,
    transactionScope: dto.transactionScope,
    percentage: new Prisma.Decimal(normalizeTaxPercentage(dto.treatment, dto.percentage)),
    calculationMethod: dto.calculationMethod,
    recoverable: normalizeTaxRecoverable(dto.treatment, dto.recoverable),
  };
}

export function buildUpdateTaxData(dto: UpdateTaxDto, currentTax: TaxDetails) {
  const shouldUpdatePercentage = dto.percentage !== undefined || dto.treatment !== undefined;
  const effectiveTreatment = dto.treatment ?? currentTax.treatment;
  const effectivePercentage = dto.percentage ?? Number(currentTax.percentage);

  return {
    ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
    ...(dto.description !== undefined ? { description: cleanOptional(dto.description) } : {}),
    ...(dto.jurisdictionCode !== undefined ? { jurisdictionCode: dto.jurisdictionCode.trim().toUpperCase() } : {}),
    ...(dto.taxSystem !== undefined ? { taxSystem: dto.taxSystem } : {}),
    ...(dto.treatment !== undefined ? { treatment: dto.treatment } : {}),
    ...(dto.transactionScope !== undefined ? { transactionScope: dto.transactionScope } : {}),
    ...(shouldUpdatePercentage
      ? {
          percentage: new Prisma.Decimal(normalizeTaxPercentage(effectiveTreatment, effectivePercentage)),
        }
      : {}),
    ...(dto.calculationMethod !== undefined ? { calculationMethod: dto.calculationMethod } : {}),
    ...(dto.recoverable !== undefined || dto.treatment !== undefined
      ? {
          recoverable: normalizeTaxRecoverable(effectiveTreatment, dto.recoverable ?? currentTax.recoverable),
        }
      : {}),
    ...(dto.status !== undefined ? { status: dto.status } : {}),
  };
}

export function shouldCreateTaxRateVersion(dto: UpdateTaxDto) {
  return dto.percentage !== undefined || dto.calculationMethod !== undefined || dto.recoverable !== undefined || dto.treatment !== undefined;
}
