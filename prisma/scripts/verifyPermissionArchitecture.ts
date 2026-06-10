import { prisma } from '../seeds/prismaClient';

const ExpectedActiveCatalogEntries = 65;
const ExpectedActiveModules = 12;

type CountResult = {
  count: bigint;
};

async function count(query: Promise<CountResult[]>) {
  const [result] = await query;
  return Number(result.count);
}

async function main() {
  const [
    activeModules,
    activeSubmodules,
    activePermissions,
    inactiveSubmodules,
    inactivePermissions,
    invalidTargets,
    moduleMismatches,
    inactiveRoleAssignments,
    inactiveMembershipOverrides,
    missingRoleCancelMigrations,
    missingOverrideCancelMigrations,
    activePermissionsWithInactiveTargets,
    invalidActiveSubmodulePermissions,
    invalidAbbreviatedSubmoduleCodes,
    invalidAbbreviatedPermissionCodes,
    invalidModuleCodes,
    roleActionsWithoutView,
    overrideActionsWithoutView,
  ] = await Promise.all([
    prisma.platformModule.count({
      where: {
        isActive: true,
      },
    }),
    prisma.platformSubmodule.count({
      where: {
        isActive: true,
      },
    }),
    prisma.permission.count({
      where: {
        isActive: true,
      },
    }),
    prisma.platformSubmodule.count({
      where: {
        isActive: false,
      },
    }),
    prisma.permission.count({
      where: {
        isActive: false,
      },
    }),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "permissions"
        WHERE
          (
            "target_type" = 'MODULE'
            AND ("module_id" IS NULL OR "submodule_id" IS NOT NULL)
          )
          OR (
            "target_type" = 'SUBMODULE'
            AND ("module_id" IS NULL OR "submodule_id" IS NULL)
          )
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "permissions" AS "permission"
        JOIN "platform_submodules" AS "submodule"
          ON "submodule"."id" = "permission"."submodule_id"
        WHERE "permission"."module_id" <> "submodule"."module_id"
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "company_role_permissions" AS "assignment"
        JOIN "permissions" AS "permission"
          ON "permission"."id" = "assignment"."permission_id"
        WHERE "permission"."is_active" = false
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "membership_permissions" AS "override"
        JOIN "permissions" AS "permission"
          ON "permission"."id" = "override"."permission_id"
        WHERE "permission"."is_active" = false
      `,
    ),
    prisma.companyRolePermission.count({
      where: {
        canDelete: true,
        canCancel: false,
      },
    }),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "membership_permissions"
        WHERE
          "can_delete" IS NOT NULL
          AND "can_cancel" IS DISTINCT FROM "can_delete"
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "permissions" AS "permission"
        JOIN "platform_modules" AS "module"
          ON "module"."id" = "permission"."module_id"
        LEFT JOIN "platform_submodules" AS "submodule"
          ON "submodule"."id" = "permission"."submodule_id"
        WHERE
          "permission"."is_active" = true
          AND (
            "module"."is_active" = false
            OR (
              "permission"."target_type" = 'SUBMODULE'
              AND (
                "submodule"."id" IS NULL
                OR "submodule"."is_active" = false
              )
            )
          )
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM (
          SELECT "submodule"."id"
          FROM "platform_submodules" AS "submodule"
          LEFT JOIN "permissions" AS "permission"
            ON "permission"."submodule_id" = "submodule"."id"
            AND "permission"."is_active" = true
          WHERE "submodule"."is_active" = true
          GROUP BY "submodule"."id", "submodule"."code"
          HAVING
            COUNT("permission"."id") <> 1
            OR BOOL_OR("permission"."code" <> "submodule"."code")
        ) AS "invalid_submodules"
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "platform_submodules"
        WHERE "is_active" = true
          AND "code" !~ '^[A-Z][A-Z0-9]*$'
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "permissions"
        WHERE "is_active" = true
          AND "code" !~ '^[A-Z][A-Z0-9]*$'
      `,
    ),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "platform_modules"
        WHERE "is_active" = true
          AND "code" !~ '^[a-z]+(-[a-z]+)*$'
      `,
    ),
    prisma.companyRolePermission.count({
      where: {
        canView: false,
        OR: [
          { canCreate: true },
          { canUpdate: true },
          { canCancel: true },
          { canUncancel: true },
          { canExport: true },
        ],
      },
    }),
    count(
      prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) AS "count"
        FROM "membership_permissions"
        WHERE
          "can_view" IS DISTINCT FROM true
          AND (
            "can_create" = true
            OR "can_update" = true
            OR "can_cancel" = true
            OR "can_uncancel" = true
            OR "can_export" = true
          )
      `,
    ),
  ]);

  const [pcfr, pca, apv] = await Promise.all(
    ['PCFR', 'PCA', 'APV'].map((code) =>
      prisma.permission.findUnique({
        where: {
          code,
        },
        select: {
          code: true,
          isActive: true,
          submodule: {
            select: {
              code: true,
              module: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      }),
    ),
  );

  const checks = {
    activeModuleCount: activeModules === ExpectedActiveModules,
    activeSubmoduleCount: activeSubmodules === ExpectedActiveCatalogEntries,
    activePermissionCount: activePermissions === ExpectedActiveCatalogEntries,
    noRetiredSubmodules: inactiveSubmodules === 0,
    noRetiredPermissions: inactivePermissions === 0,
    validTargets: invalidTargets === 0,
    matchingModules: moduleMismatches === 0,
    noInactiveRoleAssignments: inactiveRoleAssignments === 0,
    noInactiveMembershipOverrides: inactiveMembershipOverrides === 0,
    roleDeleteMigratedToCancel: missingRoleCancelMigrations === 0,
    overrideDeleteMigratedToCancel: missingOverrideCancelMigrations === 0,
    activeCatalogPaths: activePermissionsWithInactiveTargets === 0,
    canonicalSubmodulePermissions: invalidActiveSubmodulePermissions === 0,
    abbreviatedSubmoduleCodes: invalidAbbreviatedSubmoduleCodes === 0,
    abbreviatedPermissionCodes: invalidAbbreviatedPermissionCodes === 0,
    descriptiveModuleCodes: invalidModuleCodes === 0,
    roleActionsImplyView: roleActionsWithoutView === 0,
    overrideActionsImplyView: overrideActionsWithoutView === 0,
    pcfr:
      pcfr?.isActive &&
      pcfr.submodule?.code === 'PCFR' &&
      pcfr.submodule.module.code === 'cash-disbursement',
    pca:
      pca?.isActive &&
      pca.submodule?.code === 'PCA' &&
      pca.submodule.module.code === 'cash-disbursement',
    apv:
      apv?.isActive &&
      apv.submodule?.code === 'APV' &&
      apv.submodule.module.code === 'accounts-payable',
  };

  const failed = Object.entries(checks).filter(([, passed]) => !passed);

  console.log({
    activeModules,
    activeSubmodules,
    activePermissions,
    expectedActiveModules: ExpectedActiveModules,
    expectedActiveCatalogEntries: ExpectedActiveCatalogEntries,
  });
  console.table(checks);

  if (failed.length > 0) {
    throw new Error(
      `Permission architecture verification failed: ${failed
        .map(([name]) => name)
        .join(', ')}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
