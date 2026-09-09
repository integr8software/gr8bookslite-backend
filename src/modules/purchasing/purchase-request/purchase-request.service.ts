import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChartAccountStatus,
  Party,
  PartyStatus,
  Prisma,
  PurchaseRequestStatus,
  ResponsibilityCenter,
  ResponsibilityCenterCategory,
  ResponsibilityCenterStatus,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { parsePositiveBigIntId, parseOptionalPositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { GetPurchaseRequestListQueryDto } from './dto/get-purchase-request-list-query.dto';
import { PurchaseRequestItemDto } from './dto/purchase-request-item.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { UpdatePurchaseRequestStatusDto } from './dto/update-purchase-request-status.dto';

const DefaultPurchaseRequestTypes = ['Goods', 'Services', 'Assets'];

@Injectable()
export class PurchaseRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetPurchaseRequestListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const branchUnitId = query.branchUnitId ? await this.resolveBranchUnitId(companyId, query.branchUnitId) : undefined;
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const where: Prisma.PurchaseRequestWhereInput = {
      companyId,
      branchUnitId,
      deletedAt: null,
      ...(query.search?.trim()
        ? {
            OR: [
              { transNo: { contains: query.search.trim(), mode: 'insensitive' } },
              { partyCodeSnapshot: { contains: query.search.trim(), mode: 'insensitive' } },
              { partyNameSnapshot: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        include: this.include(),
        orderBy: [{ prDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return {
      purchaseRequests: records.map((record) => this.map(record)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const record = await this.findRecordOrThrow(companyId, parsePositiveBigIntId(id));

    return { purchaseRequest: this.map(record) };
  }

  async findPurchaseTypes(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    return {
      purchaseTypes: DefaultPurchaseRequestTypes.map((name) => ({
        id: name.toUpperCase(),
        code: name.toUpperCase(),
        name,
        status: 'ACTIVE',
      })),
    };
  }

  async create(user: AuthUser, dto: CreatePurchaseRequestDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId);
    const references = await this.resolveReferences(companyId, dto);

    await this.ensureTransactionNoAvailable(companyId, branchUnitId, dto.transNo);

    const record = await this.prisma.purchaseRequest.create({
      data: {
        ...this.buildHeaderData(companyId, branchUnitId, dto, references, user.id),
        entries: {
          create: await this.buildItemData(companyId, branchUnitId, dto.items, references.purchaseType),
        },
      },
      include: this.include(),
    });

    return { purchaseRequest: this.map(record) };
  }

  async update(user: AuthUser, id: string, dto: UpdatePurchaseRequestDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const recordId = parsePositiveBigIntId(id);
    const existing = await this.findRecordOrThrow(companyId, recordId);
    const branchUnitId = await this.resolveBranchUnitId(companyId, dto.branchUnitId ?? existing.branchUnitId);
    const merged: CreatePurchaseRequestDto = {
      branchUnitId,
      transNo: dto.transNo ?? existing.transNo,
      prDate: dto.prDate ?? existing.prDate.toISOString(),
      partyId: dto.partyId ?? existing.partyId.toString(),
      partyCode: dto.partyCode ?? existing.partyCodeSnapshot,
      partyName: dto.partyName ?? existing.partyNameSnapshot,
      purchaseType: dto.purchaseType ?? existing.purchaseType,
      vendorAddress: dto.vendorAddress ?? existing.vendorAddress,
      projectResponsibilityCenterId: dto.projectResponsibilityCenterId ?? existing.projectId?.toString() ?? null,
      projectCode: dto.projectCode ?? existing.projectCodeSnapshot,
      projectName: dto.projectName ?? existing.projectNameSnapshot,
      currency: dto.currency ?? existing.currencyCode,
      exchangeRate: dto.exchangeRate ?? Number(existing.exchangeRate),
      forDepartment: dto.forDepartment ?? existing.forDepartment,
      bomNo: dto.bomNo ?? existing.bomNo,
      remarks: dto.remarks ?? existing.remarks,
      items:
        dto.items ??
        existing.entries.map((item) => ({
          itemId: item.itemId,
          serviceMaintenanceId: item.serviceMaintenanceId?.toString(),
          itemCode: item.itemCode,
          barcode: item.barcode,
          description: item.description,
          uom: item.uom,
          qty: Number(item.qty),
          lotNo: item.lotNo,
          cost: Number(item.cost),
          responsibilityCenterId: item.responsibilityCenterId?.toString(),
          responsibilityCenter: item.responsibilityCenterName,
        })),
    };
    const references = await this.resolveReferences(companyId, merged);

    if (merged.transNo !== existing.transNo || branchUnitId !== existing.branchUnitId) {
      await this.ensureTransactionNoAvailable(companyId, branchUnitId, merged.transNo, recordId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseRequestEntry.deleteMany({ where: { purchaseRequestId: recordId } });

      return tx.purchaseRequest.update({
        where: { id: recordId },
        data: {
          ...this.buildHeaderData(companyId, branchUnitId, merged, references, user.id),
          entries: {
            create: await this.buildItemData(companyId, branchUnitId, merged.items, references.purchaseType),
          },
        },
        include: this.include(),
      });
    });

    return { purchaseRequest: this.map(updated) };
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdatePurchaseRequestStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const record = await this.findRecordOrThrow(companyId, parsePositiveBigIntId(id));
    const now = new Date();
    const userId = user.id;

    const updated = await this.prisma.purchaseRequest.update({
      where: { id: record.id },
      data: {
        status: dto.status,
        updatedByUserId: userId,
        updatedAt: now,
        ...(dto.status === PurchaseRequestStatus.POSTED ? { postedByUserId: userId, postedAt: now } : {}),
        ...(dto.status === PurchaseRequestStatus.DISAPPROVED ? { disapprovedByUserId: userId, disapprovedAt: now } : {}),
        ...(dto.status === PurchaseRequestStatus.CANCELLED ? { cancelledByUserId: userId, cancelledAt: now } : {}),
      },
      include: this.include(),
    });

    return { purchaseRequest: this.map(updated) };
  }

  private async resolveReferences(companyId: number, dto: CreatePurchaseRequestDto) {
    const purchaseType = this.resolvePurchaseType(companyId, dto);
    const [party, project] = await Promise.all([this.resolveParty(companyId, dto), this.resolveProject(companyId, dto)]);

    return { party, purchaseType, project };
  }

  private async resolveParty(companyId: number, dto: CreatePurchaseRequestDto) {
    const partyId = parseOptionalPositiveBigIntId(dto.partyId, 'partyId');
    const party = await this.prisma.party.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        ...(partyId ? { id: partyId } : { partyCodeNo: dto.partyCode?.trim() }),
      },
    });

    if (!party) {
      throw new BadRequestException('Select a valid Party Name from maintenance.');
    }

    return party;
  }

  private resolvePurchaseType(companyId: number, dto: CreatePurchaseRequestDto) {
    void companyId;
    const purchaseType = DefaultPurchaseRequestTypes.find((type) => type.toLowerCase() === dto.purchaseType.trim().toLowerCase());
    if (!purchaseType) throw new BadRequestException('Purchase Type must be Goods, Services, or Assets.');
    return purchaseType;
  }

  private async resolveProject(companyId: number, dto: CreatePurchaseRequestDto) {
    const projectId = parseOptionalPositiveBigIntId(dto.projectResponsibilityCenterId, 'projectResponsibilityCenterId');
    const projectCode = cleanOptional(dto.projectCode);
    const projectName = cleanOptional(dto.projectName);

    if (!projectId && !projectCode && !projectName) {
      return null;
    }

    const projectMatches: Prisma.ResponsibilityCenterWhereInput[] = [
      ...(projectCode ? [{ code: projectCode }] : []),
      ...(projectName ? [{ name: { equals: projectName, mode: Prisma.QueryMode.insensitive } }] : []),
    ];

    const project = await this.prisma.responsibilityCenter.findFirst({
      where: {
        companyId,
        category: ResponsibilityCenterCategory.PROJECT,
        deletedAt: null,
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(projectId
          ? { id: projectId }
          : {
              OR: projectMatches,
            }),
      },
    });

    if (!project) {
      throw new BadRequestException('Select a valid Project Name from responsibility center maintenance.');
    }

    return project;
  }

  private async buildItemData(companyId: number, branchUnitId: number, items: PurchaseRequestItemDto[], purchaseTypeName: string) {
    const isServices = purchaseTypeName.trim().toLowerCase() === 'services';
    const resolvedItems = await Promise.all(
      items.map(async (item, index) => {
        const [responsibilityCenter, serviceMaintenance] = await Promise.all([
          this.resolveItemResponsibilityCenter(companyId, item),
          isServices ? this.resolveServiceMaintenance(companyId, item) : Promise.resolve(null),
        ]);

        return {
          companyId,
          branchUnitId,
          lineNo: index + 1,
          itemId: isServices ? null : cleanOptional(item.itemId),
          serviceMaintenanceId: serviceMaintenance?.id ?? null,
          itemCode: cleanOptional(item.itemCode),
          barcode: isServices ? null : cleanOptional(item.barcode),
          description: item.description.trim(),
          uom: isServices ? null : cleanOptional(item.uom),
          qty: new Prisma.Decimal(item.qty),
          lotNo: cleanOptional(item.lotNo),
          cost: new Prisma.Decimal(item.cost ?? 0),
          responsibilityCenterId: responsibilityCenter?.id ?? null,
          responsibilityCenterName: responsibilityCenter?.name ?? cleanOptional(item.responsibilityCenter),
        };
      }),
    );

    resolvedItems.forEach((item) => {
      if (!item.description) {
        throw new BadRequestException('Each purchase request line needs a description.');
      }
      if (!isServices && (!item.barcode || !item.uom)) {
        throw new BadRequestException('Goods purchase request lines need barcode and UOM.');
      }
    });

    return resolvedItems;
  }

  private async resolveServiceMaintenance(companyId: number, item: PurchaseRequestItemDto) {
    const id = parseOptionalPositiveBigIntId(item.serviceMaintenanceId, 'serviceMaintenanceId');

    if (!id) {
      throw new BadRequestException('Select a valid service from Service Maintenance.');
    }

    const service = await this.prisma.serviceMaintenance.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
      },
    });

    if (!service) {
      throw new BadRequestException('Select a valid service from Service Maintenance.');
    }

    return service;
  }

  private async resolveItemResponsibilityCenter(companyId: number, item: PurchaseRequestItemDto) {
    const id = parseOptionalPositiveBigIntId(item.responsibilityCenterId, 'responsibilityCenterId');
    const name = cleanOptional(item.responsibilityCenter);

    if (!id && !name) {
      return null;
    }

    const center = await this.prisma.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(id ? { id } : { name: { equals: name ?? '', mode: 'insensitive' } }),
      },
    });

    if (!center) {
      throw new BadRequestException('Select a valid Responsibility Center from maintenance.');
    }

    return center;
  }

  private buildHeaderData(
    companyId: number,
    branchUnitId: number,
    dto: CreatePurchaseRequestDto,
    references: { party: Party; purchaseType: string; project: ResponsibilityCenter | null },
    userId: number,
  ) {
    return {
      companyId,
      branchUnitId,
      partyId: references.party.id,
      projectId: references.project?.id ?? null,
      purchaseType: references.purchaseType,
      transNo: dto.transNo.trim(),
      prDate: new Date(dto.prDate),
      partyCodeSnapshot: references.party.partyCodeNo,
      partyNameSnapshot: this.getPartyName(references.party),
      vendorAddress: cleanOptional(dto.vendorAddress),
      projectCodeSnapshot: references.project?.code ?? cleanOptional(dto.projectCode),
      projectNameSnapshot: references.project?.name ?? cleanOptional(dto.projectName),
      currencyCode: cleanCurrencyCode(dto.currency) ?? 'PHP',
      exchangeRate: new Prisma.Decimal(dto.exchangeRate ?? 1),
      forDepartment: cleanOptional(dto.forDepartment),
      bomNo: cleanOptional(dto.bomNo),
      remarks: cleanOptional(dto.remarks),
      updatedByUserId: userId,
      updatedAt: new Date(),
    };
  }

  private async resolveBranchUnitId(companyId: number, branchUnitId?: number) {
    const branch = await this.prisma.companyUnit.findFirst({
      where: {
        companyId,
        id: branchUnitId,
        isActive: true,
      },
      orderBy: { id: 'asc' },
    });

    if (!branch) {
      throw new BadRequestException('Select a valid branch for this purchase request.');
    }

    return branch.id;
  }

  private async ensureTransactionNoAvailable(companyId: number, branchUnitId: number, transNo: string, currentId?: bigint) {
    const existing = await this.prisma.purchaseRequest.findFirst({
      where: {
        companyId,
        branchUnitId,
        transNo: transNo.trim(),
        deletedAt: null,
        ...(currentId ? { NOT: { id: currentId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Purchase request number already exists for this branch.');
    }
  }

  private async findRecordOrThrow(companyId: number, id: bigint) {
    const record = await this.prisma.purchaseRequest.findFirst({
      where: { id, companyId, deletedAt: null },
      include: this.include(),
    });

    if (!record) {
      throw new NotFoundException('Purchase request not found.');
    }

    return record;
  }

  private include() {
    return {
      branchUnit: true,
      entries: {
        include: { responsibilityCenter: true },
        orderBy: { lineNo: 'asc' },
      },
      party: true,
      project: true,
    } satisfies Prisma.PurchaseRequestInclude;
  }

  private map(record: Prisma.PurchaseRequestGetPayload<{ include: ReturnType<PurchaseRequestService['include']> }>) {
    return {
      id: record.id.toString(),
      branchUnitId: record.branchUnitId,
      branchName: record.branchUnit.name,
      transNo: record.transNo,
      prDate: record.prDate.toISOString(),
      partyId: record.partyId.toString(),
      partyCode: record.partyCodeSnapshot,
      partyName: record.partyNameSnapshot,
      purchaseType: record.purchaseType,
      vendorAddress: record.vendorAddress,
      projectResponsibilityCenterId: record.projectId?.toString() ?? null,
      projectCode: record.projectCodeSnapshot,
      projectName: record.projectNameSnapshot,
      currency: record.currencyCode,
      exchangeRate: Number(record.exchangeRate),
      forDepartment: record.forDepartment,
      bomNo: record.bomNo,
      remarks: record.remarks,
      status: record.status,
      items: record.entries.map((item) => ({
        id: item.id.toString(),
        itemId: item.itemId,
        serviceMaintenanceId: item.serviceMaintenanceId?.toString() ?? null,
        itemCode: item.itemCode,
        barcode: item.barcode,
        description: item.description,
        uom: item.uom,
        qty: Number(item.qty),
        lotNo: item.lotNo,
        cost: Number(item.cost),
        responsibilityCenterId: item.responsibilityCenterId?.toString() ?? null,
        responsibilityCenter: item.responsibilityCenter?.name ?? item.responsibilityCenterName,
      })),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt?.toISOString() ?? null,
    };
  }

  private getPartyName(party: Party) {
    return (
      party.partyName || party.tradeName || [party.firstName, party.middleName, party.lastName, party.suffixName].filter(Boolean).join(' ') || party.partyCodeNo
    );
  }
}
