import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AccessScopeLevel,
  BillingApplicationStatus,
  BillingCycle,
  BillingMode,
  BillingPaymentAttemptStatus,
  BillingPaymentPurpose,
  CompanyStatus,
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  SubscriptionStatus,
  TaxpayerType,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthMailService } from '../../auth/services/auth-mail.service';
import { BillingService } from '../../billing/billing.service';
import { ReferenceService } from '../../reference/reference.service';
import { seedCompanyItemVariationDefaults } from '../../maintenance/item-variations/seed/item-variations.seed';
import { seedCompanyTermsMaintenanceDefaults } from '../../maintenance/terms-maintenance/seed/terms-maintenance.seed';
import { seedCompanyUnitOfMeasurementDefaults } from '../../maintenance/unit-of-measurement/seed/unit-of-measurement.seed';
import { seedCompanyPaymentTypeMaintenanceDefaults } from '../../maintenance/payment-type-maintenance/seed/payment-type-maintenance.seed';
import { seedCompanyChartAccountDefaults } from '../../maintenance/chart-of-accounts/seed/chart-of-accounts.seed';
import { seedCompanyDefaultAccountDefaults } from '../../maintenance/default-account/seed/default-accounts.seed';
import { seedCompanyDiscountMaintenanceDefaults } from '../../maintenance/discount-maintenance/seed/discount-maintenance.seed';
import { seedCompanyServicesMaintenanceDefaults } from '../../maintenance/services-maintenance/seed/services-maintenance.seed';
import { seedCompanyItemCategoryDefaults } from '../../maintenance/item-category/seed/item-category.seed';
import { seedCompanyBankAccountDefaults } from '../../maintenance/bank-masterfile/seed/bank-masterfile.seed';
import { seedCompanyResponsibilityCenterDefaults } from '../../maintenance/responsibility-center/seed/responsibility-center.seed';
import { seedCompanyWarehouseMaintenanceDefaults } from '../../maintenance/warehouse-maintenance/seed/warehouse-maintenance.seed';
import { WorkspaceAuditLogsService } from '../audit-logs/workspace-audit-logs.service';
import { WorkspaceUsersService } from '../users/workspace-users.service';
import { CreateCompanyUnitDto } from './dto/create-company-unit.dto';
import { CreateWorkspaceCompanyDto } from './dto/create-workspace-company.dto';
import { UpdateCompanyUnitDto } from './dto/update-company-unit.dto';
import { UpdateWorkspaceCompanyDto } from './dto/update-workspace-company.dto';
import { mapCompanyUnit, mapWorkspaceCompany } from './mappers/workspace-company.mapper';
import { WorkspaceCompanyDetailsInclude, WorkspaceCompanyListInclude } from './prisma/workspace-company.include';
import { WorkspaceCompanyLogoStorageService } from './services/workspace-company-logo-storage.service';
import type { UploadedCompanyLogoFile } from './types/uploaded-company-logo-file.type';

const WorkspaceCompanyProvisioningTransactionOptions = {
  ...MaintenanceTransactionOptions,
  timeout: 120_000,
};

@Injectable()
export class WorkspaceCompaniesService {
  private readonly logger = new Logger(WorkspaceCompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailService: AuthMailService,
    private readonly billingService: BillingService,
    private readonly referenceService: ReferenceService,
    private readonly workspaceUsersService: WorkspaceUsersService,
    private readonly logoStorageService: WorkspaceCompanyLogoStorageService,
    private readonly auditLogsService: WorkspaceAuditLogsService,
  ) {}

  async findAll(user: AuthUser) {
    const companies = await this.prisma.company.findMany({
      where:
        user.role === AppRole.SUPER_ADMIN
          ? undefined
          : {
              memberships: {
                some: {
                  userId: user.id,
                  status: {
                    not: MembershipStatus.REMOVED,
                  },
                },
              },
            },
      include: WorkspaceCompanyListInclude,
      orderBy: { createdAt: 'desc' },
    });

    return companies.map(mapWorkspaceCompany);
  }

  async getManagementSummary(user: AuthUser, includeUsers: boolean) {
    const companiesPromise = this.findAll(user);

    if (!includeUsers) {
      return {
        companies: await companiesPromise,
        users: [],
      };
    }

    const [companies, users] = await Promise.all([companiesPromise, this.workspaceUsersService.findAll(user)]);

    return {
      companies,
      users,
    };
  }

