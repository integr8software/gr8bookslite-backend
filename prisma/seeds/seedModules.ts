import { ModuleCategory } from '@prisma/client';
import { prisma } from './prismaClient';
import { ModuleCatalog } from './moduleCatalog';

/**
 * The migration preserves every former submodule ID and establishes the canonical
 * leaf catalog. Reseeding then normalizes that catalog before any dependent rows.
 */
export async function seedModules() {
  for (const catalogModule of ModuleCatalog) {
    const module = await prisma.module.upsert({
      where: { code: catalogModule.code },
      update: {
        name: catalogModule.name,
        icon: catalogModule.icon ?? null,
        category: catalogModule.category ?? ModuleCategory.STANDARD,
        type: catalogModule.type ?? [],
        isActive: true,
      },
      create: {
        code: catalogModule.code,
        name: catalogModule.name,
        icon: catalogModule.icon ?? null,
        category: catalogModule.category ?? ModuleCategory.STANDARD,
        type: catalogModule.type ?? [],
        isActive: true,
      },
    });

    await prisma.permission.upsert({
      where: { code: catalogModule.code },
      update: {
        moduleId: module.id,
        name: catalogModule.name,
        scopeLevel: 'BRANCH',
        requiresCompanyContext: true,
        isActive: true,
      },
      create: {
        moduleId: module.id,
        code: catalogModule.code,
        name: catalogModule.name,
        scopeLevel: 'BRANCH',
        requiresCompanyContext: true,
        isActive: true,
      },
    });
  }
}
