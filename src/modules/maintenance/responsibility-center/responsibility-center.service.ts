import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  Prisma,
  ResponsibilityCenterCategory,
  ResponsibilityCenterFinancialType,
  ResponsibilityCenterStatus,
} from '@prisma/client';
import {
  DefaultLimit,
  DefaultPage,
} from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateResponsibilityCenterDto } from './dto/create-responsibility-center.dto';
import { GetResponsibilityCenterListQueryDto } from './dto/get-responsibility-center-list-query.dto';
import { UpdateResponsibilityCenterStatusDto } from './dto/update-responsibility-center-status.dto';
import { UpdateResponsibilityCenterDto } from './dto/update-responsibility-center.dto';
import { mapResponsibilityCenter } from './mappers/responsibility-center.mapper';
import { ResponsibilityCenterInclude } from './prisma/responsibility-center.include';
import type { ResponsibilityCenterWithRelations } from './types/responsibility-center-with-relations.type';
import {
  getClassificationDefaultByFinancialType,
  getFinancialTypeByClassificationCode,
  ResponsibilityCenterTypeNameByCategory,
} from './utils/responsibility-center-defaults.util';

const ResponsibilityCenterPermissionModuleCode = 'RC';

@Injectable()
export class ResponsibilityCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async findClassifications(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const classifications =
      await this.prisma.responsibilityCenterClassification.findMany({
        where: { status: ResponsibilityCenterStatus.ACTIVE },
        orderBy: { id: 'asc' },
      });

    return {
      classifications: classifications.map((classification) => ({
        id: classification.id.toString(),
        code: classification.code,
        name: classification.name,
        trackingBehavior: classification.trackingBehavior,
        isSystem: classification.isSystem,
        status: classification.status,
      })),
    };
  }

  async findTypes(user: AuthUser, classificationId?: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const parsedClassificationId = classificationId
      ? parsePositiveBigIntId(classificationId, 'classificationId')
      : undefined;
    const types = await this.prisma.responsibilityCenterType.findMany({
      where: {
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(parsedClassificationId
          ? { classificationId: parsedClassificationId }
          : {}),
        classification: { status: ResponsibilityCenterStatus.ACTIVE },
      },
      include: { classification: true },
      orderBy: [
        { classificationId: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return {
      types: types.map((type) => this.mapResponsibilityCenterType(type)),
    };
  }

  async suggestCode(user: AuthUser, typeId: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    const type = await this.findActiveTypeOrThrow(
      parsePositiveBigIntId(typeId, 'typeId'),
    );

    const code = await this.prisma.$transaction((tx) =>
      this.generateNextCode(tx, companyId, type),
    );

    return { code };
  }

  async findAll(user: AuthUser, query: GetResponsibilityCenterListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [centers, total, statistics] = await Promise.all([
      this.prisma.responsibilityCenter.findMany({
        where,
        include: ResponsibilityCenterInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.responsibilityCenter.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      centers: await this.mapCentersWithAuditUsers(centers),
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

  async findTree(user: AuthUser, query: GetResponsibilityCenterListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const centers = await this.prisma.responsibilityCenter.findMany({
      where: this.buildListWhere(companyId, query),
      include: ResponsibilityCenterInclude,
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
    });
    const mappedCenters = await this.mapCentersWithAuditUsers(centers);

    return {
      centers: this.buildTree(mappedCenters),
      statistics: await this.getStatistics(companyId),
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const center = await this.findCenterOrThrow(
      companyId,
      parsePositiveBigIntId(id),
    );

    return {
      center: (await this.mapCentersWithAuditUsers([center]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateResponsibilityCenterDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.ensureRequiredText(dto.name, 'Name');
    await this.ensureNameAvailable(companyId, dto.name);
    const type = await this.resolveTypeForWrite(companyId, dto, true);
    const parentId = dto.parentId
      ? await this.resolveParentId(companyId, dto.parentId)
      : null;

    try {
      const center = await this.prisma.$transaction(async (tx) => {
        const code = dto.code?.trim()
          ? dto.code.trim().toUpperCase()
          : await this.generateNextCode(tx, companyId, type);

        await this.ensureCodeAvailable(companyId, code, undefined, tx);

        return tx.responsibilityCenter.create({
          data: {
            companyId,
            typeId: type.id,
            code,
            name: dto.name.trim(),
            category: this.categoryFromTypeName(type.name),
            financialType: this.financialTypeFromClassificationCode(
              type.classification.code,
            ),
            manager: dto.manager?.trim() || null,
            parentId,
            status: dto.status ?? ResponsibilityCenterStatus.ACTIVE,
            description: dto.description?.trim() || '',
            createdByUserId: user.id,
          },
          include: ResponsibilityCenterInclude,
        });
      });

      return {
        message: 'Responsibility center created successfully.',
        center: (await this.mapCentersWithAuditUsers([center]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateResponsibilityCenterDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);

    const centerId = parsePositiveBigIntId(id);
    const existingCenter = await this.findCenterOrThrow(companyId, centerId);
    const type =
      dto.typeId || dto.category || dto.financialType || dto.classificationId
        ? await this.resolveTypeForWrite(companyId, dto, true)
        : existingCenter.type;

    if (dto.code !== undefined) {
      this.ensureRequiredText(dto.code, 'Code');
      await this.ensureCodeAvailable(companyId, dto.code, centerId);
    }

    if (dto.name !== undefined) {
      this.ensureRequiredText(dto.name, 'Name');
      await this.ensureNameAvailable(companyId, dto.name, centerId);
    }

    const parentId =
      dto.parentId === undefined
        ? undefined
        : dto.parentId
          ? await this.resolveParentId(companyId, dto.parentId)
          : null;

    if (parentId !== undefined) {
      if (parentId === centerId) {
        throw new BadRequestException(
          'A responsibility center cannot be its own parent.',
        );
      }

      await this.ensureNoHierarchyCycle(companyId, centerId, parentId);
    }

    try {
      const center = await this.prisma.responsibilityCenter.update({
        where: { id: centerId },
        data: {
          ...(dto.code !== undefined
            ? { code: dto.code.trim().toUpperCase() }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(type.id !== existingCenter.typeId
            ? {
                typeId: type.id,
                category: this.categoryFromTypeName(type.name),
                financialType: this.financialTypeFromClassificationCode(
                  type.classification.code,
                ),
              }
            : {}),
          ...(dto.manager !== undefined
            ? { manager: dto.manager.trim() || null }
            : {}),
          ...(parentId !== undefined ? { parentId } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || '' }
            : {}),
          updatedByUserId: user.id,
        },
        include: ResponsibilityCenterInclude,
      });

      return {
        message: 'Responsibility center updated successfully.',
        center: (await this.mapCentersWithAuditUsers([center]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    dto: UpdateResponsibilityCenterStatusDto,
  ) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);

    const centerId = parsePositiveBigIntId(id);
    const existingCenter = await this.findCenterOrThrow(companyId, centerId);

    const center = await this.prisma.$transaction(async (tx) => {
      const descendantIds = await this.collectDescendantIds(
        tx,
        companyId,
        centerId,
      );
      const ancestorIds =
        dto.status === ResponsibilityCenterStatus.ACTIVE
          ? await this.collectAncestorIds(tx, companyId, existingCenter.parentId)
          : [];
      const idsToUpdate = [...ancestorIds, ...descendantIds];

      await tx.responsibilityCenter.updateMany({
        where: {
          id: { in: idsToUpdate },
          companyId,
          deletedAt: null,
        },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
      });

      return tx.responsibilityCenter.findFirstOrThrow({
        where: { id: centerId, companyId, deletedAt: null },
        include: ResponsibilityCenterInclude,
      });
    });

    return {
      message: 'Responsibility center status updated successfully.',
      center: (await this.mapCentersWithAuditUsers([center]))[0],
    };
  }

  private buildListWhere(
    companyId: number,
    query: GetResponsibilityCenterListQueryDto,
  ): Prisma.ResponsibilityCenterWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.financialType ? { financialType: query.financialType } : {}),
      ...(query.typeId
        ? { typeId: parsePositiveBigIntId(query.typeId, 'typeId') }
        : {}),
      ...(query.classificationId
        ? {
            type: {
              classificationId: parsePositiveBigIntId(
                query.classificationId,
                'classificationId',
              ),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { manager: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { parent: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(
    query: GetResponsibilityCenterListQueryDto,
  ): Prisma.ResponsibilityCenterOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'code';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.responsibilityCenter
      .groupBy({
        by: ['status', 'category'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      })
      .then((groups) => {
        const statistics = {
          totalCenters: 0,
          activeCenters: 0,
          inactiveCenters: 0,
          departmentCenters: 0,
          branchCenters: 0,
          projectCenters: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalCenters += count;
          if (group.status === ResponsibilityCenterStatus.ACTIVE)
            statistics.activeCenters += count;
          if (group.status === ResponsibilityCenterStatus.INACTIVE)
            statistics.inactiveCenters += count;
          if (group.category === 'DEPARTMENT')
            statistics.departmentCenters += count;
          if (group.category === 'BRANCH') statistics.branchCenters += count;
          if (group.category === 'PROJECT') statistics.projectCenters += count;
        }

        return statistics;
      });
  }

  private async mapCentersWithAuditUsers(
    centers: ResponsibilityCenterWithRelations[],
  ) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      centers.flatMap((center) => [
        center.createdByUserId,
        center.updatedByUserId,
      ]),
    );

    return centers.map((center) => mapResponsibilityCenter(center, userNames));
  }

  private buildTree<TCenter extends { id: string; parentId: string | null }>(
    centers: TCenter[],
  ) {
    const nodeById = new Map<string, TCenter & { children: TCenter[] }>();

    centers.forEach((center) => {
      nodeById.set(center.id, { ...center, children: [] });
    });

    const roots: Array<TCenter & { children: TCenter[] }> = [];

    nodeById.forEach((node) => {
      const parent = node.parentId ? nodeById.get(node.parentId) : undefined;

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private async findCenterOrThrow(companyId: number, centerId: bigint) {
    const center = await this.prisma.responsibilityCenter.findFirst({
      where: { id: centerId, companyId, deletedAt: null },
      include: ResponsibilityCenterInclude,
    });

    if (!center) {
      throw new NotFoundException('Responsibility center not found.');
    }

    return center;
  }

  private async resolveParentId(companyId: number, parentId: string) {
    const parsedParentId = parsePositiveBigIntId(parentId, 'parentId');
    const parent = await this.findCenterOrThrow(companyId, parsedParentId);

    if (parent.status !== ResponsibilityCenterStatus.ACTIVE) {
      throw new BadRequestException(
        'Parent responsibility center is inactive.',
      );
    }

    return parsedParentId;
  }

  private async ensureNoHierarchyCycle(
    companyId: number,
    centerId: bigint,
    parentId: bigint | null,
  ) {
    let nextParentId = parentId;
    const visitedIds = new Set<string>();

    while (nextParentId) {
      if (
        nextParentId === centerId ||
        visitedIds.has(nextParentId.toString())
      ) {
        throw new BadRequestException(
          'Parent center creates a circular hierarchy.',
        );
      }

      visitedIds.add(nextParentId.toString());
      const parent = await this.prisma.responsibilityCenter.findFirst({
        where: { id: nextParentId, companyId, deletedAt: null },
        select: { parentId: true },
      });

      nextParentId = parent?.parentId ?? null;
    }
  }

  private async ensureCodeAvailable(
    companyId: number,
    code: string,
    excludedCenterId?: bigint,
    client:
      | Pick<PrismaService, 'responsibilityCenter'>
      | Prisma.TransactionClient = this.prisma,
  ) {
    const normalizedCode = code.trim().toUpperCase();
    const existingCenter = await client.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedCenterId ? { not: excludedCenterId } : undefined,
        code: { equals: normalizedCode, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingCenter) {
      throw new ConflictException(
        'A responsibility center with this code already exists.',
      );
    }
  }

  private async ensureNameAvailable(
    companyId: number,
    name: string,
    excludedCenterId?: bigint,
  ) {
    const normalizedName = name.trim();
    const existingCenter = await this.prisma.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedCenterId ? { not: excludedCenterId } : undefined,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingCenter) {
      throw new ConflictException(
        'A responsibility center with this name already exists.',
      );
    }
  }

  private ensureRequiredText(value: string, label: string) {
    if (!value.trim()) {
      throw new BadRequestException(`${label} is required.`);
    }
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

  private ensureCan(
    user: AuthUser,
    companyId: number,
    action: PermissionAction,
  ) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (
      user.companyId === companyId &&
      user.permissions.includes(
        `${ResponsibilityCenterPermissionModuleCode}:${action}`,
      )
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage responsibility centers.',
    );
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.permissions.includes(
        `${ResponsibilityCenterPermissionModuleCode}:${action}`,
      )
    );
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN ||
        user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A responsibility center with this code or name already exists.',
      );
    }
  }

  private async resolveTypeForWrite(
    companyId: number,
    dto: Pick<
      CreateResponsibilityCenterDto,
      'typeId' | 'classificationId' | 'category' | 'financialType'
    >,
    requireActive: boolean,
  ) {
    if (dto.typeId) {
      const type = await this.findTypeOrThrow(
        parsePositiveBigIntId(dto.typeId, 'typeId'),
        requireActive,
      );
      this.ensureTypeMatchesClassification(type, dto.classificationId);
      return type;
    }

    if (!dto.category || !dto.financialType) {
      throw new BadRequestException('Classification and type are required.');
    }

    const classificationDefault = getClassificationDefaultByFinancialType(
      dto.financialType,
    );

    if (!classificationDefault) {
      throw new BadRequestException(
        'Invalid responsibility center classification.',
      );
    }

    const typeName = ResponsibilityCenterTypeNameByCategory[dto.category];
    const type = await this.prisma.responsibilityCenterType.findFirst({
      where: {
        name: typeName,
        ...(requireActive ? { status: ResponsibilityCenterStatus.ACTIVE } : {}),
        classification: {
          code: classificationDefault.code,
          ...(requireActive
            ? { status: ResponsibilityCenterStatus.ACTIVE }
            : {}),
        },
      },
      include: { classification: true },
    });

    if (!type) {
      throw new BadRequestException(
        'Selected responsibility center type is not available.',
      );
    }

    return type;
  }

  private async findActiveTypeOrThrow(typeId: bigint) {
    return this.findTypeOrThrow(typeId, true);
  }

  private async findTypeOrThrow(
    typeId: bigint,
    requireActive: boolean,
  ) {
    const type = await this.prisma.responsibilityCenterType.findFirst({
      where: {
        id: typeId,
        ...(requireActive ? { status: ResponsibilityCenterStatus.ACTIVE } : {}),
        classification: {
          ...(requireActive
            ? { status: ResponsibilityCenterStatus.ACTIVE }
            : {}),
        },
      },
      include: { classification: true },
    });

    if (!type) {
      throw new BadRequestException(
        'Selected responsibility center type is not available.',
      );
    }

    return type;
  }

  private ensureTypeMatchesClassification(
    type: { classificationId: bigint },
    classificationId?: string,
  ) {
    if (!classificationId) return;

    const parsedClassificationId = parsePositiveBigIntId(
      classificationId,
      'classificationId',
    );

    if (type.classificationId !== parsedClassificationId) {
      throw new BadRequestException(
        'Selected type does not belong to the selected classification.',
      );
    }
  }

  private financialTypeFromClassificationCode(code: string) {
    const matched = getFinancialTypeByClassificationCode(code);

    if (!matched) {
      throw new BadRequestException(
        'Selected responsibility center classification is invalid.',
      );
    }

    return matched;
  }

  private categoryFromTypeName(name: string) {
    const matched = Object.entries(ResponsibilityCenterTypeNameByCategory).find(
      ([, typeName]) => typeName === name,
    );

    if (!matched) {
      throw new BadRequestException(
        'Custom responsibility center types are not supported until type maintenance is enabled.',
      );
    }

    return matched[0] as ResponsibilityCenterCategory;
  }

  private async generateNextCode(
    tx: Prisma.TransactionClient,
    companyId: number,
    type: {
      codePrefix: string;
      classification: { code: string };
    },
  ) {
    await tx.$queryRaw`
      SELECT true AS locked
      FROM pg_advisory_xact_lock(${BigInt(companyId)})
    `;

    const prefix = `${type.classification.code}-${type.codePrefix}`;
    const escapedPrefix = escapeRegExp(prefix);
    const centers = await tx.responsibilityCenter.findMany({
      where: {
        companyId,
        deletedAt: null,
        code: { startsWith: `${prefix}-` },
      },
      select: { code: true },
    });
    let latestSequence = 0;
    const sequencePattern = new RegExp(`^${escapedPrefix}-(\\d+)$`);

    for (const center of centers) {
      const [, sequence] = center.code.match(sequencePattern) ?? [];
      if (!sequence) continue;
      latestSequence = Math.max(latestSequence, Number(sequence));
    }

    return `${prefix}-${String(latestSequence + 1).padStart(3, '0')}`;
  }

  private async collectDescendantIds(
    tx: Prisma.TransactionClient,
    companyId: number,
    rootId: bigint,
  ) {
    const ids = [rootId];
    const queue = [rootId];

    while (queue.length) {
      const currentId = queue.shift()!;
      const children = await tx.responsibilityCenter.findMany({
        where: {
          companyId,
          parentId: currentId,
          deletedAt: null,
        },
        select: { id: true },
      });

      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }

  private async collectAncestorIds(
    tx: Prisma.TransactionClient,
    companyId: number,
    parentId: bigint | null,
  ) {
    const ids: bigint[] = [];
    let currentParentId = parentId;

    while (currentParentId) {
      const parent = await tx.responsibilityCenter.findFirst({
        where: {
          id: currentParentId,
          companyId,
          deletedAt: null,
        },
        select: { id: true, parentId: true },
      });

      if (!parent) {
        throw new BadRequestException(
          'Cannot activate a responsibility center because its parent no longer exists.',
        );
      }

      ids.unshift(parent.id);
      currentParentId = parent.parentId;
    }

    return ids;
  }

  private mapResponsibilityCenterType(
    type: Prisma.ResponsibilityCenterTypeGetPayload<{
      include: { classification: true };
    }>,
  ) {
    return {
      id: type.id.toString(),
      classificationId: type.classificationId.toString(),
      classificationCode: type.classification.code,
      classificationName: type.classification.name,
      name: type.name,
      codePrefix: type.codePrefix,
      description: type.description,
      sortOrder: type.sortOrder,
      isRequired: type.isRequired,
      status: type.status,
    };
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
