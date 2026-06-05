import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingCycle,
  CompanyStatus,
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  TaxpayerType,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthMailService } from '../../auth/services/auth-mail.service';
import { BillingService } from '../../billing/billing.service';
import { WorkspaceUsersService } from '../users/workspace-users.service';
import { CreateCompanyUnitDto } from './dto/create-company-unit.dto';
import { CreateWorkspaceCompanyDto } from './dto/create-workspace-company.dto';
import { UpdateCompanyUnitDto } from './dto/update-company-unit.dto';
import { UpdateWorkspaceCompanyDto } from './dto/update-workspace-company.dto';
import {
  mapCompanyUnit,
  mapWorkspaceCompany,
} from './mappers/workspace-company.mapper';
import {
  WorkspaceCompanyDetailsInclude,
  WorkspaceCompanyListInclude,
} from './prisma/workspace-company.include';
import { WorkspaceCompanyLogoStorageService } from './services/workspace-company-logo-storage.service';
import type { UploadedCompanyLogoFile } from './types/uploaded-company-logo-file.type';

@Injectable()
export class WorkspaceCompaniesService {
  private readonly logger = new Logger(WorkspaceCompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailService: AuthMailService,
    private readonly billingService: BillingService,
    private readonly workspaceUsersService: WorkspaceUsersService,
    private readonly logoStorageService: WorkspaceCompanyLogoStorageService,
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

    const [companies, users] = await Promise.all([
      companiesPromise,
      this.workspaceUsersService.findAll(user),
    ]);

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
          tin: dto.tin.trim(),
          email: dto.email.trim().toLowerCase(),
          website: dto.website?.trim() || null,
          contactNumber: dto.contactNumber.trim(),
          reportStartDate: parseDate(dto.reportStartDate),
          reportEndDate: parseDate(dto.reportEndDate),
          createdByUserId: user.id,
          status: CompanyStatus.ACTIVE,
          isActive: true,
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
    });

    let billingSetup: Awaited<ReturnType<typeof this.setupCompanyBilling>>;

    try {
      billingSetup = await this.setupCompanyBilling({
        companyId: company.id,
        dto,
        user,
      });
    } catch (error) {
      await this.cleanupProvisionedCompany(company.id, error);
      throw error;
    }

    await this.sendCompanyCreatedEmail(user, company.name);
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

  async uploadLogo(
    user: AuthUser,
    companyId: number,
    file: UploadedCompanyLogoFile | undefined,
  ) {
    await this.ensureCompanyAdminAccess(user, companyId);
    const validatedFile = validateCompanyLogoFile(file);

    let upload: Awaited<
      ReturnType<WorkspaceCompanyLogoStorageService['uploadLogo']>
    >;

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

  async update(
    user: AuthUser,
    companyId: number,
    dto: UpdateWorkspaceCompanyDto,
  ) {
    await this.ensureCompanyAdminAccess(user, companyId);

    const current = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!current) {
      throw new NotFoundException('Company not found.');
    }

    const nextName = getUpdatedCompanyName(current.name, dto);
    await this.ensureCompanyNameAvailable(nextName, companyId);

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: nextName,
        legalName: nextName,
        taxpayerType: dto.taxpayerType
          ? mapTaxpayerType(dto.taxpayerType)
          : undefined,
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
        email:
          dto.email === undefined ? undefined : dto.email.trim().toLowerCase(),
        website: cleanOptional(dto.website),
        contactNumber: cleanOptional(dto.contactNumber),
        reportStartDate: dto.reportStartDate
          ? parseDate(dto.reportStartDate)
          : undefined,
        reportEndDate: dto.reportEndDate
          ? parseDate(dto.reportEndDate)
          : undefined,
      },
      include: WorkspaceCompanyDetailsInclude,
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

    return mapWorkspaceCompany(company);
  }

  async findUnits(user: AuthUser, companyId: number) {
    await this.ensureCompanyAccess(user, companyId);

    const units = await this.prisma.companyUnit.findMany({
      where: { companyId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });

    return units.map(mapCompanyUnit);
  }

  async createUnit(
    user: AuthUser,
    companyId: number,
    dto: CreateCompanyUnitDto,
  ) {
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
      type === CompanyUnitType.SATELLITE
        ? await this.resolveSatelliteParent(companyId, dto.parentUnitId)
        : await this.resolveHeadOfficeParent(companyId);

    if (type === CompanyUnitType.BRANCH && !dto.tin?.trim()) {
      throw new BadRequestException('TIN is required for a branch.');
    }

    const tin =
      type === CompanyUnitType.SATELLITE
        ? parentUnit?.tin || company.tin
        : dto.tin?.trim();

    if (!tin) {
      throw new BadRequestException(
        'A satellite requires an active head office or branch with TIN.',
      );
    }

    const code = await this.createAvailableUnitCode(
      companyId,
      dto.code?.trim() || createUnitCode(dto.name),
    );

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
      current.type === CompanyUnitType.SATELLITE &&
      dto.parentUnitId !== undefined
        ? await this.resolveSatelliteParent(current.companyId, dto.parentUnitId)
        : current.type === CompanyUnitType.BRANCH && !current.parentUnitId
          ? await this.resolveHeadOfficeParent(current.companyId)
          : null;
    const tin =
      current.type === CompanyUnitType.SATELLITE
        ? (parentUnit?.tin ?? current.tin)
        : cleanOptional(dto.tin);

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
        email:
          dto.email === undefined ? undefined : dto.email.trim().toLowerCase(),
        isActive: dto.isActive,
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

      throw new ForbiddenException(
        'Only admins can manage workspace companies.',
      );
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

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Admin access is required for this company.',
      );
    }
  }

  private async resolveSatelliteParent(
    companyId: number,
    parentUnitId?: number,
  ) {
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
        throw new BadRequestException(
          'Select an active head office or branch for this satellite.',
        );
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

  private async ensureCompanyNameAvailable(
    name: string,
    excludedCompanyId?: number,
  ) {
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

  private async setupCompanyBilling(input: {
    companyId: number;
    dto: CreateWorkspaceCompanyDto;
    user: AuthUser;
  }) {
    const billing = input.dto.billing;

    if (!billing?.planCode?.trim()) {
      return undefined;
    }

    const preparedSubscription =
      await this.billingService.prepareCompanySubscription({
        companyId: input.companyId,
        ownerUserId: input.user.id,
        planCode: billing.planCode.trim(),
        billingCycle: billing.billingCycle ?? BillingCycle.MONTHLY,
        billingEmail: billing.billingEmail ?? input.dto.email,
      });

    if (!billing.paymentMethodId?.trim()) {
      return {
        subscription: preparedSubscription.subscription,
        pendingProviderActivation:
          preparedSubscription.pendingProviderActivation ?? false,
        paymentSetup: preparedSubscription.paymentSetup,
      };
    }

    const paymentResult = preparedSubscription.pendingProviderActivation
      ? await this.billingService.recordPendingPaymentSetup({
          companyId: input.companyId,
          ownerUserId: input.user.id,
          subscriptionId: preparedSubscription.subscription.id,
          paymentMethodId: billing.paymentMethodId,
          brand: billing.cardBrand,
          last4: billing.cardLast4,
          expMonth: billing.cardExpiryMonth,
          expYear: billing.cardExpiryYear,
        })
      : await this.billingService.attachPaymentMethodForCompany({
          companyId: input.companyId,
          ownerUserId: input.user.id,
          subscriptionId: preparedSubscription.subscription.id,
          paymentMethodId: billing.paymentMethodId,
        });

    return {
      subscription: paymentResult.subscription,
      paymentIntent:
        'paymentIntent' in paymentResult
          ? paymentResult.paymentIntent
          : undefined,
      pendingProviderActivation:
        paymentResult.pendingProviderActivation ??
        preparedSubscription.pendingProviderActivation ??
        false,
      paymentSetup: preparedSubscription.paymentSetup,
    };
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
        `Unable to clean up company ${companyId} after billing setup failed: ${
          cleanupError instanceof Error
            ? cleanupError.message
            : 'Unknown cleanup error'
        }`,
      );
    }

    this.logger.warn(
      `Rolled back company ${companyId} after billing setup failed: ${
        error instanceof Error ? error.message : 'Unknown billing error'
      }`,
    );
  }

  private async ensureUnitCodeAvailable(
    companyId: number,
    code: string,
    excludedUnitId?: number,
  ) {
    const existingUnit = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        code,
        id: excludedUnitId ? { not: excludedUnitId } : undefined,
      },
      select: { id: true },
    });

    if (existingUnit) {
      throw new ConflictException(
        'A branch or satellite with this code already exists for this company.',
      );
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
      await this.authMailService.sendCompanyCreated(
        adminUser.email,
        adminUser.name || adminUser.email,
        companyName,
      );
    } catch {
      // Company creation should not fail because a notification failed.
    }
  }
}

function mapTaxpayerType(type: 'individual' | 'non-individual') {
  return type === 'individual'
    ? TaxpayerType.INDIVIDUAL
    : TaxpayerType.NON_INDIVIDUAL;
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

function getUpdatedCompanyName(
  currentName: string,
  dto: UpdateWorkspaceCompanyDto,
) {
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
