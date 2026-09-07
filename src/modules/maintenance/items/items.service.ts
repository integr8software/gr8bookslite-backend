import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateItemBasicInfoDto, UpdateItemBasicInfoDto, ItemBasicInfoResponseDto, ItemBasicInfoStatus } from './dto/item-basic-info.dto';
import { UpsertItemPricingDto, ItemPricingResponseDto } from './dto/item-pricing.dto';

const include = { category: true, unitOfMeasurement: true, responsibilityCenter: true, pricing: true } as const;
type Item = Prisma.ItemBasicInfoGetPayload<{ include: typeof include }>;

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorize(user: AuthUser, action: PermissionAction) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'I', action, 'You do not have permission to manage items.');
    return companyId;
  }

  async findAll(user: AuthUser) {
    const companyId = await this.authorize(user, PermissionAction.VIEW);
    const items = await this.prisma.itemBasicInfo.findMany({ where: { companyId, deletedAt: null }, include, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    return { items: items.map(mapItem) };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = await this.authorize(user, PermissionAction.VIEW);
    return mapItem(await this.findOrThrow(companyId, parsePositiveBigIntId(id)));
  }

  async create(user: AuthUser, dto: CreateItemBasicInfoDto) {
    const companyId = await this.authorize(user, PermissionAction.CREATE);
    await this.validateReferences(companyId, dto);
    await this.validateCode(companyId, dto.code);
    try {
      return mapItem(
        await this.prisma.itemBasicInfo.create({
          data: {
            ...dto,
            companyId,
            code: dto.code.trim(),
            name: dto.name.trim(),
            categoryId: parsePositiveBigIntId(dto.categoryId),
            unitOfMeasurementId: parsePositiveBigIntId(dto.unitOfMeasurementId),
            responsibilityCenterId: dto.responsibilityCenterId ? parsePositiveBigIntId(dto.responsibilityCenterId) : null,
            tags: dto.tags ?? [],
            createdByUserId: user.id,
          },
          include,
        }),
      );
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'An item with this code already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateItemBasicInfoDto) {
    const companyId = await this.authorize(user, PermissionAction.UPDATE);
    const itemId = parsePositiveBigIntId(id);
    const existing = await this.findOrThrow(companyId, itemId);
    await this.validateReferences(companyId, dto, existing);
    if (dto.code !== undefined) await this.validateCode(companyId, dto.code, itemId);
    try {
      return mapItem(
        await this.prisma.itemBasicInfo.update({
          where: { id: itemId, companyId },
          data: {
            ...dto,
            categoryId: dto.categoryId === undefined ? undefined : parsePositiveBigIntId(dto.categoryId),
            unitOfMeasurementId: dto.unitOfMeasurementId === undefined ? undefined : parsePositiveBigIntId(dto.unitOfMeasurementId),
            responsibilityCenterId:
              dto.responsibilityCenterId === undefined
                ? undefined
                : dto.responsibilityCenterId === null
                  ? null
                  : parsePositiveBigIntId(dto.responsibilityCenterId),
            updatedByUserId: user.id,
            updatedAt: new Date(),
          },
          include,
        }),
      );
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'An item with this code already exists.');
      throw error;
    }
  }

  async getPricing(user: AuthUser, itemId: string): Promise<ItemPricingResponseDto> {
    const companyId = await this.authorize(user, PermissionAction.VIEW);
    const parsedItemId = parsePositiveBigIntId(itemId);
    await this.findOrThrow(companyId, parsedItemId);

    const pricing = await this.prisma.itemPricing.findFirst({
      where: { companyId, itemId: parsedItemId, deletedAt: null },
    });

    if (!pricing) {
      return {
        id: '',
        itemId,
        cost: 0,
        sellingPrice: 0,
        suggestedPrice: 0,
        taxTreatment: null,
        updatedAt: null,
      };
    }

    return mapPricing(pricing);
  }

  async upsertPricing(user: AuthUser, itemId: string, dto: UpsertItemPricingDto): Promise<ItemPricingResponseDto> {
    const companyId = await this.authorize(user, PermissionAction.UPDATE);
    const parsedItemId = parsePositiveBigIntId(itemId);
    await this.findOrThrow(companyId, parsedItemId);

    const cost = dto.cost !== undefined ? dto.cost : 0;
    const sellingPrice = dto.sellingPrice !== undefined ? dto.sellingPrice : 0;
    const suggestedPrice = dto.suggestedPrice !== undefined ? dto.suggestedPrice : 0;
    const taxTreatment = dto.taxTreatment !== undefined ? dto.taxTreatment?.trim() || null : undefined;

    const pricing = await this.prisma.itemPricing.upsert({
      where: {
        itemId: parsedItemId,
      },
      update: {
        companyId,
        cost: dto.cost !== undefined ? cost : undefined,
        sellingPrice: dto.sellingPrice !== undefined ? sellingPrice : undefined,
        suggestedPrice: dto.suggestedPrice !== undefined ? suggestedPrice : undefined,
        taxTreatment,
        updatedByUserId: user.id,
        updatedAt: new Date(),
        deletedAt: null,
      },
      create: {
        companyId,
        itemId: parsedItemId,
        cost,
        sellingPrice,
        suggestedPrice,
        taxTreatment: taxTreatment ?? null,
        createdByUserId: user.id,
      },
    });

    return mapPricing(pricing);
  }

  private async findOrThrow(companyId: number, id: bigint) {
    const item = await this.prisma.itemBasicInfo.findFirst({ where: { id, companyId, deletedAt: null }, include });
    if (!item) throw new NotFoundException('Item not found.');
    return item;
  }

  private async validateCode(companyId: number, code: string, excludedId?: bigint) {
    if (!code.trim()) throw new BadRequestException('Item code is required.');
    const duplicate = await this.prisma.itemBasicInfo.findFirst({
      where: { companyId, id: excludedId ? { not: excludedId } : undefined, code: { equals: code.trim(), mode: 'insensitive' } },
    });
    if (duplicate) throw new ConflictException('An item with this code already exists.');
  }

  private async validateReferences(companyId: number, dto: UpdateItemBasicInfoDto, existing?: Item) {
    if (dto.categoryId !== undefined) {
      const id = parsePositiveBigIntId(dto.categoryId);
      const record = await this.prisma.itemCategory.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!record || (record.status !== 'ACTIVE' && existing?.categoryId !== id))
        throw new BadRequestException('Select an active category in the current company.');
    }
    if (dto.unitOfMeasurementId !== undefined) {
      const id = parsePositiveBigIntId(dto.unitOfMeasurementId);
      const record = await this.prisma.unitOfMeasurement.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!record || (record.status !== 'ACTIVE' && existing?.unitOfMeasurementId !== id))
        throw new BadRequestException('Select an active unit of measurement in the current company.');
    }
    if (dto.responsibilityCenterId != null) {
      const id = parsePositiveBigIntId(dto.responsibilityCenterId);
      const record = await this.prisma.responsibilityCenter.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!record || (record.status !== 'ACTIVE' && existing?.responsibilityCenterId !== id))
        throw new BadRequestException('Select an active responsibility center in the current company.');
    }
  }
}