  async findOne(user: AuthUser, companyId: number) {
    await this.ensureCompanyAccess(user, companyId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: WorkspaceCompanyDetailsInclude,
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return mapWorkspaceCompany(company);
  }

  async create(user: AuthUser, dto: CreateWorkspaceCompanyDto) {
    await this.ensureCanManageWorkspace(user);

    const name = getCompanyName(dto);
    await this.ensureCompanyNameAvailable(name);
    const slug = await this.createUniqueSlug(name);
    const companyCurrency = this.referenceService.validateCompanyCurrency(dto.countryCode, dto.baseCurrencyCode);
    const isManualBilling = dto.billing?.billingMode === BillingMode.MANUAL;
    const hasConfirmedManualPayment = isManualBilling ? await this.hasConfirmedAdditionalCompanyPayment(user, dto) : false;

    const company = await this.prisma.$transaction(async (tx) => {
      const createdCompany = await tx.company.create({
        data: {
          name,
          slug,
          legalName: name,
          taxpayerType: mapTaxpayerType(dto.taxpayerType),
          ownerLastName: dto.lastName?.trim() || null,
          ownerFirstName: dto.firstName?.trim() || null,
          ownerMiddleName: dto.middleName?.trim() || null,
          organizationType: dto.nonIndividualType?.trim() || null,
          organizationTypeOther: dto.nonIndividualTypeOther?.trim() || null,
          logoFileName: dto.logoFileName?.trim() || null,
          logoMimeType: dto.logoMimeType?.trim() || null,
          logoStoragePath: dto.logoStoragePath?.trim() || null,
          logoPublicUrl: dto.logoPublicUrl?.trim() || null,
          address: dto.address.trim(),
          countryCode: companyCurrency.countryCode,
          baseCurrencyCode: companyCurrency.baseCurrencyCode,
          tin: dto.tin.trim(),
          email: dto.email.trim().toLowerCase(),
          website: dto.website?.trim() || null,
          contactNumber: dto.contactNumber.trim(),
          reportStartDate: parseDate(dto.reportStartDate),
          reportEndDate: parseDate(dto.reportEndDate),
          createdByUserId: user.id,
          status: isManualBilling && !hasConfirmedManualPayment ? CompanyStatus.PROVISIONING : CompanyStatus.ACTIVE,
          isActive: !isManualBilling || hasConfirmedManualPayment,
        },
      });

      await tx.companyUnit.create({
        data: {
          companyId: createdCompany.id,
          type: CompanyUnitType.HEAD_OFFICE,
          code: 'HEAD-OFFICE',
          name: 'Head Office',
          tin: createdCompany.tin,
          address: createdCompany.address,
          contactNumber: createdCompany.contactNumber,
          email: createdCompany.email,
          isActive: true,
          inheritsCompanyProfile: true,
          canTransactSales: true,
          canHoldInventory: true,
        },
      });

      await seedCompanyTermsMaintenanceDefaults(tx, createdCompany.id);
      await seedCompanyItemVariationDefaults(tx, createdCompany.id);
      await seedCompanyUnitOfMeasurementDefaults(tx, createdCompany.id);
      await seedCompanyPaymentTypeMaintenanceDefaults(tx, createdCompany.id);
      await seedCompanyChartAccountDefaults(tx, createdCompany.id);
      await seedCompanyServicesMaintenanceDefaults(tx, createdCompany.id);
      await seedCompanyDefaultAccountDefaults(tx, createdCompany.id);
      await seedCompanyItemCategoryDefaults(tx, createdCompany.id);
      await seedCompanyDiscountMaintenanceDefaults(tx, createdCompany.id);
      await seedCompanyResponsibilityCenterDefaults(tx, createdCompany.id);
      await seedCompanyBankAccountDefaults(tx, createdCompany.id);
      await seedCompanyWarehouseMaintenanceDefaults(tx, createdCompany.id);
      if (user.role !== AppRole.SUPER_ADMIN) {
        await tx.membership.upsert({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: createdCompany.id,
            },
          },
          update: {
            role: MembershipRole.ADMIN,
            status: MembershipStatus.ACTIVE,
          },
          create: {
            userId: user.id,
            companyId: createdCompany.id,
            role: MembershipRole.ADMIN,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
      }

      return tx.company.findUniqueOrThrow({
        where: { id: createdCompany.id },
        include: WorkspaceCompanyDetailsInclude,
      });
    }, WorkspaceCompanyProvisioningTransactionOptions);

    let billingSetup: Awaited<ReturnType<typeof this.setupCompanyBilling>>;

    try {
      billingSetup = hasConfirmedManualPayment
        ? undefined
        : await this.setupCompanyBilling({
            companyId: company.id,
            dto,
            user,
          });
    } catch (error) {
      await this.cleanupProvisionedCompany(company.id, error);
      throw error;
    }

    await this.sendCompanyCreatedEmail(user, company.name);
    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'CREATE',
      companyId: company.id,
      entityType: 'Company',
      entityId: company.id,
      metadata: {
        description: `Company ${company.name} was created.`,
        module: 'Company Management',
      },
    });

    if (hasConfirmedManualPayment && dto.billing?.paymentAttemptId) {
      await this.markAdditionalCompanyPaymentAttemptUsed(dto.billing.paymentAttemptId, company.id);
    }

    const updatedCompany = await this.prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      include: WorkspaceCompanyDetailsInclude,
    });
    const mappedCompany = mapWorkspaceCompany(updatedCompany);

    return billingSetup
      ? {
          ...mappedCompany,
          billingSetup,
        }
      : mappedCompany;
  }

  async uploadLogo(user: AuthUser, companyId: number, file: UploadedCompanyLogoFile | undefined) {
    await this.ensureCompanyAdminAccess(user, companyId);
    const validatedFile = validateCompanyLogoFile(file);

    let upload: Awaited<ReturnType<WorkspaceCompanyLogoStorageService['uploadLogo']>>;

    try {
      upload = await this.logoStorageService.uploadLogo({
        companyId,
        fileBuffer: validatedFile.buffer,
        fileName: validatedFile.originalname,
        mimeType: validatedFile.mimetype,
      });
    } catch (error) {
      this.logger.error(
        `Logo upload failed for company ${companyId} (${validatedFile.originalname}, ${validatedFile.mimetype}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        logoFileName: upload.fileName,
        logoMimeType: upload.mimeType,
        logoStoragePath: upload.storagePath,
        logoPublicUrl: upload.publicUrl,
      },
      include: WorkspaceCompanyDetailsInclude,
    });

    return {
      message: 'Company logo uploaded successfully.',
      company: mapWorkspaceCompany(company),
      logo: upload,
    };
  }

  async update(user: AuthUser, companyId: number, dto: UpdateWorkspaceCompanyDto) {
    await this.ensureCompanyAdminAccess(user, companyId);

    const current = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!current) {
      throw new NotFoundException('Company not found.');
    }

    const nextName = getUpdatedCompanyName(current.name, dto);
    await this.ensureCompanyNameAvailable(nextName, companyId);
    const companyCurrency =
      dto.countryCode !== undefined || dto.baseCurrencyCode !== undefined
        ? this.referenceService.validateCompanyCurrency(dto.countryCode ?? current.countryCode, dto.baseCurrencyCode ?? current.baseCurrencyCode)
        : null;

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: nextName,
        legalName: nextName,
        countryCode: companyCurrency?.countryCode,
        baseCurrencyCode: companyCurrency?.baseCurrencyCode,
        taxpayerType: dto.taxpayerType ? mapTaxpayerType(dto.taxpayerType) : undefined,
        ownerLastName: cleanOptional(dto.lastName),
        ownerFirstName: cleanOptional(dto.firstName),
        ownerMiddleName: cleanOptional(dto.middleName),
        organizationType: cleanOptional(dto.nonIndividualType),
        organizationTypeOther: cleanOptional(dto.nonIndividualTypeOther),
        logoFileName: cleanOptional(dto.logoFileName),
        logoMimeType: cleanOptional(dto.logoMimeType),
        logoStoragePath: cleanOptional(dto.logoStoragePath),
        logoPublicUrl: cleanOptional(dto.logoPublicUrl),
        address: cleanOptional(dto.address),
        tin: cleanOptional(dto.tin),
        email: dto.email === undefined ? undefined : dto.email.trim().toLowerCase(),
        website: cleanOptional(dto.website),
        contactNumber: cleanOptional(dto.contactNumber),
        reportStartDate: dto.reportStartDate ? parseDate(dto.reportStartDate) : undefined,
        reportEndDate: dto.reportEndDate ? parseDate(dto.reportEndDate) : undefined,
      },
      include: WorkspaceCompanyDetailsInclude,
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'UPDATE',
      companyId,
      entityType: 'Company',
      entityId: companyId,
      metadata: {
        description: `Company ${company.name} was updated.`,
        module: 'Company Management',
      },
    });

    return mapWorkspaceCompany(company);
  }

  async deactivate(user: AuthUser, companyId: number) {
    await this.ensureCompanyAdminAccess(user, companyId);

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        isActive: false,
        status: CompanyStatus.SUSPENDED,
      },
      include: WorkspaceCompanyDetailsInclude,
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'DELETE',
      companyId,
      entityType: 'Company',
      entityId: companyId,
      metadata: {
        description: `Company ${company.name} was deactivated.`,
        module: 'Company Management',
      },
    });

    return mapWorkspaceCompany(company);
  }

  async findUnits(user: AuthUser, companyId: number) {
    const accessibleUnitIds = await this.getAccessibleUnitIdsForUnitList(user, companyId);

    const units = await this.prisma.companyUnit.findMany({
      where: {
        companyId,
        id: accessibleUnitIds ? { in: accessibleUnitIds } : undefined,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
    const headOfficeTin = units.find((unit) => unit.type === CompanyUnitType.HEAD_OFFICE)?.tin;

    return units.map((unit) => (unit.type === CompanyUnitType.SATELLITE && headOfficeTin ? { ...unit, tin: headOfficeTin } : unit)).map(mapCompanyUnit);
  }

  private async getAccessibleUnitIdsForUnitList(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return null;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        role: true,
        status: true,
        accessScope: true,
        unitAccess: {
          select: {
            unitId: true,
          },
        },
      },
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new NotFoundException('Company not found.');
    }

    if (membership.role === MembershipRole.ADMIN || membership.accessScope === AccessScopeLevel.COMPANY) {
      return null;
    }

    return membership.unitAccess.map((access) => access.unitId);
  }

  async createUnit(user: AuthUser, companyId: number, dto: CreateCompanyUnitDto) {
    await this.ensureCompanyAdminAccess(user, companyId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, tin: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    const type = dto.type;
    const parentUnit =
      type === CompanyUnitType.SATELLITE ? await this.resolveSatelliteParent(companyId, dto.parentUnitId) : await this.resolveHeadOfficeParent(companyId);
    const headOffice = type === CompanyUnitType.SATELLITE ? await this.resolveHeadOfficeParent(companyId) : null;

    if (type === CompanyUnitType.BRANCH && !dto.tin?.trim()) {
      throw new BadRequestException('TIN is required for a branch.');
    }

    const tin = type === CompanyUnitType.SATELLITE ? headOffice?.tin || company.tin : dto.tin?.trim();

    if (!tin) {
      throw new BadRequestException('A satellite requires an active head office with TIN.');
    }

    const code = await this.createAvailableUnitCode(companyId, dto.code?.trim() || createUnitCode(dto.name));

    const unit = await this.prisma.companyUnit.create({
      data: {
        companyId,
        parentUnitId: parentUnit?.id ?? null,
        type,
        code,
        name: dto.name.trim(),
        tin,
        address: dto.address?.trim() || null,
        contactNumber: dto.contactNumber?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        isActive: true,
        inheritsCompanyProfile: type === CompanyUnitType.SATELLITE,
        canTransactSales: true,
        canHoldInventory: true,
      },
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'CREATE',
      companyId,
      entityType: 'CompanyUnit',
      entityId: unit.id,
      metadata: {
        branchId: String(unit.id),
        branchName: unit.name,
        description: `${formatCompanyUnitType(unit.type)} ${unit.name} was created.`,
        module: 'Branch Management',
      },
    });

    return mapCompanyUnit(unit);
  }

  async updateUnit(user: AuthUser, unitId: number, dto: UpdateCompanyUnitDto) {
    const current = await this.prisma.companyUnit.findUnique({
      where: { id: unitId },
    });

    if (!current) {
      throw new NotFoundException('Branch or satellite not found.');
    }

    await this.ensureCompanyAdminAccess(user, current.companyId);

    const parentUnit =
      current.type === CompanyUnitType.SATELLITE && dto.parentUnitId !== undefined
        ? await this.resolveSatelliteParent(current.companyId, dto.parentUnitId)
        : current.type === CompanyUnitType.BRANCH && !current.parentUnitId
          ? await this.resolveHeadOfficeParent(current.companyId)
          : null;
    const headOffice = current.type === CompanyUnitType.SATELLITE ? await this.resolveHeadOfficeParent(current.companyId) : null;
    const tin = current.type === CompanyUnitType.SATELLITE ? (headOffice?.tin ?? current.tin) : cleanOptional(dto.tin);

    if (current.type === CompanyUnitType.BRANCH && dto.tin === '') {
      throw new BadRequestException('TIN is required for a branch.');
    }

    const nextCode = cleanOptional(dto.code);

    if (nextCode) {
      await this.ensureUnitCodeAvailable(current.companyId, nextCode, unitId);
    }

    const unit = await this.prisma.companyUnit.update({
      where: { id: unitId },
      data: {
        parentUnitId:
          current.type === CompanyUnitType.SATELLITE
            ? (parentUnit?.id ?? undefined)
            : current.type === CompanyUnitType.BRANCH && !current.parentUnitId
              ? (parentUnit?.id ?? undefined)
              : undefined,
        code: nextCode,
        name: cleanRequiredOptional(dto.name),
        tin,
        address: cleanOptional(dto.address),
        contactNumber: cleanOptional(dto.contactNumber),
        email: dto.email === undefined ? undefined : dto.email.trim().toLowerCase(),
        isActive: dto.isActive,
      },
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'UPDATE',
      companyId: unit.companyId,
      entityType: 'CompanyUnit',
      entityId: unit.id,
      metadata: {
        branchId: String(unit.id),
        branchName: unit.name,
        description: `${formatCompanyUnitType(unit.type)} ${unit.name} was updated.`,
        module: 'Branch Management',
      },
    });

    return mapCompanyUnit(unit);
  }

  async deactivateUnit(user: AuthUser, unitId: number) {
    const current = await this.prisma.companyUnit.findUnique({
      where: { id: unitId },
    });

    if (!current) {
      throw new NotFoundException('Branch or satellite not found.');
    }

    await this.ensureCompanyAdminAccess(user, current.companyId);

    if (current.type === CompanyUnitType.HEAD_OFFICE) {
      throw new BadRequestException('Head office cannot be deactivated here.');
    }

    const unit = await this.prisma.companyUnit.update({
      where: { id: unitId },
      data: { isActive: false },
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'DELETE',
      companyId: unit.companyId,
      entityType: 'CompanyUnit',
      entityId: unit.id,
      metadata: {
        branchId: String(unit.id),
        branchName: unit.name,
        description: `${formatCompanyUnitType(unit.type)} ${unit.name} was deactivated.`,
        module: 'Branch Management',
      },
    });

    return mapCompanyUnit(unit);
  }

  private async ensureCanManageWorkspace(user: AuthUser) {
    if (![AppRole.SUPER_ADMIN, AppRole.ADMIN].includes(user.role)) {
      const adminMembership = await this.prisma.membership.findFirst({
        where: {
          userId: user.id,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
        },
        select: { companyId: true },
      });

      if (adminMembership) {
        return;
      }

      throw new ForbiddenException('Only admins can manage workspace companies.');
    }
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new NotFoundException('Company not found.');
    }
  }

  private async ensureCompanyAdminAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE || membership.role !== MembershipRole.ADMIN) {
      throw new ForbiddenException('Admin access is required for this company.');
    }
  }

  private async resolveSatelliteParent(companyId: number, parentUnitId?: number) {
    if (parentUnitId) {
      const parentUnit = await this.prisma.companyUnit.findFirst({
        where: {
          id: parentUnitId,
          companyId,
          type: {
            in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH],
          },
          isActive: true,
        },
      });

      if (!parentUnit) {
        throw new BadRequestException('Select an active head office or branch for this satellite.');
      }

      return parentUnit;
    }

    return this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH],
        },
        isActive: true,
        tin: {
          not: null,
        },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async resolveHeadOfficeParent(companyId: number) {
    return this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        type: CompanyUnitType.HEAD_OFFICE,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async createUniqueSlug(name: string) {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.company.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
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

  private async setupCompanyBilling(input: { companyId: number; dto: CreateWorkspaceCompanyDto; user: AuthUser }) {
    const billing = input.dto.billing;

    if (!billing?.planCode?.trim()) {
      return undefined;
    }

    if (billing.billingMode === BillingMode.MANUAL) {
      return undefined;
    }

    const preparedSubscription = await this.billingService.prepareCompanySubscription({
      companyId: input.companyId,
      ownerUserId: input.user.id,
      planCode: billing.planCode.trim(),
      billingCycle: billing.billingCycle ?? BillingCycle.MONTHLY,
      billingEmail: billing.billingEmail ?? input.dto.email,
    });

    if (!billing.paymentMethodId?.trim()) {
      return {
        subscription: preparedSubscription.subscription,
        paymentSetup: preparedSubscription.paymentSetup,
      };
    }

    const paymentResult = await this.billingService.attachPaymentMethodForCompany({
      companyId: input.companyId,
      ownerUserId: input.user.id,
      subscriptionId: preparedSubscription.subscription.id,
      paymentMethodId: billing.paymentMethodId,
    });

    return {
      subscription: paymentResult.subscription,
      paymentIntent: paymentResult.paymentIntent,
      paymentSetup: preparedSubscription.paymentSetup,
    };
  }

  private async hasConfirmedAdditionalCompanyPayment(user: AuthUser, dto: CreateWorkspaceCompanyDto) {
    const paymentAttemptId = dto.billing?.paymentAttemptId;

    if (!paymentAttemptId) {
      return false;
    }

    const attempt = await this.prisma.billingPaymentAttempt.findUnique({
      where: {
        id: paymentAttemptId,
      },
      select: {
        ownerUserId: true,
        purpose: true,
        status: true,
        applicationStatus: true,
        metadata: true,
        subscriptionPlan: {
          select: {
            code: true,
          },
        },
      },
    });

    if (
      !attempt ||
      attempt.ownerUserId !== user.id ||
      attempt.purpose !== BillingPaymentPurpose.ADDITIONAL_COMPANY ||
      attempt.status !== BillingPaymentAttemptStatus.PAID
    ) {
      throw new BadRequestException('Additional company payment must be confirmed before creating the company.');
    }

    const metadata = readRecord(attempt.metadata);

    if (metadata?.additional_company_created_id) {
      throw new BadRequestException('Additional company payment has already been used to create a company.');
    }

    if (attempt.applicationStatus === BillingApplicationStatus.FAILED) {
      throw new BadRequestException('Additional company payment could not be applied. Contact support before creating the company.');
    }

    const expectedPlanCode = dto.billing?.planCode?.trim().toUpperCase();

    if (expectedPlanCode && attempt.subscriptionPlan.code !== expectedPlanCode) {
      throw new BadRequestException('Additional company payment does not match the selected plan.');
    }

    return true;
  }

  private async markAdditionalCompanyPaymentAttemptUsed(paymentAttemptId: number, companyId: number) {
    const attempt = await this.prisma.billingPaymentAttempt.findUnique({
      where: {
        id: paymentAttemptId,
      },
      select: {
        companySubscriptionId: true,
        subscriptionPlanId: true,
        subscriptionPlanPriceId: true,
        subscriptionInvoiceId: true,
        metadata: true,
        subscriptionInvoice: {
          select: {
            billingCycle: true,
            periodStartAt: true,
            periodEndAt: true,
          },
        },
      },
    });
    const metadata = readRecord(attempt?.metadata) ?? {};

    await this.prisma.$transaction(async (tx) => {
      let companySubscriptionId = attempt?.companySubscriptionId ?? null;

      if (companySubscriptionId) {
        await tx.companySubscription.update({
          where: {
            id: companySubscriptionId,
          },
          data: {
            companyId,
          },
        });
      } else if (attempt) {
        const subscription = await tx.companySubscription.create({
          data: {
            companyId,
            subscriptionPlanId: attempt.subscriptionPlanId,
            subscriptionPlanPriceId: attempt.subscriptionPlanPriceId,
            billingCycle: attempt.subscriptionInvoice.billingCycle ?? BillingCycle.MONTHLY,
            billingMode: BillingMode.MANUAL,
            autoRenew: false,
            status: SubscriptionStatus.ACTIVE,
            startsAt: attempt.subscriptionInvoice.periodStartAt ?? new Date(),
            currentPeriodStartAt: attempt.subscriptionInvoice.periodStartAt ?? null,
            nextBillingAt: attempt.subscriptionInvoice.periodEndAt ?? null,
            endsAt: attempt.subscriptionInvoice.periodEndAt ?? null,
            rawProviderPayload: {
              billingMode: BillingMode.MANUAL,
              createdBy: 'paid_additional_company_checkout',
              paymentAttemptId,
            },
          },
        });
        companySubscriptionId = subscription.id;
      }

      if (attempt?.subscriptionInvoiceId) {
        await tx.subscriptionInvoice.update({
          where: {
            id: attempt.subscriptionInvoiceId,
          },
          data: {
            companyId,
            companySubscriptionId,
          },
        });
      }

      await tx.billingPaymentAttempt.update({
        where: {
          id: paymentAttemptId,
        },
        data: {
          companyId,
          companySubscriptionId,
          metadata: {
            ...metadata,
            additional_company_created_id: companyId,
            additional_company_created_at: new Date().toISOString(),
          },
        },
      });
    });
  }

  private async cleanupProvisionedCompany(companyId: number, error: unknown) {
    try {
      await this.prisma.company.delete({
        where: {
          id: companyId,
        },
      });
    } catch (cleanupError) {
      this.logger.warn(
        `Unable to clean up company ${companyId} after billing setup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}`,
      );
    }

    this.logger.warn(`Rolled back company ${companyId} after billing setup failed: ${error instanceof Error ? error.message : 'Unknown billing error'}`);
  }

  private async ensureUnitCodeAvailable(companyId: number, code: string, excludedUnitId?: number) {
    const existingUnit = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        code,
        id: excludedUnitId ? { not: excludedUnitId } : undefined,
      },
      select: { id: true },
    });

    if (existingUnit) {
      throw new ConflictException('A branch or satellite with this code already exists for this company.');
    }
  }

  private async createAvailableUnitCode(companyId: number, baseCode: string) {
    let candidate = baseCode;
    let suffix = 2;

    while (
      await this.prisma.companyUnit.findFirst({
        where: {
          companyId,
          code: candidate,
        },
        select: { id: true },
      })
    ) {
      const suffixText = `-${suffix}`;
      candidate = `${baseCode.slice(0, 24 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    return candidate;
  }

  private async sendCompanyCreatedEmail(user: AuthUser, companyName: string) {
    const adminUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
      },
    });

    if (!adminUser?.email) {
      return;
    }

    try {
      await this.authMailService.sendCompanyCreated(adminUser.email, adminUser.name || adminUser.email, companyName);
    } catch {
      // Company creation should not fail because a notification failed.
    }
  }
}

