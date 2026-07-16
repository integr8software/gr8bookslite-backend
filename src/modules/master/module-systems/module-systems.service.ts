import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SidebarItemType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ModuleSystemSidebarItemDto,
  SaveModuleSystemModulesDto,
  SaveModuleSystemSidebarDto,
  UpdateModuleSystemStatusDto,
  UpsertModuleSystemDto,
} from './dto/module-system.dto';

const moduleSystemInclude = Prisma.validator<Prisma.ModuleSystemInclude>()({
  modules: {
    include: { module: true },
    orderBy: [{ sortOrder: 'asc' }, { module: { name: 'asc' } }],
  },
  sidebarItems: {
    include: { module: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
});

type ModuleSystemRecord = Prisma.ModuleSystemGetPayload<{
  include: typeof moduleSystemInclude;
}>;

@Injectable()
export class ModuleSystemsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSystems() {
    const systems = await this.prisma.moduleSystem.findMany({
      include: moduleSystemInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return { systems: systems.map((system) => this.mapSystem(system)) };
  }

  async listAvailableModules() {
    const modules = await this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon: true,
        isActive: true,
      },
    });

    return { modules };
  }

  async createSystem(dto: UpsertModuleSystemDto) {
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(code);

    const system = await this.prisma.moduleSystem.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: moduleSystemInclude,
    });

    return { message: 'System created.', system: this.mapSystem(system) };
  }

  async getSystem(systemId: number) {
    const system = await this.findSystem(systemId);
    return { system: this.mapSystem(system) };
  }

  async updateSystem(systemId: number, dto: UpsertModuleSystemDto) {
    const existing = await this.findSystem(systemId);
    const code = this.normalizeCode(dto.code);
    if (code !== existing.code) await this.assertUniqueCode(code);

    const system = await this.prisma.moduleSystem.update({
      where: { id: systemId },
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
      include: moduleSystemInclude,
    });

    return { message: 'System updated.', system: this.mapSystem(system) };
  }

  async updateStatus(systemId: number, dto: UpdateModuleSystemStatusDto) {
    await this.findSystem(systemId);
    const system = await this.prisma.moduleSystem.update({
      where: { id: systemId },
      data: { isActive: dto.isActive },
      include: moduleSystemInclude,
    });

    return { message: 'System status updated.', system: this.mapSystem(system) };
  }

  async saveModules(systemId: number, dto: SaveModuleSystemModulesDto) {
    await this.findSystem(systemId);
    const moduleCodes = this.normalizeCodes(dto.moduleCodes);
    const modules = await this.prisma.module.findMany({
      where: { code: { in: moduleCodes }, isActive: true },
      select: { id: true, code: true },
    });

    if (modules.length !== moduleCodes.length) {
      throw new BadRequestException('One or more module codes are invalid.');
    }

    const moduleIds = new Set(modules.map((module) => module.id));

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.moduleSystemModule.findMany({
        where: { systemId },
        select: { id: true, moduleId: true },
      });
      const existingByModuleId = new Map(existing.map((item) => [item.moduleId, item.id]));

      await tx.moduleSystemModule.deleteMany({
        where: {
          systemId,
          moduleId: { notIn: Array.from(moduleIds) },
        },
      });

      for (const [index, module] of modules.entries()) {
        const existingId = existingByModuleId.get(module.id);
        if (existingId) {
          await tx.moduleSystemModule.update({
            where: { id: existingId },
            data: { sortOrder: index, isActive: true },
          });
        } else {
          await tx.moduleSystemModule.create({
            data: {
              systemId,
              moduleId: module.id,
              sortOrder: index,
              isActive: true,
            },
          });
        }
      }

      await tx.moduleSystemSidebar.deleteMany({
        where: { systemId, moduleId: { notIn: Array.from(moduleIds) } },
      });
    });

    const system = await this.findSystem(systemId);
    return { message: 'System modules saved.', system: this.mapSystem(system) };
  }

  async getSidebar(systemId: number) {
    const system = await this.findSystem(systemId);
    return {
      sidebar: this.mapSidebar(system.sidebarItems),
      fallbackSidebar: this.buildFallbackSidebar(system),
    };
  }

  async saveSidebar(systemId: number, dto: SaveModuleSystemSidebarDto) {
    const system = await this.findSystem(systemId);
    const assignedModuleIds = new Set(system.modules.filter((item) => item.isActive).map((item) => item.moduleId));
    this.validateSidebarTree(dto.items, assignedModuleIds);

    await this.prisma.$transaction(async (tx) => {
      await tx.moduleSystemSidebar.deleteMany({ where: { systemId } });
      for (const [index, item] of dto.items.entries()) {
        await this.createSidebarItem(tx, systemId, null, item, index);
      }
    });

    const updatedSystem = await this.findSystem(systemId);
    return {
      message: 'System sidebar saved.',
      sidebar: this.mapSidebar(updatedSystem.sidebarItems),
    };
  }

  private async findSystem(systemId: number) {
    const system = await this.prisma.moduleSystem.findUnique({
      where: { id: systemId },
      include: moduleSystemInclude,
    });
    if (!system) throw new NotFoundException('System not found.');
    return system;
  }

  private async assertUniqueCode(code: string) {
    const existing = await this.prisma.moduleSystem.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A system with this code already exists.');
  }

  private validateSidebarTree(items: ModuleSystemSidebarItemDto[], assignedModuleIds: Set<number>) {
    const keys = new Set<string>();
    const linkedModuleIds = new Set<number>();
    const walk = (siblings: ModuleSystemSidebarItemDto[], depth: number) => {
      if (!siblings.length) return;
      if (depth > 3) throw new BadRequestException('Sidebar supports at most three levels.');
      for (const item of siblings) {
        const key = item.key.trim();
        if (!key || keys.has(key)) {
          throw new BadRequestException(`Duplicate or empty sidebar key: ${item.key}`);
        }
        keys.add(key);
        if (item.itemType === 'LINK') {
          if (!item.moduleId || !assignedModuleIds.has(item.moduleId)) {
            throw new BadRequestException('Sidebar links must use modules assigned to the system.');
          }
          if (linkedModuleIds.has(item.moduleId)) {
            throw new BadRequestException('A module can appear only once in the system sidebar.');
          }
          linkedModuleIds.add(item.moduleId);
        } else if (item.moduleId) {
          throw new BadRequestException('Only sidebar links can reference modules.');
        }
        walk(item.children ?? [], depth + 1);
      }
    };
    walk(items, 1);

    for (const moduleId of assignedModuleIds) {
      if (!linkedModuleIds.has(moduleId)) {
        throw new BadRequestException('Every assigned module must be included in the system sidebar.');
      }
    }
  }

  private async createSidebarItem(
    tx: Prisma.TransactionClient,
    systemId: number,
    parentId: number | null,
    item: ModuleSystemSidebarItemDto,
    sortOrder: number,
  ) {
    const created = await tx.moduleSystemSidebar.create({
      data: {
        systemId,
        parentId,
        moduleId: item.itemType === 'LINK' ? item.moduleId! : null,
        itemType: item.itemType,
        key: item.key.trim(),
        label: item.label.trim(),
        description: item.description?.trim() || null,
        iconName: item.iconName?.trim() || null,
        sortOrder,
        isVisible: item.isVisible ?? true,
      },
      select: { id: true },
    });

    for (const [childIndex, child] of (item.children ?? []).entries()) {
      await this.createSidebarItem(tx, systemId, created.id, child, childIndex);
    }
  }

  private mapSystem(system: ModuleSystemRecord) {
    const activeModules = system.modules.filter((item) => item.isActive);
    return {
      id: system.id,
      code: system.code,
      name: system.name,
      description: system.description ?? '',
      sortOrder: system.sortOrder,
      isActive: system.isActive,
      moduleCount: activeModules.length,
      modules: activeModules.map((item) => ({
        id: item.module.id,
        code: item.module.code,
        name: item.module.name,
        description: item.module.description ?? '',
        iconKey: item.module.icon,
        sortOrder: item.sortOrder,
        isActive: item.module.isActive && item.isActive,
      })),
      sidebar: this.mapSidebar(system.sidebarItems),
      createdAt: system.createdAt,
      updatedAt: system.updatedAt,
    };
  }

  private mapSidebar(items: ModuleSystemRecord['sidebarItems']) {
    const childrenByParentId = new Map<number | null, typeof items>();
    for (const item of items.filter((item) => item.isVisible)) {
      const siblings = childrenByParentId.get(item.parentId) ?? [];
      siblings.push(item);
      childrenByParentId.set(item.parentId, siblings);
    }

    const build = (parentId: number | null): unknown[] =>
      (childrenByParentId.get(parentId) ?? []).map((item) => ({
        id: item.id,
        key: item.key,
        label: item.label,
        description: item.description ?? '',
        itemType: item.itemType,
        moduleId: item.moduleId,
        moduleCode: item.module?.code ?? null,
        iconName: item.iconName,
        sortOrder: item.sortOrder,
        isVisible: item.isVisible,
        children: build(item.id),
      }));

    return build(null);
  }

  private buildFallbackSidebar(system: ModuleSystemRecord) {
    return system.modules
      .filter((item) => item.isActive && item.module.isActive)
      .map((item) => item.module)
      .sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code))
      .map((module, index) => ({
        id: null,
        key: `module-${module.code.toLowerCase()}`,
        label: module.name,
        description: module.description ?? '',
        itemType: 'LINK' as const,
        moduleId: module.id,
        moduleCode: module.code,
        iconName: module.icon,
        sortOrder: index,
        isVisible: true,
        children: [],
      }));
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }

  private normalizeCodes(codes: string[]) {
    return [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
  }
}
