import {
  collectPermissionArchitectureMetrics,
  printPermissionArchitectureMetrics,
} from './permissionArchitectureMetrics';
import { prisma } from '../seeds/prismaClient';

async function main() {
  const metrics = await collectPermissionArchitectureMetrics(prisma);
  const failures = {
    missingPlatformVersion: !metrics.platformVersion,
    platformVersionNotApplied: metrics.platformVersionStatus !== 'APPLIED',
    emptyModuleCatalog: metrics.modules === 0,
    emptyPermissionCatalog: metrics.permissions === 0,
    emptyModuleSystemSidebarTemplates:
      metrics.moduleSystemSidebarTemplates === 0,
    orphanPermissions: metrics.orphanPermissions > 0,
    legacyCatalogTablesPresent: metrics.legacyCatalogTablesPresent,
  };

  printPermissionArchitectureMetrics(
    'Permission architecture verification:',
    metrics,
  );
  console.table(failures);

  if (Object.values(failures).some(Boolean)) {
    throw new Error('Module/sidebar architecture verification failed.');
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
