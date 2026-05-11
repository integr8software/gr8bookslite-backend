import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveOnboardingBillingDto } from './dto/save-onboarding-billing.dto';
import { SelectOnboardingPlanDto } from './dto/select-onboarding-plan.dto';
import { mapSubscriptionPlan } from './mappers/SubscriptionPlan.mapper';
import {
  detectCardBrand,
  getDigitsOnly,
  passesLuhnCheck,
} from './utils/BillingCard.util';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return {
      plans: plans.map(mapSubscriptionPlan),
    };
  }

  async getDraft(user: AuthUser) {
    const draft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    return {
      draft: draft
        ? {
            plan: draft.subscriptionPlan
              ? mapSubscriptionPlan(draft.subscriptionPlan)
              : null,
            billingCycle: draft.billingCycle,
            cardholderName: draft.cardholderName,
            billingEmail: draft.billingEmail,
            billingAddress: draft.billingAddress,
            cardLast4: draft.cardLast4,
            cardBrand: draft.cardBrand,
            cardExpiryMonth: draft.cardExpiryMonth,
            cardExpiryYear: draft.cardExpiryYear,
            hasBillingSetup: draft.billingCompletedAt !== null,
            planSelectedAt: draft.planSelectedAt,
            billingCompletedAt: draft.billingCompletedAt,
          }
        : null,
    };
  }

  async selectPlan(user: AuthUser, dto: SelectOnboardingPlanDto) {
    const normalizedPlanCode = dto.planCode.trim().toUpperCase();
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        code: normalizedPlanCode,
      },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Selected subscription plan is invalid.');
    }

    const draft = await this.prisma.userOnboardingDraft.upsert({
      where: {
        userId: user.id,
      },
      update: {
        subscriptionPlanId: plan.id,
        billingCycle: dto.billingCycle,
        planSelectedAt: new Date(),
      },
      create: {
        userId: user.id,
        subscriptionPlanId: plan.id,
        billingCycle: dto.billingCycle,
        planSelectedAt: new Date(),
      },
      include: {
        subscriptionPlan: true,
      },
    });

    return {
      message: 'Onboarding plan saved.',
      draft: {
        plan: mapSubscriptionPlan(draft.subscriptionPlan ?? plan),
        billingCycle: draft.billingCycle,
      },
    };
  }

  async saveBilling(user: AuthUser, dto: SaveOnboardingBillingDto) {
    const existingDraft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    if (!existingDraft?.subscriptionPlanId || !existingDraft.billingCycle) {
      throw new BadRequestException(
        'Choose a subscription plan before saving billing details.',
      );
    }

    this.validateBillingInput(dto);

    const cardDigits = getDigitsOnly(dto.cardNumber);
    const normalizedEmail = normalizeEmail(dto.billingEmail) as string;

    const updatedDraft = await this.prisma.userOnboardingDraft.update({
      where: {
        userId: user.id,
      },
      data: {
        cardholderName: dto.cardholderName.trim(),
        billingEmail: normalizedEmail,
        billingAddress: dto.billingAddress.trim(),
        cardLast4: cardDigits.slice(-4),
        cardBrand: detectCardBrand(cardDigits),
        cardExpiryMonth: dto.expiryMonth,
        cardExpiryYear: dto.expiryYear,
        paymentMethodReference: `manual:${user.id}:${Date.now()}`,
        billingCompletedAt: new Date(),
      },
      include: {
        subscriptionPlan: true,
      },
    });

    return {
      message: 'Billing details saved for onboarding.',
      billing: {
        planCode: updatedDraft.subscriptionPlan?.code ?? null,
        billingCycle: updatedDraft.billingCycle,
        cardholderName: updatedDraft.cardholderName,
        billingEmail: updatedDraft.billingEmail,
        billingAddress: updatedDraft.billingAddress,
        cardBrand: updatedDraft.cardBrand,
        cardLast4: updatedDraft.cardLast4,
        cardExpiryMonth: updatedDraft.cardExpiryMonth,
        cardExpiryYear: updatedDraft.cardExpiryYear,
        plan: updatedDraft.subscriptionPlan
          ? mapSubscriptionPlan(updatedDraft.subscriptionPlan)
          : null,
        trialDays: updatedDraft.subscriptionPlan?.trialDays ?? 15,
      },
      nextStep: 'COMPANY_DETAILS',
    };
  }

  private validateBillingInput(dto: SaveOnboardingBillingDto) {
    const cardNumber = getDigitsOnly(dto.cardNumber);

    if (cardNumber.length < 12 || cardNumber.length > 19) {
      throw new BadRequestException('Enter a valid card number.');
    }

    if (!passesLuhnCheck(cardNumber)) {
      throw new BadRequestException('Enter a valid card number.');
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (
      dto.expiryYear < currentYear ||
      (dto.expiryYear === currentYear && dto.expiryMonth < currentMonth)
    ) {
      throw new BadRequestException('Card expiry date cannot be in the past.');
    }
  }
}
