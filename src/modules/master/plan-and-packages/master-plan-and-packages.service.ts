import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingCycle, BillingIntervalUnit, Prisma, SubscriptionPlanStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMasterPlanAndPackageDto } from './dto/create-master-plan-and-package.dto';
import { mapMasterPlanAndPackage, masterPlanAndPackageInclude } from './mappers/MasterPlanAndPackage.mapper';

@Injectable()
export class MasterPlanAndPackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      include: masterPlanAndPackageInclude,
      orderBy: [{ scope: 'asc' }, { id: 'asc' }],
    });

    return {
      plans: plans.map(mapMasterPlanAndPackage),
    };
  }

  async createPlan(dto: CreateMasterPlanAndPackageDto) {
    const normalizedCode = this.normalizeCode(dto.code);
    const normalizedSystemCodes = this.normalizeCodes(dto.systemCodes);
    const normalizedPrices = this.normalizePrices(dto.prices);
    const normalizedUsageRules = this.normalizeUsageRules(dto.usageRules);
    const normalizedDiscountTiers = this.normalizeDiscountTiers(dto.discountTiers);

    if (normalizedSystemCodes.length === 0) {
      throw new BadRequestException('Select at least one system.');
    }
    const selectedSystems = await this.prisma.moduleSystem.findMany({
      where: { code: { in: normalizedSystemCodes }, isActive: true },
      select: { id: true, code: true },
    });
    if (selectedSystems.length !== normalizedSystemCodes.length) {
      throw new BadRequestException('One or more system codes are invalid.');
    }
    const systemIdByCode = new Map(selectedSystems.map((system) => [system.code, system.id]));

    const monthlyPrice = normalizedPrices.find((price) => price.billingCycle === BillingCycle.MONTHLY);
    const yearlyPrice = normalizedPrices.find((price) => price.billingCycle === BillingCycle.YEARLY);

    if (!monthlyPrice || !yearlyPrice) {
      throw new BadRequestException('Monthly and yearly prices are required.');
    }

    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        code: normalizedCode,
      },
      select: {
        id: true,
      },
    });

    if (existingPlan) {
      throw new BadRequestException('A plan with this code already exists.');
    }

    const isActive = dto.status === SubscriptionPlanStatus.ACTIVE;
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        code: normalizedCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        currency: 'PHP',
        scope: dto.scope,
        status: dto.status,
        trialDays: dto.trialDays,
        isActive,
        prices: {
          create: normalizedPrices.map((price) => ({
            billingCycle: price.billingCycle,
            intervalCount: price.intervalCount,
            intervalUnit: price.intervalUnit,
            priceInCents: price.priceInCents,
            compareAtInCents: price.compareAtInCents ?? null,
            isActive,
          })),
        },
        usageRules: {
          create: normalizedUsageRules.map((rule) => ({
            metric: rule.metric,
            freeCount: rule.freeCount,
            unitPriceInCents: rule.unitPriceInCents,
            isActive,
          })),
        },
        discountTiers: {
          create: normalizedDiscountTiers.map((tier) => ({
            metric: tier.metric,
            thresholdCount: tier.thresholdCount,
            discountPercent: new Prisma.Decimal(tier.discountPercent),
            isActive,
          })),
        },
        systems: {
          create: normalizedSystemCodes.map((systemCode) => ({
            systemId: systemIdByCode.get(systemCode)!,
            isEnabled: true,
          })),
        },
      },
      include: masterPlanAndPackageInclude,
    });

    return {
      message: 'Plan created.',
      plan: mapMasterPlanAndPackage(plan),
    };
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }

  private normalizeCodes(codes: string[]) {
    return [...new Set(codes.map((code) => code.trim().toUpperCase()).filter((code) => code.length > 0))];
  }

  private normalizePrices(prices: CreateMasterPlanAndPackageDto['prices']) {
    const uniquePrices = new Map<BillingCycle, (typeof prices)[number]>();

    for (const price of prices) {
      uniquePrices.set(price.billingCycle, {
        ...price,
        intervalCount: price.intervalCount || 1,
        intervalUnit: price.intervalUnit || (price.billingCycle === BillingCycle.YEARLY ? BillingIntervalUnit.YEAR : BillingIntervalUnit.MONTH),
      });
    }

    return [...uniquePrices.values()];
  }

  private normalizeUsageRules(usageRules: CreateMasterPlanAndPackageDto['usageRules']) {
    return [...new Map(usageRules.map((rule) => [rule.metric, rule])).values()];
  }

  private normalizeDiscountTiers(discountTiers: CreateMasterPlanAndPackageDto['discountTiers']) {
    return [...discountTiers].sort((left, right) => left.metric.localeCompare(right.metric) || left.thresholdCount - right.thresholdCount);
  }
}