function mapItem(item: Item): ItemBasicInfoResponseDto {
  return {
    id: item.id.toString(),
    code: item.code,
    skuCode: item.skuCode ?? '',
    name: item.name,
    barcode: item.barcode ?? '',
    categoryId: item.categoryId.toString(),
    categoryName: item.category.name,
    unitOfMeasurementId: item.unitOfMeasurementId.toString(),
    unitOfMeasurementSymbol: item.unitOfMeasurement.symbol,
    brand: item.brand ?? '',
    model: item.model ?? '',
    externalReferenceCode: item.externalReferenceCode ?? '',
    responsibilityCenterId: item.responsibilityCenterId?.toString() ?? null,
    responsibilityCenterName: item.responsibilityCenter?.name ?? '',
    description: item.description ?? '',
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    status: item.status as ItemBasicInfoStatus,
    costPrice: item.pricing ? Number(item.pricing.cost) : 0,
    sellingPrice: item.pricing ? Number(item.pricing.sellingPrice) : 0,
    suggestedPrice: item.pricing ? Number(item.pricing.suggestedPrice) : 0,
    taxTreatment: item.pricing?.taxTreatment ?? null,
  };
}

function mapPricing(pricing: Prisma.ItemPricingGetPayload<object>): ItemPricingResponseDto {
  return {
    id: pricing.id.toString(),
    itemId: pricing.itemId.toString(),
    cost: Number(pricing.cost),
    sellingPrice: Number(pricing.sellingPrice),
    suggestedPrice: Number(pricing.suggestedPrice),
    taxTreatment: pricing.taxTreatment ?? null,
    updatedAt: pricing.updatedAt ? pricing.updatedAt.toISOString() : null,
  };
}
