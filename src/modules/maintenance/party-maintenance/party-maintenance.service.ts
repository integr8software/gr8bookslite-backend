import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChartAccountStatus,
  MembershipRole,
  MembershipStatus,
  PartyClassification,
  PartyStatus,
  PartyType,
  TransactionNumberInputMode,
  Prisma,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddressService } from '../../address/address.service';
import {
  findTransactionNumberForCompanyBranch,
  generateTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';
import { CreatePartyAddressDto } from './dto/create-party-address.dto';
import { CreatePartyDto } from './dto/create-party.dto';
import { GetPartyListQueryDto } from './dto/get-party-list-query.dto';
import { ImportPartiesDto } from './dto/import-parties.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { mapParty } from './mappers/party-maintenance.mapper';
import { PartyInclude } from './prisma/party.include';
import type { PartyWithDetails } from './types/party-with-details.type';
import { buildPartyAccountingAccountOptions } from './utils/party-accounting-account.util';

@Injectable()
export class PartyMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressService: AddressService,
  ) {}

  async findAll(user: AuthUser, query: GetPartyListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.pageSize ?? query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [parties, total, statistics] = await Promise.all([
      this.prisma.party.findMany({
        where,
        include: PartyInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.party.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      parties: await this.mapPartiesWithAuditUsers(parties),
      totalRows: total,
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const party = await this.findPartyOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      party: (await this.mapPartiesWithAuditUsers([party]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findAccountingOptions(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
    });

    return buildPartyAccountingAccountOptions(accounts);
  }

  async findOptions(user: AuthUser, partyType: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const normalizedPartyType = this.parsePartyType(partyType);

    const parties = await this.prisma.party.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        partyTypes: {
          has: normalizedPartyType,
        },
      },
      orderBy: [{ partyName: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }, { partyCodeNo: 'asc' }],
      select: {
        id: true,
        partyCodeNo: true,
        classification: true,
        partyTypes: true,
        partyName: true,
        tradeName: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffixName: true,
        contactPerson: true,
        email: true,
        contactNo: true,
        status: true,
      },
    });

    return {
      parties: parties.map((party) => ({
        id: party.id.toString(),
        partyCodeNo: party.partyCodeNo,
        classification: party.classification,
        partyTypes: party.partyTypes,
        name: this.getPartyOptionName(party),
        contactPerson: party.contactPerson ?? '',
        email: party.email ?? '',
        contactNo: party.contactNo ?? '',
        status: party.status,
      })),
    };
  }

  async create(user: AuthUser, dto: CreatePartyDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const sequence = await findTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: PartyTransactionModuleCode,
    });
    const normalized = await this.normalizeCreateDto(companyId, dto, {
      requirePartyCode: sequence?.inputMode === TransactionNumberInputMode.MANUAL,
    });

    try {
      const party = await this.prisma.$transaction(async (tx) => {
        const partyCodeNo = await this.resolvePartyCodeForCreate(tx, {
          branchUnitId,
          companyId,
          dto: normalized,
          isAuto: sequence?.inputMode !== TransactionNumberInputMode.MANUAL,
        });

        const input = { ...normalized, partyCodeNo };

        await this.ensureIdentityAvailable(companyId, input, undefined, tx);

        return tx.party.create({
          data: {
            companyId,
            ...this.toPartyData(input),
            createdByUserId: user.id,
            addresses: {
              create: input.addresses.map((address) => this.toAddressData(address)),
            },
          },
          include: PartyInclude,
        });
      });

      return {
        message: 'Party created successfully.',
        party: (await this.mapPartiesWithAuditUsers([party]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdatePartyDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);

    const partyId = parsePositiveBigIntId(id);
    const current = await this.findPartyOrThrow(companyId, partyId);
    const merged = this.mergePartyDto(current, dto);
    const normalized = await this.normalizeCreateDto(companyId, merged);

    await this.ensureIdentityAvailable(companyId, normalized, partyId);

    try {
      const party = await this.prisma.$transaction(async (tx) => {
        if (dto.addresses !== undefined) {
          await tx.partyAddress.deleteMany({ where: { partyId } });
        }

        return tx.party.update({
          where: { id: partyId },
          data: {
            ...this.toPartyData(normalized),
            updatedByUserId: user.id,
            ...(dto.addresses !== undefined
              ? {
                  addresses: {
                    create: normalized.addresses.map((address) => this.toAddressData(address)),
                  },
                }
              : {}),
          },
          include: PartyInclude,
        });
      });

      return {
        message: 'Party updated successfully.',
        party: (await this.mapPartiesWithAuditUsers([party]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async importParties(user: AuthUser, dto: ImportPartiesDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId ?? dto.parties[0]?.branchUnitId);
    const sequence = await findTransactionNumberForCompanyBranch(this.prisma, {
      branchUnitId,
      companyId,
      moduleCode: PartyTransactionModuleCode,
    });
    const isManual = sequence?.inputMode === TransactionNumberInputMode.MANUAL;
    const parties = await Promise.all(
      dto.parties.map((party) =>
        this.normalizeCreateDto(companyId, party, {
          forceActiveStatus: true,
          requirePartyCode: isManual,
          resolveAddressNames: true,
        }),
      ),
    );

    if (isManual) {
      this.ensureNoDuplicateImportIdentities(parties);

      for (const party of parties) {
        await this.ensureIdentityAvailable(companyId, party);
      }
    } else {
      this.ensureNoDuplicateImportNames(parties);
    }

    const createdParties = await this.prisma.$transaction(async (tx) => {
      const ids: bigint[] = [];

      for (const input of parties) {
        const partyCodeNo = isManual
          ? input.partyCodeNo
          : (
              await generateTransactionNumberForCompanyBranch(tx, {
                branchUnitId,
                createDefaultIfMissing: true,
                companyId,
                moduleCode: PartyTransactionModuleCode,
                isIssued: (transactionNumber) => this.isPartyCodeIssued(tx, companyId, transactionNumber),
              })
            ).transactionNumber;
        const nextInput = { ...input, partyCodeNo };

        await this.ensureIdentityAvailable(companyId, nextInput, undefined, tx);

        const party = await tx.party.create({
          data: {
            companyId,
            ...this.toPartyData(nextInput),
            createdByUserId: user.id,
            addresses: {
              create: nextInput.addresses.map((address) => this.toAddressData(address)),
            },
          },
          select: { id: true },
        });

        ids.push(party.id);
      }

      return tx.party.findMany({
        where: { id: { in: ids } },
        include: PartyInclude,
        orderBy: [{ partyCodeNo: 'asc' }, { id: 'asc' }],
      });
    });

    return {
      message: `${createdParties.length} party ${createdParties.length === 1 ? 'record' : 'records'} imported successfully.`,
      parties: await this.mapPartiesWithAuditUsers(createdParties),
    };
  }

  private buildListWhere(companyId: number, query: GetPartyListQueryDto): Prisma.PartyWhereInput {
    const search = (query.query ?? query.search)?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.classification ? { classification: query.classification } : {}),
      ...(query.partyType ? { partyTypes: { has: query.partyType } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { partyCodeNo: { contains: search, mode: 'insensitive' } },
              { partyName: { contains: search, mode: 'insensitive' } },
              { tradeName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { middleName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { tin: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { contactNo: { contains: search, mode: 'insensitive' } },
              { landline: { contains: search, mode: 'insensitive' } },
              {
                addresses: {
                  some: {
                    OR: [
                      {
                        addressLine1: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        addressLine2: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                      { barangay: { contains: search, mode: 'insensitive' } },
                      {
                        cityMunicipality: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                      { province: { contains: search, mode: 'insensitive' } },
                      { region: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private parsePartyType(value: string) {
    const normalizedValue = value.trim().toUpperCase();

    if (normalizedValue in PartyType) {
      return PartyType[normalizedValue as keyof typeof PartyType];
    }

    throw new BadRequestException('Choose a valid party type.');
  }

  private getPartyOptionName(party: {
    classification: PartyClassification;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    partyName: string | null;
    suffixName: string | null;
    tradeName: string | null;
  }) {
    if (party.classification === PartyClassification.NON_INDIVIDUAL) {
      return party.tradeName?.trim() || party.partyName?.trim() || 'Unnamed Party';
    }

    const fullName = [party.firstName, party.middleName, party.lastName, party.suffixName]
      .map((namePart) => namePart?.trim())
      .filter(Boolean)
      .join(' ');

    return fullName || party.partyName?.trim() || 'Unnamed Party';
  }

  private buildOrderBy(query: GetPartyListQueryDto): Prisma.PartyOrderByWithRelationInput[] {
    const sortDirection = query.sortDirection ?? 'asc';

    switch (query.sortBy) {
      case 'partyCodeNo':
        return [{ partyCodeNo: sortDirection }, { id: 'asc' }];
      case 'classification':
        return [{ classification: sortDirection }, { id: 'asc' }];
      case 'status':
        return [{ status: sortDirection }, { id: 'asc' }];
      case 'createdAt':
        return [{ createdAt: sortDirection }, { id: 'asc' }];
      case 'updatedAt':
        return [{ updatedAt: sortDirection }, { id: 'asc' }];
      case 'partyTypes':
      case 'address':
      case 'name':
      default:
        return [{ partyName: sortDirection }, { lastName: sortDirection }, { firstName: sortDirection }, { partyCodeNo: 'asc' }, { id: 'asc' }];
    }
  }

  private async getStatistics(companyId: number) {
    const [groups, partyTypes] = await Promise.all([
      this.prisma.party.groupBy({
        by: ['status', 'classification'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.party.findMany({
        where: { companyId, deletedAt: null },
        select: { partyTypes: true },
      }),
    ]);
    const statistics = {
      totalParties: 0,
      activeParties: 0,
      inactiveParties: 0,
      individualParties: 0,
      nonIndividualParties: 0,
      multiTypeParties: 0,
    };

    for (const group of groups) {
      const count = group._count._all;

      statistics.totalParties += count;
      if (group.status === PartyStatus.ACTIVE) statistics.activeParties += count;
      if (group.status === PartyStatus.INACTIVE) statistics.inactiveParties += count;
      if (group.classification === PartyClassification.INDIVIDUAL) statistics.individualParties += count;
      if (group.classification === PartyClassification.NON_INDIVIDUAL) statistics.nonIndividualParties += count;
    }

    statistics.multiTypeParties = partyTypes.filter((party) => party.partyTypes.length > 1).length;

    return statistics;
  }

  private async mapPartiesWithAuditUsers(parties: PartyWithDetails[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      parties.flatMap((party) => [party.createdByUserId, party.updatedByUserId]),
    );

    return parties.map((party) => mapParty(party, userNames));
  }

  private async normalizeCreateDto(
    companyId: number,
    dto: CreatePartyDto,
    options: {
      forceActiveStatus?: boolean;
      requirePartyCode?: boolean;
      resolveAddressNames?: boolean;
    } = {},
  ): Promise<NormalizedPartyDto> {
    const partyTypes = this.normalizePartyTypes(dto.partyTypes);
    const termId = this.normalizeOptionalString(dto.termId);
    const partyEntityType = await this.resolvePartyEntityType(
      dto.classification,
      dto.partyEntityType,
    );
    const partyEntityTypeIsGovernment = Boolean(partyEntityType?.isGovernment);

    if (termId) {
      await this.ensureTermBelongsToCompany(companyId, parsePositiveBigIntId(termId));
    }

    const normalized: NormalizedPartyDto = {
      ...dto,
      partyCodeNo: dto.partyCodeNo.trim(),
      partyEntityType: partyEntityType?.name ?? null,
      partyEntityTypeId: partyEntityType?.id ?? null,
      partyEntityTypeIsGovernment,
      partyTypes,
      status: options.forceActiveStatus ? PartyStatus.ACTIVE : (dto.status ?? PartyStatus.ACTIVE),
      partyName: this.normalizeOptionalString(dto.partyName),
      tradeName: this.normalizeOptionalString(dto.tradeName),
      firstName: this.normalizeOptionalString(dto.firstName),
      middleName: this.normalizeOptionalString(dto.middleName),
      lastName: this.normalizeOptionalString(dto.lastName),
      suffixName: this.normalizeOptionalString(dto.suffixName),
      honorific: this.normalizeOptionalString(dto.honorific),
      gender: this.normalizeOptionalString(dto.gender),
      civilStatus: this.normalizeOptionalString(dto.civilStatus),
      nationality: this.normalizeOptionalString(dto.nationality) ?? (hasPersonalInformationPartyType(partyTypes) ? 'Filipino' : null),
      memberRegistrationDate: partyTypes.includes(PartyType.MEMBER) ? (this.normalizeOptionalString(dto.memberRegistrationDate) ?? getTodayDateValue()) : null,
      defaultReceivableAccount: this.normalizeOptionalString(dto.defaultReceivableAccount),
      customerAdvanceAccount: this.normalizeOptionalString(dto.customerAdvanceAccount),
      defaultPayableAccount: this.normalizeOptionalString(dto.defaultPayableAccount),
      vendorAdvanceAccount: this.normalizeOptionalString(dto.vendorAdvanceAccount),
      employeeAdvanceAccount: this.normalizeOptionalString(dto.employeeAdvanceAccount),
      employeePayableAccount: this.normalizeOptionalString(dto.employeePayableAccount),
      termId,
      tin: this.normalizeOptionalString(dto.tin),
      atcCode: this.normalizeOptionalString(dto.atcCode),
      defaultPurchaseInputVatTaxSourceKey: this.normalizeOptionalString(dto.defaultPurchaseInputVatTaxSourceKey),
      defaultPurchaseEwtTaxSourceKey: this.normalizeOptionalString(dto.defaultPurchaseEwtTaxSourceKey),
      defaultPurchaseFwtTaxSourceKey: partyEntityTypeIsGovernment
        ? this.normalizeOptionalString(dto.defaultPurchaseFwtTaxSourceKey)
        : null,
      defaultPurchaseWvatTaxSourceKey: partyEntityTypeIsGovernment
        ? this.normalizeOptionalString(dto.defaultPurchaseWvatTaxSourceKey)
        : null,
      defaultSalesOutputVatTaxSourceKey: this.normalizeOptionalString(dto.defaultSalesOutputVatTaxSourceKey),
      defaultSalesCwtTaxSourceKey: this.normalizeOptionalString(dto.defaultSalesCwtTaxSourceKey),
      defaultSalesWvatTaxSourceKey: partyEntityTypeIsGovernment
        ? this.normalizeOptionalString(dto.defaultSalesWvatTaxSourceKey)
        : null,
      contactPerson: this.normalizeOptionalString(dto.contactPerson),
      email: this.normalizeOptionalString(dto.email),
      contactNo: this.normalizeOptionalString(dto.contactNo),
      landline: this.normalizeOptionalString(dto.landline),
      addresses: dto.addresses.map((address) => this.normalizeAddress(address)),
    };

    if (options.resolveAddressNames) {
      normalized.addresses = await Promise.all(normalized.addresses.map((address) => this.resolveImportAddressNames(address)));
    }

    this.validateParty(normalized);
    await this.ensurePartyChartAccounts(companyId, normalized);
    await this.ensurePartyTaxDefaults(normalized);

    if (options.requirePartyCode && !normalized.partyCodeNo) {
      throw new BadRequestException('Party code is required.');
    }

    return normalized;
  }

  private mergePartyDto(current: PartyWithDetails, dto: UpdatePartyDto): CreatePartyDto {
    const currentTaxDefaults = current as PartyWithDetails & PartyTaxDefaultSourceKeys;

    return {
      partyCodeNo: dto.partyCodeNo ?? current.partyCodeNo,
      classification: dto.classification ?? current.classification,
      partyEntityType: dto.partyEntityType ?? current.partyEntityType?.name ?? null,
      partyTypes: dto.partyTypes ?? current.partyTypes,
      status: dto.status ?? current.status,
      partyName: dto.partyName ?? current.partyName ?? '',
      tradeName: dto.tradeName ?? current.tradeName ?? '',
      firstName: dto.firstName ?? current.firstName ?? '',
      middleName: dto.middleName ?? current.middleName ?? '',
      lastName: dto.lastName ?? current.lastName ?? '',
      suffixName: dto.suffixName ?? current.suffixName ?? '',
      honorific: dto.honorific ?? current.honorific ?? '',
      gender: dto.gender ?? current.gender ?? '',
      civilStatus: dto.civilStatus ?? current.civilStatus ?? '',
      nationality: dto.nationality ?? current.nationality ?? '',
      memberRegistrationDate: dto.memberRegistrationDate ?? current.memberRegistrationDate?.toISOString().slice(0, 10) ?? null,
      addresses:
        dto.addresses ??
        current.addresses.map((address) => ({
          addressName: address.addressName,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          barangay: address.barangay,
          barangayCode: address.barangayCode,
          cityMunicipality: address.cityMunicipality,
          cityMunicipalityCode: address.cityMunicipalityCode,
          province: address.province,
          provinceCode: address.provinceCode,
          region: address.region,
          regionCode: address.regionCode,
          isBilling: address.isBilling,
          isBuilding: address.isBuilding,
          isDefault: address.isDefault,
          isDelivery: address.isDelivery,
          isForeign: address.isForeign,
          isHome: address.isHome,
        })),
      defaultReceivableAccount: dto.defaultReceivableAccount ?? current.defaultReceivableAccountId?.toString() ?? '',
      customerAdvanceAccount: dto.customerAdvanceAccount ?? current.customerAdvanceAccountId?.toString() ?? '',
      defaultPayableAccount: dto.defaultPayableAccount ?? current.defaultPayableAccountId?.toString() ?? '',
      vendorAdvanceAccount: dto.vendorAdvanceAccount ?? current.vendorAdvanceAccountId?.toString() ?? '',
      employeeAdvanceAccount: dto.employeeAdvanceAccount ?? current.employeeAdvanceAccountId?.toString() ?? '',
      employeePayableAccount: dto.employeePayableAccount ?? current.employeePayableAccountId?.toString() ?? '',
      termId: dto.termId ?? current.termId?.toString() ?? '',
      tin: dto.tin ?? current.tin ?? '',
      atcCode: dto.atcCode ?? current.atcCode ?? '',
      defaultPurchaseInputVatTaxSourceKey: dto.defaultPurchaseInputVatTaxSourceKey ?? currentTaxDefaults.defaultPurchaseInputVatTaxSourceKey ?? '',
      defaultPurchaseEwtTaxSourceKey: dto.defaultPurchaseEwtTaxSourceKey ?? currentTaxDefaults.defaultPurchaseEwtTaxSourceKey ?? '',
      defaultPurchaseFwtTaxSourceKey: dto.defaultPurchaseFwtTaxSourceKey ?? currentTaxDefaults.defaultPurchaseFwtTaxSourceKey ?? '',
      defaultPurchaseWvatTaxSourceKey: dto.defaultPurchaseWvatTaxSourceKey ?? currentTaxDefaults.defaultPurchaseWvatTaxSourceKey ?? '',
      defaultSalesOutputVatTaxSourceKey: dto.defaultSalesOutputVatTaxSourceKey ?? currentTaxDefaults.defaultSalesOutputVatTaxSourceKey ?? '',
      defaultSalesCwtTaxSourceKey: dto.defaultSalesCwtTaxSourceKey ?? currentTaxDefaults.defaultSalesCwtTaxSourceKey ?? '',
      defaultSalesWvatTaxSourceKey: dto.defaultSalesWvatTaxSourceKey ?? currentTaxDefaults.defaultSalesWvatTaxSourceKey ?? '',
      contactPerson: dto.contactPerson ?? current.contactPerson ?? '',
      email: dto.email ?? current.email ?? '',
      contactNo: dto.contactNo ?? current.contactNo ?? '',
      landline: dto.landline ?? current.landline ?? '',
    };
  }

  private validateParty(dto: NormalizedPartyDto) {
    if (dto.partyCodeNo && !dto.partyCodeNo.trim()) {
      throw new BadRequestException('Party code is required.');
    }

    if (dto.partyTypes.length === 0) {
      throw new BadRequestException('Select at least one party type.');
    }

    if (dto.classification === PartyClassification.NON_INDIVIDUAL && !dto.partyName) {
      throw new BadRequestException('Party name is required.');
    }

    if (dto.classification === PartyClassification.INDIVIDUAL) {
      if (!dto.firstName) {
        throw new BadRequestException('First name is required.');
      }

      if (!dto.lastName) {
        throw new BadRequestException('Last name is required.');
      }
    }

    if (
      dto.classification === PartyClassification.NON_INDIVIDUAL &&
      (dto.partyTypes.includes(PartyType.EMPLOYEE) || dto.partyTypes.includes(PartyType.MEMBER))
    ) {
      throw new BadRequestException('Employee and Member are only available for individual parties.');
    }

    if (dto.classification === PartyClassification.NON_INDIVIDUAL && !dto.partyEntityTypeId) {
      throw new BadRequestException('Select a party entity type.');
    }

    this.validateAccountingAccounts(dto);
    this.validateAddresses(dto);
  }

  private validateAccountingAccounts(dto: CreatePartyDto) {
    const requiredFields = [
      {
        enabled: dto.partyTypes.includes(PartyType.CUSTOMER),
        value: dto.defaultReceivableAccount,
        message: 'Default receivable account is required.',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.CUSTOMER),
        value: dto.customerAdvanceAccount,
        message: 'Default customer advance account is required.',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.VENDOR),
        value: dto.defaultPayableAccount,
        message: 'Default payable account is required.',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.VENDOR),
        value: dto.vendorAdvanceAccount,
        message: 'Default vendor advance account is required.',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.EMPLOYEE),
        value: dto.employeeAdvanceAccount,
        message: 'Default employee advance account is required.',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.EMPLOYEE),
        value: dto.employeePayableAccount,
        message: 'Default employee payable account is required.',
      },
    ];

    for (const field of requiredFields) {
      if (field.enabled && !field.value) {
        throw new BadRequestException(field.message);
      }
    }
  }

  private validateAddresses(dto: CreatePartyDto) {
    if (dto.addresses.length === 0) {
      throw new BadRequestException('Add at least one address.');
    }

    const defaultCount = dto.addresses.filter((address) => address.isDefault).length;

    if (defaultCount !== 1) {
      throw new BadRequestException('Set exactly one default address.');
    }

    const roleChecks = [
      {
        enabled: dto.partyTypes.includes(PartyType.CUSTOMER) || dto.partyTypes.includes(PartyType.VENDOR),
        count: dto.addresses.filter((address) => address.isBilling).length,
        label: 'billing',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.CUSTOMER),
        count: dto.addresses.filter((address) => address.isDelivery).length,
        label: 'delivery',
      },
      {
        enabled: dto.partyTypes.includes(PartyType.EMPLOYEE) || dto.partyTypes.includes(PartyType.MEMBER),
        count: dto.addresses.filter((address) => address.isHome).length,
        label: 'home',
      },
    ];

    for (const role of roleChecks) {
      if (role.count > 1) {
        throw new BadRequestException(`Select only one ${role.label} address.`);
      }

      if (role.enabled && role.count === 0) {
        throw new BadRequestException(`Complete the ${role.label} address.`);
      }

      if (!role.enabled && role.count > 0) {
        throw new BadRequestException(`Remove the ${role.label} address role for this party type.`);
      }
    }

    for (const address of dto.addresses) {
      if (address.isForeign) {
        if (!address.addressLine1.trim()) {
          throw new BadRequestException('Enter the complete foreign address.');
        }
        continue;
      }

      if (!address.regionCode) {
        throw new BadRequestException('Select a region.');
      }
      if (!address.provinceCode) {
        throw new BadRequestException('Select a province.');
      }
      if (!address.cityMunicipalityCode) {
        throw new BadRequestException('Select a city or municipality.');
      }
      if (!address.barangayCode) {
        throw new BadRequestException('Select a barangay.');
      }
    }
  }

  private async ensureIdentityAvailable(
    companyId: number,
    dto: CreatePartyDto,
    excludedPartyId?: bigint,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (dto.partyCodeNo) {
      const existingByCode = await tx.party.findFirst({
        where: {
          companyId,
          deletedAt: null,
          id: excludedPartyId ? { not: excludedPartyId } : undefined,
          partyCodeNo: { equals: dto.partyCodeNo, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (existingByCode) {
        throw new ConflictException('A party with this code already exists.');
      }
    }

    const displayName = this.getDisplayName(dto);

    if (!displayName) {
      return;
    }

    const existingParties = await tx.party.findMany({
      where: {
        companyId,
        deletedAt: null,
        id: excludedPartyId ? { not: excludedPartyId } : undefined,
      },
      select: {
        partyName: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffixName: true,
        classification: true,
      },
    });

    const normalizedDisplayName = this.normalizeIdentity(displayName);
    const hasMatchingName = existingParties.some(
      (party) =>
        this.normalizeIdentity(
          party.classification === PartyClassification.NON_INDIVIDUAL
            ? (party.partyName ?? '')
            : [party.firstName, party.middleName, party.lastName, party.suffixName].filter(Boolean).join(' '),
        ) === normalizedDisplayName,
    );

    if (hasMatchingName) {
      throw new ConflictException('A party with this name already exists.');
    }
  }

  private async resolveImportAddressNames(address: CreatePartyAddressDto) {
    if (address.isForeign) {
      return address;
    }

    if (!address.province || !address.cityMunicipality || !address.barangay) {
      return address;
    }

    const resolved = await this.addressService.resolveNames({
      barangay: address.barangay,
      cityMunicipality: address.cityMunicipality,
      province: address.province,
    });

    if (!resolved) {
      throw new BadRequestException(
        `Address not found: ${address.barangay}, ${address.cityMunicipality}, ${address.province}. Check the province, city/municipality, and barangay names.`,
      );
    }

    return {
      ...address,
      barangay: resolved.barangay.name,
      barangayCode: resolved.barangay.code,
      cityMunicipality: resolved.cityMunicipality.name,
      cityMunicipalityCode: resolved.cityMunicipality.code,
      province: resolved.province.name,
      provinceCode: resolved.province.code,
      region: resolved.region.name,
      regionCode: resolved.region.code,
    };
  }

  private ensureNoDuplicateImportIdentities(parties: CreatePartyDto[]) {
    const codes = new Set<string>();
    const names = new Set<string>();

    for (const party of parties) {
      const code = this.normalizeIdentity(party.partyCodeNo);
      const name = this.normalizeIdentity(this.getDisplayName(party));

      if (codes.has(code)) {
        throw new BadRequestException(`Duplicate party code in upload: ${party.partyCodeNo}.`);
      }

      if (name && names.has(name)) {
        throw new BadRequestException(`Duplicate party name in upload: ${this.getDisplayName(party)}.`);
      }

      codes.add(code);
      if (name) names.add(name);
    }
  }

  private ensureNoDuplicateImportNames(parties: CreatePartyDto[]) {
    const names = new Set<string>();

    for (const party of parties) {
      const name = this.normalizeIdentity(this.getDisplayName(party));

      if (name && names.has(name)) {
        throw new BadRequestException(`Duplicate party name in upload: ${this.getDisplayName(party)}.`);
      }

      if (name) names.add(name);
    }
  }

  private async resolvePartyCodeForCreate(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      dto,
      isAuto,
    }: {
      branchUnitId: number;
      companyId: number;
      dto: CreatePartyDto;
      isAuto: boolean;
    },
  ) {
    if (!isAuto) {
      return dto.partyCodeNo;
    }

    return (
      await generateTransactionNumberForCompanyBranch(tx, {
        branchUnitId,
        createDefaultIfMissing: true,
        companyId,
        moduleCode: PartyTransactionModuleCode,
        isIssued: (transactionNumber) => this.isPartyCodeIssued(tx, companyId, transactionNumber),
      })
    ).transactionNumber;
  }

  private async resolveBranchUnitId(companyId: number, branchUnitId: number | null | undefined) {
    const branch = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        isActive: true,
        ...(branchUnitId ? { id: branchUnitId } : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException('Select an active branch.');
    }

    return branch.id;
  }

  private async isPartyCodeIssued(tx: Prisma.TransactionClient, companyId: number, partyCodeNo: string) {
    const existing = await tx.party.findFirst({
      where: {
        companyId,
        deletedAt: null,
        partyCodeNo: { equals: partyCodeNo, mode: 'insensitive' },
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  private async ensurePartyChartAccounts(companyId: number, dto: CreatePartyDto) {
    const requiredAccountIds = [
      dto.partyTypes.includes(PartyType.CUSTOMER) ? dto.defaultReceivableAccount : null,
      dto.partyTypes.includes(PartyType.CUSTOMER) ? dto.customerAdvanceAccount : null,
      dto.partyTypes.includes(PartyType.VENDOR) ? dto.defaultPayableAccount : null,
      dto.partyTypes.includes(PartyType.VENDOR) ? dto.vendorAdvanceAccount : null,
      dto.partyTypes.includes(PartyType.EMPLOYEE) ? dto.employeeAdvanceAccount : null,
      dto.partyTypes.includes(PartyType.EMPLOYEE) ? dto.employeePayableAccount : null,
    ]
      .map((value) => parseOptionalPositiveBigIntId(value))
      .filter((value): value is bigint => value !== null);

    if (requiredAccountIds.length === 0) {
      return;
    }

    const uniqueAccountIds = [...new Set(requiredAccountIds)];
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        id: { in: uniqueAccountIds },
        companyId,
        deletedAt: null,
        isPostingAccount: true,
        status: ChartAccountStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (accounts.length !== uniqueAccountIds.length) {
      throw new BadRequestException('Select active posting accounts from this company.');
    }
  }

  private async ensurePartyTaxDefaults(dto: CreatePartyDto) {
    const defaultFields = [
      {
        sourceKey: dto.defaultPurchaseInputVatTaxSourceKey,
        transactionType: 'Purchases',
        taxTypes: ['INPUT VAT'],
        label: 'Purchase Input VAT',
      },
      {
        sourceKey: dto.defaultPurchaseEwtTaxSourceKey,
        transactionType: 'Purchases',
        taxTypes: ['EWT'],
        label: 'Purchase Expanded Withholding Tax',
      },
      {
        sourceKey: dto.defaultPurchaseFwtTaxSourceKey,
        transactionType: 'Purchases',
        taxTypes: ['FWT'],
        label: 'Purchase Final Withholding Tax',
      },
      {
        sourceKey: dto.defaultPurchaseWvatTaxSourceKey,
        transactionType: 'Purchases',
        taxTypes: ['EWT', 'WVAT'],
        officialAtcCodePrefix: 'WV',
        label: 'Purchase VAT Withholding',
      },
      {
        sourceKey: dto.defaultSalesOutputVatTaxSourceKey,
        transactionType: 'Sales',
        taxTypes: ['OUTPUT VAT'],
        label: 'Sales Output VAT',
      },
      {
        sourceKey: dto.defaultSalesCwtTaxSourceKey,
        transactionType: 'Sales',
        taxTypes: ['CWT'],
        label: 'Sales Creditable Withholding Tax',
      },
      {
        sourceKey: dto.defaultSalesWvatTaxSourceKey,
        transactionType: 'Sales',
        taxTypes: ['WVAT'],
        label: 'Sales VAT Withholding',
      },
    ].filter((field) => Boolean(field.sourceKey));

    if (defaultFields.length === 0) {
      return;
    }

    const taxes = await this.prisma.tax.findMany({
      where: {
        sourceKey: {
          in: defaultFields.map((field) => field.sourceKey as string),
        },
      },
      select: {
        sourceKey: true,
        officialAtcCode: true,
        taxType: true,
        transactionType: true,
      },
    });
    const taxBySourceKey = new Map(taxes.map((tax) => [tax.sourceKey, tax]));

    for (const field of defaultFields) {
      const tax = taxBySourceKey.get(field.sourceKey as string);

      if (
        !tax ||
        tax.transactionType !== field.transactionType ||
        !field.taxTypes.includes(tax.taxType) ||
        (field.officialAtcCodePrefix &&
          !tax.officialAtcCode?.startsWith(field.officialAtcCodePrefix))
      ) {
        throw new BadRequestException(`Select a valid ${field.label} tax.`);
      }
    }
  }

  private parseOptionalDate(value: string | null | undefined) {
    const normalized = value?.trim();

    return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null;
  }

  private async ensureTermBelongsToCompany(companyId: number, termId: bigint) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, companyId, deletedAt: null },
      select: { id: true },
    });

    if (!term) {
      throw new BadRequestException('Selected term does not exist.');
    }
  }

  private async resolvePartyEntityType(
    classification: PartyClassification,
    value: string | null | undefined,
  ) {
    if (classification === PartyClassification.INDIVIDUAL) {
      return null;
    }

    const name = this.normalizeOptionalString(value);

    if (!name) {
      return null;
    }

    const partyEntityType = await this.prisma.partyEntityType.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        status: PartyStatus.ACTIVE,
      },
    });

    if (!partyEntityType) {
      throw new BadRequestException('Choose a valid party entity type.');
    }

    if (partyEntityType.classification !== classification) {
      throw new BadRequestException('Choose a non-individual party entity type.');
    }

    return partyEntityType;
  }

  private async findPartyOrThrow(companyId: number, partyId: bigint) {
    const party = await this.prisma.party.findFirst({
      where: { id: partyId, companyId, deletedAt: null },
      include: PartyInclude,
    });

    if (!party) {
      throw new NotFoundException('Party record not found.');
    }

    return party;
  }

  private toPartyData(dto: NormalizedPartyDto) {
    return {
      termId: dto.termId ? parsePositiveBigIntId(dto.termId) : null,
      partyCodeNo: dto.partyCodeNo,
      classification: dto.classification,
      partyEntityTypeId: dto.partyEntityTypeId,
      partyTypes: dto.partyTypes,
      status: dto.status ?? PartyStatus.ACTIVE,
      partyName: dto.classification === PartyClassification.NON_INDIVIDUAL ? dto.partyName : null,
      tradeName: dto.classification === PartyClassification.NON_INDIVIDUAL ? dto.tradeName : null,
      firstName: dto.classification === PartyClassification.INDIVIDUAL ? dto.firstName : null,
      middleName: dto.classification === PartyClassification.INDIVIDUAL ? dto.middleName : null,
      lastName: dto.classification === PartyClassification.INDIVIDUAL ? dto.lastName : null,
      suffixName: dto.classification === PartyClassification.INDIVIDUAL ? dto.suffixName : null,
      honorific: dto.classification === PartyClassification.INDIVIDUAL ? dto.honorific : null,
      gender: hasPersonalInformationPartyType(dto.partyTypes) ? dto.gender : null,
      civilStatus: hasPersonalInformationPartyType(dto.partyTypes) ? dto.civilStatus : null,
      nationality: hasPersonalInformationPartyType(dto.partyTypes) ? (dto.nationality ?? null) : null,
      memberRegistrationDate: dto.partyTypes.includes(PartyType.MEMBER) ? this.parseOptionalDate(dto.memberRegistrationDate) : null,
      defaultReceivableAccountId: dto.partyTypes.includes(PartyType.CUSTOMER) ? parseOptionalPositiveBigIntId(dto.defaultReceivableAccount) : null,
      customerAdvanceAccountId: dto.partyTypes.includes(PartyType.CUSTOMER) ? parseOptionalPositiveBigIntId(dto.customerAdvanceAccount) : null,
      defaultPayableAccountId: dto.partyTypes.includes(PartyType.VENDOR) ? parseOptionalPositiveBigIntId(dto.defaultPayableAccount) : null,
      vendorAdvanceAccountId: dto.partyTypes.includes(PartyType.VENDOR) ? parseOptionalPositiveBigIntId(dto.vendorAdvanceAccount) : null,
      employeeAdvanceAccountId: dto.partyTypes.includes(PartyType.EMPLOYEE) ? parseOptionalPositiveBigIntId(dto.employeeAdvanceAccount) : null,
      employeePayableAccountId: dto.partyTypes.includes(PartyType.EMPLOYEE) ? parseOptionalPositiveBigIntId(dto.employeePayableAccount) : null,
      tin: dto.tin,
      atcCode: dto.atcCode,
      defaultPurchaseInputVatTaxSourceKey: dto.partyTypes.includes(PartyType.VENDOR) ? dto.defaultPurchaseInputVatTaxSourceKey : null,
      defaultPurchaseEwtTaxSourceKey: dto.partyTypes.includes(PartyType.VENDOR) ? dto.defaultPurchaseEwtTaxSourceKey : null,
      defaultPurchaseFwtTaxSourceKey:
        dto.partyTypes.includes(PartyType.VENDOR) && dto.partyEntityTypeIsGovernment
          ? dto.defaultPurchaseFwtTaxSourceKey
          : null,
      defaultPurchaseWvatTaxSourceKey:
        dto.partyTypes.includes(PartyType.VENDOR) && dto.partyEntityTypeIsGovernment
          ? dto.defaultPurchaseWvatTaxSourceKey
          : null,
      defaultSalesOutputVatTaxSourceKey: dto.partyTypes.includes(PartyType.CUSTOMER) ? dto.defaultSalesOutputVatTaxSourceKey : null,
      defaultSalesCwtTaxSourceKey: dto.partyTypes.includes(PartyType.CUSTOMER) ? dto.defaultSalesCwtTaxSourceKey : null,
      defaultSalesWvatTaxSourceKey:
        dto.partyTypes.includes(PartyType.CUSTOMER) && dto.partyEntityTypeIsGovernment
          ? dto.defaultSalesWvatTaxSourceKey
          : null,
      contactPerson: dto.contactPerson,
      email: dto.email,
      contactNo: dto.contactNo,
      landline: dto.landline,
    };
  }

  private toAddressData(address: CreatePartyAddressDto) {
    return {
      addressName: address.addressName.trim() || 'Address',
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2.trim(),
      barangay: this.normalizeOptionalString(address.barangay),
      barangayCode: this.normalizeOptionalString(address.barangayCode),
      cityMunicipality: this.normalizeOptionalString(address.cityMunicipality),
      cityMunicipalityCode: this.normalizeOptionalString(address.cityMunicipalityCode),
      province: this.normalizeOptionalString(address.province),
      provinceCode: this.normalizeOptionalString(address.provinceCode),
      region: this.normalizeOptionalString(address.region),
      regionCode: this.normalizeOptionalString(address.regionCode),
      isBilling: address.isBilling,
      isBuilding: Boolean(address.isBuilding),
      isDefault: address.isDefault,
      isDelivery: address.isDelivery,
      isForeign: Boolean(address.isForeign),
      isHome: Boolean(address.isHome),
    };
  }

  private normalizeAddress(address: CreatePartyAddressDto): CreatePartyAddressDto {
    return {
      ...address,
      addressName: address.addressName.trim() || 'Address',
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2.trim(),
      barangay: this.normalizeOptionalString(address.barangay),
      barangayCode: this.normalizeOptionalString(address.barangayCode),
      cityMunicipality: this.normalizeOptionalString(address.cityMunicipality),
      cityMunicipalityCode: this.normalizeOptionalString(address.cityMunicipalityCode),
      province: this.normalizeOptionalString(address.province),
      provinceCode: this.normalizeOptionalString(address.provinceCode),
      region: this.normalizeOptionalString(address.region),
      regionCode: this.normalizeOptionalString(address.regionCode),
      isBuilding: Boolean(address.isBuilding),
      isForeign: Boolean(address.isForeign),
      isHome: Boolean(address.isHome),
    };
  }

  private normalizePartyTypes(partyTypes: PartyType[]) {
    return [...new Set(partyTypes)];
  }

  private getDisplayName(dto: CreatePartyDto) {
    if (dto.classification === PartyClassification.NON_INDIVIDUAL) {
      return dto.partyName ?? '';
    }

    return [dto.firstName, dto.middleName, dto.lastName, dto.suffixName]
      .map((part) => part?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  }

  private normalizeIdentity(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeOptionalString(value: string | null | undefined) {
    const normalized = value?.trim() ?? '';

    return normalized || null;
  }

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`PM:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage party records.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canCancel: this.can(user, companyId, PermissionAction.CANCEL),
      canUncancel: this.can(user, companyId, PermissionAction.UNCANCEL),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
      canImport: this.can(user, companyId, PermissionAction.CREATE),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`PM:${action}`);
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A party with this code already exists.');
    }
  }
}

type PartyTaxDefaultSourceKeys = {
  defaultPurchaseInputVatTaxSourceKey?: string | null;
  defaultPurchaseEwtTaxSourceKey?: string | null;
  defaultPurchaseFwtTaxSourceKey?: string | null;
  defaultPurchaseWvatTaxSourceKey?: string | null;
  defaultSalesOutputVatTaxSourceKey?: string | null;
  defaultSalesCwtTaxSourceKey?: string | null;
  defaultSalesWvatTaxSourceKey?: string | null;
};

type NormalizedPartyDto = CreatePartyDto & {
  partyEntityTypeId: bigint | null;
  partyEntityTypeIsGovernment: boolean;
};

function hasPersonalInformationPartyType(partyTypes: PartyType[]) {
  return partyTypes.includes(PartyType.EMPLOYEE) || partyTypes.includes(PartyType.MEMBER);
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

const PartyTransactionModuleCode = 'PM';
