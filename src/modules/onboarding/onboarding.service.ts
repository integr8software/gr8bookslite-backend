import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CompanyUnitType, MembershipRole, MembershipStatus, Prisma, SubscriptionPlanScope, SubscriptionPlanStatus, SubscriptionStatus } from '@prisma/client';
import { AppRole } from '../../common/enums/app-role.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuthMailService } from '../auth/services/auth-mail.service';
import { seedCompanyTermMaintenanceDefaults } from '../maintenance/term-maintenance/seed/term-maintenance.seed';
import { seedCompanyPaymentTypeMaintenanceDefaults } from '../maintenance/payment-type-maintenance/seed/payment-type-maintenance.seed';
import { seedCompanyChartAccountDefaults } from '../maintenance/chart-of-accounts/seed/chart-of-accounts.seed';
import { seedCompanyDefaultAccountDefaults } from '../maintenance/default-account/seed/default-accounts.seed';
import { seedCompanyDiscountMaintenanceDefaults } from '../maintenance/discount-maintenance/seed/discount-maintenance.seed';
import { seedCompanyBankAccountDefaults } from '../maintenance/bank-masterfile/seed/bank-masterfile.seed';
import { seedCompanyResponsibilityCenterDefaults } from '../maintenance/responsibility-center/seed/responsibility-center.seed';
import { seedCompanyTaxMaintenanceDefaults } from '../maintenance/tax-maintenance/seed/tax-maintenance.seed';
import { SaveOnboardingBillingDto } from './dto/save-onboarding-billing.dto';
import { SaveOnboardingCompanyDetailsDto } from './dto/save-onboarding-company-details.dto';
import { SelectOnboardingPlanDto } from './dto/select-onboarding-plan.dto';
import { mapSubscriptionPlan } from './mappers/SubscriptionPlan.mapper';
import { OnboardingLogoStorageService } from './services/onboarding-logo-storage.service';
import type { UploadedLogoFile } from './types/uploaded-logo-file.type';
import { getOnboardingDateParts, getSyncedReportEndDate, isValidOnboardingDateValue } from './utils/OnboardingDate.util';
import { buildCompanyLogoStoragePath, buildCompanyDisplayName, buildSlugBase } from './utils/OnboardingFinalize.util';
import { validateOnboardingLogoFile } from './utils/OnboardingLogoUpload.util';

const subscriptionPlanInclude = Prisma.validator<Prisma.SubscriptionPlanInclude>()({
  prices: {
    where: { isActive: true },
    orderBy: [{ billingCycle: 'asc' }],
  },
  usageRules: {
    where: { isActive: true },
    orderBy: [{ metric: 'asc' }],
  },
  discountTiers: {
    where: { isActive: true },
    orderBy: [{ metric: 'asc' }, { thresholdCount: 'asc' }],
  },
  modules: {
    include: { module: true },
    orderBy: [{ module: { code: 'asc' } }],
  },
  systems: {
    include: {
      system: {
        include: {
          modules: {
            include: { module: true },
            where: { isActive: true, module: { isActive: true } },
          },
        },
      },
    },
  },
});