function mapTaxpayerType(type: 'individual' | 'non-individual') {
  return type === 'individual' ? TaxpayerType.INDIVIDUAL : TaxpayerType.NON_INDIVIDUAL;
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getCompanyName(dto: CreateWorkspaceCompanyDto) {
  if (dto.taxpayerType === 'individual') {
    return [dto.firstName, dto.middleName, dto.lastName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ');
  }

  return dto.companyName?.trim() ?? '';
}

function getUpdatedCompanyName(currentName: string, dto: UpdateWorkspaceCompanyDto) {
  if (dto.taxpayerType === 'individual' || dto.firstName || dto.lastName) {
    const name = [dto.firstName, dto.middleName, dto.lastName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ');

    return name || currentName;
  }

  return dto.companyName?.trim() || currentName;
}

function cleanOptional(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value.trim() || null;
}

function cleanRequiredOptional(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value.trim();
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `company-${Date.now()}`;
}

function createUnitCode(value: string) {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || `UNIT-${Date.now()}`
  );
}

function formatCompanyUnitType(type: CompanyUnitType) {
  if (type === CompanyUnitType.HEAD_OFFICE) {
    return 'Head office';
  }

  return type === CompanyUnitType.SATELLITE ? 'Satellite' : 'Branch';
}

function validateCompanyLogoFile(file: UploadedCompanyLogoFile | undefined) {
  const maxLogoFileSizeInBytes = 5 * 1024 * 1024;

  if (!file) {
    throw new BadRequestException('Upload a logo image.');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestException('Only image files are allowed.');
  }

  if (file.size > maxLogoFileSizeInBytes) {
    throw new BadRequestException('Logo must be 5MB or smaller.');
  }

  return file;
}
