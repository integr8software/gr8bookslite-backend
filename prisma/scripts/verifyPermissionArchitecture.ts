import { prisma } from '../seeds/prismaClient';

async function main() {
  const [modules, permissions, sidebarItems, sidebarLinks, orphanPermissions, orphanCompanyModules, companies, membershipsWithoutSidebar, legacyTables] = await Promise.all([
    prisma.module.count(),
    prisma.permission.count(),
    prisma.platformModuleSidebar.count(),
    prisma.platformModuleSidebar.count({ where: { itemType: 'LINK' } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM permissions p LEFT JOIN modules m ON m.id = p.module_id WHERE m.id IS NULL`,
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM company_modules cm LEFT JOIN modules m ON m.id = cm.module_id WHERE m.id IS NULL`,
    prisma.company.count(),
    prisma.membership.count({ where: { status: 'ACTIVE', user: { moduleSidebar: { none: {} } } } }),
    prisma.$queryRaw<Array<{ platform_modules: string | null; platform_submodules: string | null }>>`SELECT to_regclass('public.platform_modules')::text AS platform_modules, to_regclass('public.platform_submodules')::text AS platform_submodules`,
  ]);
  const failures = {
    emptyModuleCatalog: modules === 0,
    emptyPermissionCatalog: permissions === 0,
    orphanPermissions: Number(orphanPermissions[0]?.count ?? 0),
    orphanCompanyModules: Number(orphanCompanyModules[0]?.count ?? 0),
    membershipsWithoutSidebar,
    legacyCatalogTablesPresent: Boolean(legacyTables[0]?.platform_modules || legacyTables[0]?.platform_submodules),
  };
  console.table({ modules, permissions, sidebarItems, sidebarLinks, companies, ...failures });
  if (Object.values(failures).some(Boolean)) throw new Error('Module/sidebar architecture verification failed.');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
