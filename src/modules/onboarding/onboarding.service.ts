import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveOnboardingBillingDto } from './dto/save-onboarding-billing.dto';
import { SaveOnboardingCompanyDetailsDto } from './dto/save-onboarding-company-details.dto';
import { SelectOnboardingPlanDto } from './dto/select-onboarding-plan.dto';
import { mapSubscriptionPlan } from './mappers/SubscriptionPlan.mapper';
import {
  detectCardBrand,
  getDigitsOnly,
  passesLuhnCheck,
} from './utils/BillingCard.util';
import {
  getOnboardingDateParts,
  getSyncedReportEndDate,
  isValidOnboardingDateValue,
} from './utils/OnboardingDate.util';
import {
  buildCompanyDisplayName,
  buildSlugBase,
  getTrialEndsAt,
} from './utils/OnboardingFinalize.util';

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
            hasCompanyDetails: draft.companyDetailsCompletedAt !== null,
            planSelectedAt: draft.planSelectedAt,
            billingCompletedAt: draft.billingCompletedAt,
            companyDetails: {
              taxpayerType:
                draft.taxpayerType === 'INDIVIDUAL'
                  ? 'individual'
                  : draft.taxpayerType === 'NON_INDIVIDUAL'
                    ? 'non-individual'
                    : null,
              lastName: draft.ownerLastName,
              firstName: draft.ownerFirstName,
              middleName: draft.ownerMiddleName,
              companyName: draft.companyName,
              nonIndividualType: draft.organizationType,
              nonIndividualTypeOther: draft.organizationTypeOther,
              logoName: draft.logoFileName,
              logoMimeType: draft.logoMimeType,
              address: draft.address,
              tin: draft.tin,
              website: draft.website,
              contactNumber: draft.contactNumber,
              reportStartDate: draft.reportStartDate
                ? draft.reportStartDate.toISOString().slice(0, 10)
                : null,
              reportEndDate: draft.reportEndDate
                ? draft.reportEndDate.toISOString().slice(0, 10)
                : null,
            },
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

  async saveCompanyDetails(
    user: AuthUser,
    dto: SaveOnboardingCompanyDetailsDto,
  ) {
    const existingDraft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (
      !existingDraft?.subscriptionPlanId ||
      !existingDraft.billingCompletedAt
    ) {
      throw new BadRequestException(
        'Complete plan selection and billing before saving company details.',
      );
    }

    this.validateCompanyDetailsInput(dto);

    const reportStartDate = new Date(`${dto.reportStartDate}T00:00:00.000Z`);
    const reportEndDate = new Date(`${dto.reportEndDate}T00:00:00.000Z`);
    const isIndividual = dto.taxpayerType === 'individual';

    const updatedDraft = await this.prisma.userOnboardingDraft.update({
      where: {
        userId: user.id,
      },
      data: {
        taxpayerType: isIndividual ? 'INDIVIDUAL' : 'NON_INDIVIDUAL',
        ownerLastName: isIndividual ? (dto.lastName?.trim() ?? null) : null,
        ownerFirstName: isIndividual ? (dto.firstName?.trim() ?? null) : null,
        ownerMiddleName: isIndividual ? dto.middleName?.trim() || null : null,
        companyName: isIndividual ? null : (dto.companyName?.trim() ?? null),
        organizationType: isIndividual
          ? null
          : (dto.nonIndividualType?.trim() ?? null),
        organizationTypeOther: isIndividual
          ? null
          : dto.nonIndividualTypeOther?.trim() || null,
        logoFileName: dto.logoName.trim(),
        logoMimeType: dto.logoMimeType?.trim() || null,
        address: dto.address.trim(),
        tin: dto.tin.trim(),
        website: dto.website?.trim() || null,
        contactNumber: dto.contactNumber.trim(),
        reportStartDate,
        reportEndDate,
        companyDetailsCompletedAt: new Date(),
      },
    });

    return {
      message: 'Company details saved for onboarding.',
      companyDetails: {
        taxpayerType: dto.taxpayerType,
        lastName: updatedDraft.ownerLastName,
        firstName: updatedDraft.ownerFirstName,
        middleName: updatedDraft.ownerMiddleName,
        companyName: updatedDraft.companyName,
        nonIndividualType: updatedDraft.organizationType,
        nonIndividualTypeOther: updatedDraft.organizationTypeOther,
        logoName: updatedDraft.logoFileName,
        logoMimeType: updatedDraft.logoMimeType,
        address: updatedDraft.address,
        tin: updatedDraft.tin,
        website: updatedDraft.website,
        contactNumber: updatedDraft.contactNumber,
        reportStartDate: dto.reportStartDate,
        reportEndDate: dto.reportEndDate,
      },
      nextStep: 'REVIEW_DETAILS',
    };
  }

  async complete(user: AuthUser) {
    const draft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    if (!draft || !draft.subscriptionPlan) {
      throw new BadRequestException(
        'Complete the onboarding draft before finalizing setup.',
      );
    }

    this.validateCompletionDraft(draft);
    const subscriptionPlan = draft.subscriptionPlan;

    const completedAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const companyName = buildCompanyDisplayName({
        taxpayerType: draft.taxpayerType as 'INDIVIDUAL' | 'NON_INDIVIDUAL',
        companyName: draft.companyName,
        ownerFirstName: draft.ownerFirstName,
        ownerLastName: draft.ownerLastName,
      });
      const slug = await this.generateUniqueCompanySlug(tx, companyName);

      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
          legalName:
            draft.taxpayerType === 'NON_INDIVIDUAL'
              ? (draft.companyName?.trim() ?? companyName)
              : companyName,
          taxpayerType: draft.taxpayerType,
          ownerLastName: draft.ownerLastName,
          ownerFirstName: draft.ownerFirstName,
          ownerMiddleName: draft.ownerMiddleName,
          organizationType: draft.organizationType,
          organizationTypeOther: draft.organizationTypeOther,
          logoFileName: draft.logoFileName,
          logoMimeType: draft.logoMimeType,
          address: draft.address,
          tin: draft.tin,
          website: draft.website,
          contactNumber: draft.contactNumber,
          reportStartDate: draft.reportStartDate,
          reportEndDate: draft.reportEndDate,
          status: 'ACTIVE',
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          joinedAt: completedAt,
        },
      });

      const subscription = await tx.companySubscription.create({
        data: {
          companyId: company.id,
          subscriptionPlanId: draft.subscriptionPlanId!,
          billingCycle: draft.billingCycle!,
          status: SubscriptionStatus.TRIALING,
          startsAt: completedAt,
          trialEndsAt: getTrialEndsAt(completedAt, subscriptionPlan.trialDays),
        },
        include: {
          plan: true,
        },
      });

      await tx.userOnboardingDraft.delete({
        where: {
          userId: user.id,
        },
      });

      return {
        company,
        subscription,
      };
    });

    return {
      message: 'Onboarding completed successfully.',
      company: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
        status: result.company.status,
      },
      subscription: {
        id: result.subscription.id,
        plan: mapSubscriptionPlan(result.subscription.plan),
        billingCycle: result.subscription.billingCycle,
        status: result.subscription.status,
        startsAt: result.subscription.startsAt,
        trialEndsAt: result.subscription.trialEndsAt,
      },
      nextStep: 'APP_READY',
      requiresReauthentication: true,
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

  private validateCompanyDetailsInput(dto: SaveOnboardingCompanyDetailsDto) {
    if (!isValidOnboardingDateValue(dto.reportStartDate)) {
      throw new BadRequestException('Select a valid report start date.');
    }

    if (!isValidOnboardingDateValue(dto.reportEndDate)) {
      throw new BadRequestException('Select a valid report end date.');
    }

    const syncedEndDate = getSyncedReportEndDate(dto.reportStartDate);

    if (syncedEndDate && dto.reportEndDate !== syncedEndDate) {
      throw new BadRequestException(
        'End date must sync to a 1-year report period.',
      );
    }

    const start = getOnboardingDateParts(dto.reportStartDate);
    const end = getOnboardingDateParts(dto.reportEndDate);

    if (!start || !end || end.date.getTime() < start.date.getTime()) {
      throw new BadRequestException(
        'Report end date must be after the report start date.',
      );
    }
  }

  private validateCompletionDraft(
    draft: Prisma.UserOnboardingDraftGetPayload<{
      include: { subscriptionPlan: true };
    }>,
  ) {
    if (!draft.subscriptionPlanId || !draft.subscriptionPlan) {
      throw new BadRequestException('Select a subscription plan first.');
    }

    if (!draft.billingCycle || !draft.billingCompletedAt) {
      throw new BadRequestException(
        'Complete billing before finalizing onboarding.',
      );
    }

    if (!draft.companyDetailsCompletedAt || !draft.taxpayerType) {
      throw new BadRequestException(
        'Complete company details before finalizing onboarding.',
      );
    }
  }

  private async generateUniqueCompanySlug(
    tx: Prisma.TransactionClient,
    companyName: string,
  ) {
    const baseSlug = buildSlugBase(companyName);
    let slug = baseSlug;
    let suffix = 2;

    while (
      await tx.company.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }
}