type OnboardingSubscriptionPlan = Prisma.SubscriptionPlanGetPayload<{
  include: typeof subscriptionPlanInclude;
}>;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly onboardingLogoStorageService: OnboardingLogoStorageService,
    private readonly jwtService: JwtService,
    private readonly authMailService: AuthMailService,
  ) {}

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        scope: SubscriptionPlanScope.ONBOARDING,
        status: SubscriptionPlanStatus.ACTIVE,
      },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: [{ billingCycle: 'asc' }],
        },
        usageRules: {
          where: { isActive: true },
          orderBy: [{ metric: 'asc' }],
        },
        discountTiers: {
          where: { isActive: true },
          orderBy: [{ metric: 'asc' }, { thresholdCount: 'asc' }],
        },
        systems: {
          include: {
            system: {
              include: {
                modules: {
                  include: { module: true },
                  where: { isActive: true, module: { isActive: true } },
                },
              },
            },
          },
        },
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
        subscriptionPlan: {
          include: subscriptionPlanInclude,
        },
      },
    });

    return {
      draft: draft
        ? {
            plan: draft.subscriptionPlan ? mapSubscriptionPlan(draft.subscriptionPlan) : null,
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
              taxpayerType: draft.taxpayerType === 'INDIVIDUAL' ? 'individual' : draft.taxpayerType === 'NON_INDIVIDUAL' ? 'non-individual' : null,
              lastName: draft.ownerLastName,
              firstName: draft.ownerFirstName,
              middleName: draft.ownerMiddleName,
              companyName: draft.companyName,
              nonIndividualType: draft.organizationType,
              nonIndividualTypeOther: draft.organizationTypeOther,
              logoName: draft.logoFileName,
              logoMimeType: draft.logoMimeType,
              logoStoragePath: draft.logoStoragePath,
              logoPublicUrl: draft.logoPublicUrl,
              address: draft.address,
              tin: draft.tin,
              companyEmail: draft.companyEmail,
              website: draft.website,
              contactNumber: draft.contactNumber,
              reportStartDate: draft.reportStartDate ? draft.reportStartDate.toISOString().slice(0, 10) : null,
              reportEndDate: draft.reportEndDate ? draft.reportEndDate.toISOString().slice(0, 10) : null,
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

    if (!plan || !plan.isActive || plan.scope !== SubscriptionPlanScope.ONBOARDING || plan.status !== SubscriptionPlanStatus.ACTIVE) {
      throw new BadRequestException('Selected subscription plan is invalid.');
    }

    const existingDraft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        subscriptionPlanId: true,
        billingCycle: true,
        provisionedCompanyId: true,
      },
    });

    const selectionChanged =
      existingDraft?.subscriptionPlanId !== undefined &&
      existingDraft.subscriptionPlanId !== null &&
      (existingDraft.subscriptionPlanId !== plan.id || existingDraft.billingCycle !== dto.billingCycle);

    if (selectionChanged && existingDraft.provisionedCompanyId) {
      await this.billingService.supersedeOnboardingSubscriptionsForPlanChange({
        companyId: existingDraft.provisionedCompanyId,
        nextPlanId: plan.id,
        nextBillingCycle: dto.billingCycle,
      });
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
        subscriptionPlan: {
          include: subscriptionPlanInclude,
        },
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
        subscriptionPlan: {
          include: subscriptionPlanInclude,
        },
      },
    });

    if (!existingDraft?.subscriptionPlanId || !existingDraft.billingCycle || !existingDraft.subscriptionPlan) {
      throw new BadRequestException('Choose a subscription plan before saving billing details.');
    }

    if (!existingDraft.companyDetailsCompletedAt || !existingDraft.provisionedCompanyId) {
      throw new BadRequestException('Complete company details before setting up billing.');
    }

    const normalizedEmail = normalizeEmail(dto.billingEmail) as string;

    const preparedSubscription = await this.billingService.prepareCompanySubscription({
      companyId: existingDraft.provisionedCompanyId,
      ownerUserId: user.id,
      planCode: existingDraft.subscriptionPlan.code,
      billingCycle: existingDraft.billingCycle,
      billingEmail: normalizedEmail,
    });

    const paymentSetupState = preparedSubscription.pendingProviderActivation ? 'pending_provider_activation' : 'ready_for_confirmation';

    const paymentResult = preparedSubscription.pendingProviderActivation
      ? await this.billingService.recordPendingPaymentSetup({
          companyId: existingDraft.provisionedCompanyId,
          ownerUserId: user.id,
          subscriptionId: preparedSubscription.subscription.id,
          paymentMethodId: dto.paymentMethodId.trim(),
          brand: dto.cardBrand.trim(),
          last4: dto.cardLast4,
          expMonth: dto.expiryMonth,
          expYear: dto.expiryYear,
        })
      : await this.billingService.attachPaymentMethodForCompany({
          companyId: existingDraft.provisionedCompanyId,
          ownerUserId: user.id,
          subscriptionId: preparedSubscription.subscription.id,
          paymentMethodId: dto.paymentMethodId.trim(),
        });

    const updatedDraft = await this.prisma.userOnboardingDraft.update({
      where: {
        userId: user.id,
      },
      data: {
        cardholderName: dto.cardholderName.trim(),
        billingEmail: normalizedEmail,
        billingAddress: dto.billingAddress.trim(),
        cardLast4: dto.cardLast4,
        cardBrand: dto.cardBrand.trim(),
        cardExpiryMonth: dto.expiryMonth,
        cardExpiryYear: dto.expiryYear,
        paymentMethodReference: dto.paymentMethodId.trim(),
        billingCompletedAt: new Date(),
      },
      include: {
        subscriptionPlan: {
          include: subscriptionPlanInclude,
        },
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
        plan: updatedDraft.subscriptionPlan ? mapSubscriptionPlan(updatedDraft.subscriptionPlan) : null,
        trialDays: updatedDraft.subscriptionPlan?.trialDays ?? 15,
      },
      paymentIntent: 'paymentIntent' in paymentResult ? paymentResult.paymentIntent : undefined,
      pendingProviderActivation: preparedSubscription.pendingProviderActivation ?? false,
      paymentSetupState,
      nextStep: 'REVIEW_DETAILS',
    };
  }

  async saveCompanyDetails(user: AuthUser, dto: SaveOnboardingCompanyDetailsDto) {
    const existingDraft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!existingDraft?.subscriptionPlanId || !existingDraft.billingCycle) {
      throw new BadRequestException('Complete plan selection before saving company details.');
    }

    this.validateCompanyDetailsInput(dto);

    const reportStartDate = new Date(`${dto.reportStartDate}T00:00:00.000Z`);
    const reportEndDate = new Date(`${dto.reportEndDate}T00:00:00.000Z`);
    const isIndividual = dto.taxpayerType === 'individual';

    const companyName = buildCompanyDisplayName({
      taxpayerType: isIndividual ? 'INDIVIDUAL' : 'NON_INDIVIDUAL',
      companyName: dto.companyName ?? null,
      ownerFirstName: dto.firstName ?? null,
      ownerLastName: dto.lastName ?? null,
    });

    const legalName = isIndividual ? companyName : (dto.companyName?.trim() ?? companyName);

    await this.ensureCompanyNameAvailable(companyName, existingDraft.provisionedCompanyId ?? undefined);

    const { updatedDraft } = await this.prisma.$transaction(async (tx) => {
      const slug = existingDraft.provisionedCompanyId ? null : await this.generateUniqueCompanySlug(tx, companyName);

      const provisionedCompany = existingDraft.provisionedCompanyId
        ? await tx.company.update({
            where: { id: existingDraft.provisionedCompanyId },
            data: {
              name: companyName,
              legalName,
              taxpayerType: isIndividual ? 'INDIVIDUAL' : 'NON_INDIVIDUAL',
              ownerLastName: isIndividual ? (dto.lastName?.trim() ?? null) : null,
              ownerFirstName: isIndividual ? (dto.firstName?.trim() ?? null) : null,
              ownerMiddleName: isIndividual ? dto.middleName?.trim() || null : null,
              organizationType: isIndividual ? null : (dto.nonIndividualType?.trim() ?? null),
              organizationTypeOther: isIndividual ? null : dto.nonIndividualTypeOther?.trim() || null,
              logoFileName: dto.logoName.trim(),
              logoMimeType: dto.logoMimeType?.trim() || null,
              logoStoragePath: dto.logoStoragePath?.trim() || null,
              logoPublicUrl: dto.logoPublicUrl?.trim() || null,
              address: dto.address.trim(),
              tin: dto.tin.trim(),
              email: normalizeEmail(dto.companyEmail) as string,
              website: dto.website?.trim() || null,
              contactNumber: dto.contactNumber.trim(),
              reportStartDate,
              reportEndDate,
              isActive: false,
              status: 'PROVISIONING',
              createdByUserId: user.id,
            },
          })
        : await tx.company.create({
            data: {
              name: companyName,
              slug: slug!,
              legalName,
              taxpayerType: isIndividual ? 'INDIVIDUAL' : 'NON_INDIVIDUAL',
              ownerLastName: isIndividual ? (dto.lastName?.trim() ?? null) : null,
              ownerFirstName: isIndividual ? (dto.firstName?.trim() ?? null) : null,
              ownerMiddleName: isIndividual ? dto.middleName?.trim() || null : null,
              organizationType: isIndividual ? null : (dto.nonIndividualType?.trim() ?? null),
              organizationTypeOther: isIndividual ? null : dto.nonIndividualTypeOther?.trim() || null,
              logoFileName: dto.logoName.trim(),
              logoMimeType: dto.logoMimeType?.trim() || null,
              logoStoragePath: dto.logoStoragePath?.trim() || null,
              logoPublicUrl: dto.logoPublicUrl?.trim() || null,
              address: dto.address.trim(),
              tin: dto.tin.trim(),
              email: normalizeEmail(dto.companyEmail) as string,
              website: dto.website?.trim() || null,
              contactNumber: dto.contactNumber.trim(),
              reportStartDate,
              reportEndDate,
              isActive: false,
              status: 'PROVISIONING',
              createdByUserId: user.id,
            },
          });

      await tx.companyUnit.upsert({
        where: {
          companyId_code: {
            companyId: provisionedCompany.id,
            code: 'HEAD-OFFICE',
          },
        },
        update: {
          tin: provisionedCompany.tin,
          address: provisionedCompany.address,
          contactNumber: provisionedCompany.contactNumber,
          email: provisionedCompany.email,
          isActive: true,
          inheritsCompanyProfile: true,
          canTransactSales: true,
          canHoldInventory: true,
        },
        create: {
          companyId: provisionedCompany.id,
          type: CompanyUnitType.HEAD_OFFICE,
          code: 'HEAD-OFFICE',
          name: 'Head Office',
          tin: provisionedCompany.tin,
          address: provisionedCompany.address,
          contactNumber: provisionedCompany.contactNumber,
          email: provisionedCompany.email,
          isActive: true,
          inheritsCompanyProfile: true,
          canTransactSales: true,
          canHoldInventory: true,
        },
      });

      await seedCompanyTermMaintenanceDefaults(tx, provisionedCompany.id);
      await seedCompanyPaymentTypeMaintenanceDefaults(tx, provisionedCompany.id);
      await seedCompanyChartAccountDefaults(tx, provisionedCompany.id);
      await seedCompanyTaxMaintenanceDefaults(tx, provisionedCompany.id);
      await seedCompanyDefaultAccountDefaults(tx, provisionedCompany.id);
      await seedCompanyDiscountMaintenanceDefaults(tx, provisionedCompany.id);
      await seedCompanyResponsibilityCenterDefaults(tx, provisionedCompany.id);
      await seedCompanyBankAccountDefaults(tx, provisionedCompany.id);

      const updatedDraft = await tx.userOnboardingDraft.update({
        where: {
          userId: user.id,
        },
        data: {
          taxpayerType: isIndividual ? 'INDIVIDUAL' : 'NON_INDIVIDUAL',
          ownerLastName: isIndividual ? (dto.lastName?.trim() ?? null) : null,
          ownerFirstName: isIndividual ? (dto.firstName?.trim() ?? null) : null,
          ownerMiddleName: isIndividual ? dto.middleName?.trim() || null : null,
          companyName: isIndividual ? null : (dto.companyName?.trim() ?? null),
          organizationType: isIndividual ? null : (dto.nonIndividualType?.trim() ?? null),
          organizationTypeOther: isIndividual ? null : dto.nonIndividualTypeOther?.trim() || null,
          logoFileName: dto.logoName.trim(),
          logoMimeType: dto.logoMimeType?.trim() || null,
          logoStoragePath: dto.logoStoragePath?.trim() || null,
          logoPublicUrl: dto.logoPublicUrl?.trim() || null,
          address: dto.address.trim(),
          tin: dto.tin.trim(),
          companyEmail: normalizeEmail(dto.companyEmail) as string,
          website: dto.website?.trim() || null,
          contactNumber: dto.contactNumber.trim(),
          reportStartDate,
          reportEndDate,
          provisionedCompanyId: provisionedCompany.id,
          companyDetailsCompletedAt: new Date(),
        },
      });

      return { updatedDraft };
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
        logoStoragePath: updatedDraft.logoStoragePath,
        logoPublicUrl: updatedDraft.logoPublicUrl,
        address: updatedDraft.address,
        tin: updatedDraft.tin,
        companyEmail: updatedDraft.companyEmail,
        website: updatedDraft.website,
        contactNumber: updatedDraft.contactNumber,
        reportStartDate: dto.reportStartDate,
        reportEndDate: dto.reportEndDate,
      },
      nextStep: 'BILLING',
    };
  }

  async complete(user: AuthUser) {
    const draft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        subscriptionPlan: {
          include: subscriptionPlanInclude,
        },
      },
    });

    if (!draft || !draft.subscriptionPlan) {
      throw new BadRequestException('Complete the onboarding draft before finalizing setup.');
    }
    const selectedPlan = draft.subscriptionPlan;

    this.validateCompletionDraft(draft);
    const completedAt = new Date();
    const provisionedCompanyId = draft.provisionedCompanyId!;
    const shouldPromoteLogo = Boolean(
      draft.logoStoragePath && (draft.logoStoragePath.startsWith('onboarding/') || draft.logoStoragePath.startsWith('company-logos/onboarding-user-')),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: {
          id: provisionedCompanyId,
        },
        data: {
          isActive: true,
          status: 'ACTIVE',
          createdByUserId: user.id,
        },
      });

      await tx.membership.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        update: {
          status: MembershipStatus.ACTIVE,
          joinedAt: completedAt,
        },
        create: {
          userId: user.id,
          companyId: company.id,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          joinedAt: completedAt,
        },
      });

      const subscription = await tx.companySubscription.findFirst({
        where: {
          companyId: company.id,
          subscriptionPlanId: draft.subscriptionPlanId!,
          billingCycle: draft.billingCycle!,
          status: {
            in: [SubscriptionStatus.INCOMPLETE, SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.UNPAID],
          },
        },
        include: {
          plan: true,
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      });

      if (!subscription) {
        throw new BadRequestException('Complete billing setup before finalizing onboarding.');
      }

      const selectedModuleIds = this.getSelectedPlanModuleIds(selectedPlan);

      this.assertSelectedPlanHasModules(selectedModuleIds);

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

    if (shouldPromoteLogo && draft.logoStoragePath) {
      try {
        const promotedLogo = await this.onboardingLogoStorageService.moveLogo({
          sourcePath: draft.logoStoragePath,
          destinationPath: buildCompanyLogoStoragePath(result.company.id, draft.logoStoragePath),
        });

        await this.prisma.company.update({
          where: {
            id: result.company.id,
          },
          data: {
            logoStoragePath: promotedLogo.storagePath,
            logoPublicUrl: promotedLogo.publicUrl,
          },
        });
      } catch (error) {
        this.logger.warn(`Unable to promote onboarding logo for company ${result.company.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    try {
      const completedUser = await this.prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          email: true,
          name: true,
        },
      });

      if (!completedUser) {
        throw new BadRequestException('User account was not found.');
      }

      await this.authMailService.sendOnboardingCongratulations(completedUser.email, completedUser.name, result.company.name);
    } catch (error) {
      this.logger.warn(`Unable to queue onboarding congratulations email for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        companyId: result.company.id,
        role: AppRole.ADMIN,
        systemRole: user.systemRole,
        membershipRole: MembershipRole.ADMIN,
        companyRoleId: null,
      } satisfies JwtPayload),
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
      requiresReauthentication: false,
    };
  }

  async uploadCompanyLogo(user: AuthUser, file: UploadedLogoFile | undefined) {
    const validatedFile = validateOnboardingLogoFile(file);

    const existingDraft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        subscriptionPlanId: true,
        billingCompletedAt: true,
      },
    });

    if (!existingDraft?.subscriptionPlanId) {
      throw new BadRequestException('Complete plan selection before uploading a logo.');
    }

    const upload = await this.onboardingLogoStorageService.uploadLogo({
      userId: user.id,
      fileName: validatedFile.originalname,
      mimeType: validatedFile.mimetype,
      fileBuffer: validatedFile.buffer,
    });

    await this.prisma.userOnboardingDraft.update({
      where: {
        userId: user.id,
      },
      data: {
        logoFileName: upload.fileName,
        logoMimeType: upload.mimeType,
        logoStoragePath: upload.storagePath,
        logoPublicUrl: upload.publicUrl,
      },
    });

    return {
      message: 'Company logo uploaded successfully.',
      logo: {
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        storagePath: upload.storagePath,
        publicUrl: upload.publicUrl,
      },
    };
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
      throw new BadRequestException('End date must sync to a 1-year report period.');
    }

    const start = getOnboardingDateParts(dto.reportStartDate);
    const end = getOnboardingDateParts(dto.reportEndDate);

    if (!start || !end || end.date.getTime() < start.date.getTime()) {
      throw new BadRequestException('Report end date must be after the report start date.');
    }
  }

  private validateCompletionDraft(
    draft: Prisma.UserOnboardingDraftGetPayload<{
      include: {
        subscriptionPlan: {
          include: typeof subscriptionPlanInclude;
        };
      };
    }>,
  ) {
    if (!draft.subscriptionPlanId || !draft.subscriptionPlan) {
      throw new BadRequestException('Select a subscription plan first.');
    }

    if (!draft.billingCycle || !draft.billingCompletedAt) {
      throw new BadRequestException('Complete billing before finalizing onboarding.');
    }

    if (!draft.companyDetailsCompletedAt || !draft.taxpayerType || !draft.provisionedCompanyId) {
      throw new BadRequestException('Complete company details before finalizing onboarding.');
    }
  }

  private getSelectedPlanModuleIds(plan: OnboardingSubscriptionPlan): number[] {
    return [
      ...new Set(
        plan.systems.flatMap((planSystem) =>
          planSystem.isEnabled && planSystem.system.isActive ? planSystem.system.modules.map((item) => item.moduleId) : [],
        ),
      ),
    ];
  }

  private assertSelectedPlanHasModules(moduleIds: number[]) {
    if (moduleIds.length === 0) {
      throw new BadRequestException('Selected subscription plan has no enabled modules configured.');
    }
  }

  private async generateUniqueCompanySlug(tx: Pick<PrismaService, 'company'> | Prisma.TransactionClient, companyName: string) {
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

  private async ensureCompanyNameAvailable(name: string, excludedCompanyId?: number) {
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        id: excludedCompanyId ? { not: excludedCompanyId } : undefined,
      },
      select: { id: true },
    });

    if (existingCompany) {
      throw new ConflictException('Company name is already taken.');
    }
  }
}
