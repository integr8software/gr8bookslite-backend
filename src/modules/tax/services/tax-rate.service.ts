import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxCalculationMethod, TaxMaintenanceStatus } from '@prisma/client';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { getUtcToday, parseUtcDateOnly } from '../../../common/utils/date.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTaxRateVersionDto } from '../dto/create-tax-rate-version.dto';
import { mapTaxRateVersion } from '../mappers/tax-rate-version.mapper';
import { normalizeTaxPercentage } from '../utils/tax-definition.util';
import { TaxAccessService } from './tax-access.service';

type TaxRateWriteClient = Prisma.TransactionClient;

type TaxRateSource = {
  id: bigint;
  percentage: Prisma.Decimal;
  calculationMethod: TaxCalculationMethod;
  recoverable: boolean;
  status: TaxMaintenanceStatus;
};

@Injectable()
export class TaxRateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TaxAccessService,
  ) {}

  async createRateVersion(user: AuthUser, id: string, dto: CreateTaxRateVersionDto) {
    this.access.assertCan(user, PermissionAction.UPDATE);
    const taxId = parsePositiveBigIntId(id);
    const tax = await this.findTaxRateSourceOrThrow(taxId);
    const effectiveFrom = parseUtcDateOnly(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = dto.effectiveTo ? parseUtcDateOnly(dto.effectiveTo, 'effectiveTo') : null;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom.');
    }

    const previousOpenRate = await this.prisma.taxRateVersion.findFirst({
      where: {
        taxDefinitionId: taxId,
        effectiveFrom: { lt: effectiveFrom },
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { id: true, effectiveFrom: true },
    });
    const overlap = await this.prisma.taxRateVersion.findFirst({
      where: {
        taxDefinitionId: taxId,
        id: previousOpenRate ? { not: previousOpenRate.id } : undefined,
        effectiveFrom: effectiveTo ? { lte: effectiveTo } : undefined,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
      select: { id: true },
    });
    if (overlap) {
      throw new ConflictException('The effective period overlaps an existing tax rate version.');
    }

    const rate = await this.prisma.$transaction(async (tx) => {
      if (previousOpenRate) {
        await this.closeRateBefore(tx, previousOpenRate.id, effectiveFrom);
      }

      return tx.taxRateVersion.create({
        data: {
          taxDefinitionId: taxId,
          percentage: new Prisma.Decimal(normalizeTaxPercentage(tax.treatment, dto.percentage)),
          calculationMethod: dto.calculationMethod,
          recoverablePercentage: new Prisma.Decimal(dto.recoverablePercentage ?? (tax.recoverable ? 100 : 0)),
          effectiveFrom,
          effectiveTo,
          status: dto.status ?? TaxMaintenanceStatus.ACTIVE,
        },
      });
    });

    return {
      message: 'Tax rate version created successfully.',
      rate: mapTaxRateVersion(rate),
    };
  }

  initializeCurrentRate(tx: TaxRateWriteClient, tax: TaxRateSource) {
    return tx.taxRateVersion.create({
      data: {
        taxDefinitionId: tax.id,
        percentage: tax.percentage,
        calculationMethod: tax.calculationMethod,
        recoverablePercentage: new Prisma.Decimal(tax.recoverable ? 100 : 0),
        effectiveFrom: getUtcToday(),
        status: tax.status,
      },
    });
  }

  async synchronizeCurrentRate(tx: TaxRateWriteClient, tax: TaxRateSource) {
    const effectiveFrom = getUtcToday();
    const rateData = {
      percentage: tax.percentage,
      calculationMethod: tax.calculationMethod,
      recoverablePercentage: new Prisma.Decimal(tax.recoverable ? 100 : 0),
      status: tax.status,
    };
    const existingToday = await tx.taxRateVersion.findUnique({
      where: {
        taxDefinitionId_effectiveFrom: {
          taxDefinitionId: tax.id,
          effectiveFrom,
        },
      },
    });

    if (existingToday) {
      return tx.taxRateVersion.update({
        where: { id: existingToday.id },
        data: rateData,
      });
    }

    const priorRate = await tx.taxRateVersion.findFirst({
      where: {
        taxDefinitionId: tax.id,
        effectiveFrom: { lt: effectiveFrom },
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (priorRate) {
      await this.closeRateBefore(tx, priorRate.id, effectiveFrom);
    }

    return tx.taxRateVersion.create({
      data: {
        taxDefinitionId: tax.id,
        effectiveFrom,
        ...rateData,
      },
    });
  }

  private async closeRateBefore(tx: TaxRateWriteClient, rateId: bigint, nextEffectiveFrom: Date) {
    const effectiveTo = new Date(nextEffectiveFrom);
    effectiveTo.setUTCDate(effectiveTo.getUTCDate() - 1);
    return tx.taxRateVersion.update({
      where: { id: rateId },
      data: { effectiveTo },
    });
  }

  private async findTaxRateSourceOrThrow(taxId: bigint) {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: { id: taxId, deletedAt: null },
      select: {
        id: true,
        percentage: true,
        calculationMethod: true,
        recoverable: true,
        status: true,
        treatment: true,
      },
    });

    if (!tax) {
      throw new NotFoundException('Tax record not found.');
    }

    return tax;
  }
}
