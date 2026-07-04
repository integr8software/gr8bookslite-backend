import {
  collectPermissionArchitectureMetrics,
  printPermissionArchitectureMetrics,
} from './permissionArchitectureMetrics';
import { runSeedTask } from './runSeedTask';
import { prisma } from '../seeds/prismaClient';
import { seedUserSidebars } from '../seeds/seedUserSidebars';

void runSeedTask('User sidebar materialization', async () => {
  const before = await collectPermissionArchitectureMetrics(prisma);
  printPermissionArchitectureMetrics(
    'Before user sidebar materialization:',
    before,
  );

  await seedUserSidebars();

  const after = await collectPermissionArchitectureMetrics(prisma);
  printPermissionArchitectureMetrics(
    'After user sidebar materialization:',
    after,
  );
});
