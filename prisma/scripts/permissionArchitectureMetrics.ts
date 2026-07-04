import type { PrismaClient } from '@prisma/client';

export type PermissionArchitectureMetrics = {
  platformVersion: string | null;
  platformVersionStatus: string | null;
  modules: number;
  permissions: number;
  moduleSystemSidebarTemplates: number;
  sidebarItems: number;
  sidebarLinks: number;
  companies: number;
  activeMemberships: number;
  membershipsWithoutSidebar: number;
  orphanPermissions: number;
  legacyCatalogTablesPresent: boolean;
};

type PrismaLike = Pick<
  PrismaClient,
  | '$queryRaw'
  | 'company'
  | 'membership'
  | 'module'
  | 'moduleSystemSidebar'
  | 'permission'
  | 'platformVersion'
  | 'platformModuleSidebar'
>;

export async function collectPermissionArchitectureMetrics(
  prisma: PrismaLike,
): Promise<PermissionArchitectureMetrics> {
  const [
    modules,
    permissions,
    moduleSystemSidebarTemplates,
    sidebarItems,
    sidebarLinks,
    companies,
    activeMemberships,
    membershipsWithoutSidebar,
    orphanPermissions,
    legacyTables,
    platformVersion,
  ] = await Promise.all([
    prisma.module.count(),
    prisma.permission.count(),
    prisma.moduleSystemSidebar.count(),
    prisma.platformModuleSidebar.count(),
    prisma.platformModuleSidebar.count({ where: { itemType: 'LINK' } }),
    prisma.company.count(),
    prisma.membership.count({ where: { status: 'ACTIVE' } }),
    prisma.membership.count({
      where: {
        status: 'ACTIVE',
        user: { moduleSidebar: { none: {} } },
      },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count
      FROM permissions p
      LEFT JOIN modules m ON m.id = p.module_id
      WHERE m.id IS NULL
    `,
    prisma.$queryRaw<
      Array<{
        platform_modules: string | null;
        platform_submodules: string | null;
      }>
    >`
      SELECT
        to_regclass('public.platform_modules')::text AS platform_modules,
        to_regclass('public.platform_submodules')::text AS platform_submodules
    `,
    prisma.platformVersion.findUnique({
      where: { id: 1 },
      select: { currentVersion: true, status: true },
    }),
  ]);

  return {
    platformVersion: platformVersion?.currentVersion ?? null,
    platformVersionStatus: platformVersion?.status ?? null,
    modules,
    permissions,
    moduleSystemSidebarTemplates,
    sidebarItems,
    sidebarLinks,
    companies,
    activeMemberships,
    membershipsWithoutSidebar,
    orphanPermissions: Number(orphanPermissions[0]?.count ?? 0),
    legacyCatalogTablesPresent: Boolean(
      legacyTables[0]?.platform_modules || legacyTables[0]?.platform_submodules,
    ),
  };
}

export function printPermissionArchitectureMetrics(
  label: string,
  metrics: PermissionArchitectureMetrics,
) {
  console.log(label);
  console.table(metrics);
}
