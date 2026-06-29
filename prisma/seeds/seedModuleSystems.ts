import { prisma } from './prismaClient';
import {
  collectModuleCodes,
  ModuleSystemCatalog,
  type ModuleSystemSidebarSeedItem,
} from './moduleSystemCatalog';

export async function seedModuleSystems() {
  const systemCodes = ModuleSystemCatalog.map((system) => system.code);

  await prisma.moduleSystem.updateMany({
    where: {
      code: { notIn: [...systemCodes] },
    },
    data: { isActive: false },
  });

  for (const system of ModuleSystemCatalog) {
    const moduleSystem = await prisma.moduleSystem.upsert({
      where: { code: system.code },
      update: {
        name: system.name,
        description: system.description,
        sortOrder: system.sortOrder,
        isActive: true,
      },
      create: {
        code: system.code,
        name: system.name,
        description: system.description,
        sortOrder: system.sortOrder,
        isActive: true,
      },
    });

    const moduleCodes = system.moduleCodes ?? collectModuleCodes(system.sidebar);
    const modules = await prisma.module.findMany({
      where: { code: { in: moduleCodes } },
      select: { id: true, code: true, name: true, description: true },
    });
    const moduleIdByCode = new Map(
      modules.map((module) => [module.code, module.id]),
    );
    const moduleByCode = new Map(modules.map((module) => [module.code, module]));
    const selectedModuleIds = new Set(modules.map((module) => module.id));

    await prisma.moduleSystemModule.deleteMany({
      where: {
        systemId: moduleSystem.id,
        moduleId: { notIn: Array.from(selectedModuleIds) },
      },
    });

    for (const [index, moduleCode] of moduleCodes.entries()) {
      const moduleId = moduleIdByCode.get(moduleCode);
      if (!moduleId) continue;

      await prisma.moduleSystemModule.upsert({
        where: {
          systemId_moduleId: {
            systemId: moduleSystem.id,
            moduleId,
          },
        },
        update: {
          sortOrder: index,
          isActive: true,
        },
        create: {
          systemId: moduleSystem.id,
          moduleId,
          sortOrder: index,
          isActive: true,
        },
      });
    }

    await prisma.moduleSystemSidebar.deleteMany({
      where: { systemId: moduleSystem.id },
    });

    for (const [index, item] of system.sidebar.entries()) {
      await createSidebarItem({
        systemId: moduleSystem.id,
        parentId: null,
        item,
        sortOrder: index,
        moduleIdByCode,
        moduleByCode,
      });
    }
  }
}

async function createSidebarItem({
  systemId,
  parentId,
  item,
  sortOrder,
  moduleIdByCode,
  moduleByCode,
}: {
  systemId: number;
  parentId: number | null;
  item: ModuleSystemSidebarSeedItem;
  sortOrder: number;
  moduleIdByCode: Map<string, number>;
  moduleByCode: Map<
    string,
    { id: number; code: string; name: string; description: string | null }
  >;
}) {
  const moduleId =
    item.itemType === 'LINK' ? moduleIdByCode.get(item.code) : null;
  const module = item.itemType === 'LINK' ? moduleByCode.get(item.code) : null;

  if (item.itemType === 'LINK' && !moduleId) return;

  const created = await prisma.moduleSystemSidebar.create({
    data: {
      systemId,
      parentId,
      moduleId,
      itemType: item.itemType,
      key: item.key,
      label: item.itemType === 'LINK' ? item.label ?? module!.name : item.label,
      description: item.itemType === 'LINK' ? module!.description : null,
      iconName: item.iconName,
      sortOrder,
      isVisible: true,
    },
    select: { id: true },
  });

  if (item.itemType === 'LINK') return;

  for (const [childIndex, child] of item.children.entries()) {
    await createSidebarItem({
      systemId,
      parentId: created.id,
      item: child,
      sortOrder: childIndex,
      moduleIdByCode,
      moduleByCode,
    });
  }
}
