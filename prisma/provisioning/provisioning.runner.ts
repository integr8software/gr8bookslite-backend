import { createHash } from 'node:crypto';
import {
  collectPermissionArchitectureMetrics,
  printPermissionArchitectureMetrics,
} from '../scripts/permissionArchitectureMetrics';
import { prisma } from '../seeds/prismaClient';
import { seedModules } from '../seeds/seedModules';
import { seedModuleSystems } from '../seeds/seedModuleSystems';
import { seedSubscriptionPlans } from '../seeds/seedSubscriptionPlans';

export type ProvisionResult = {
  checksum: string;
  stepCount: number;
  version: string;
};

export const PlatformProvisionVersion = '2026.07.08.0';

const ProvisionSteps = [
  'platform-catalog',
  'module-systems',
  'subscription-plans',
] as const;

export function buildProvisionChecksum() {
  return createHash('sha256')
    .update(
      JSON.stringify({
        steps: ProvisionSteps,
        version: PlatformProvisionVersion,
      }),
    )
    .digest('hex');
}

export async function runPlatformProvision(): Promise<ProvisionResult> {
  const checksum = buildProvisionChecksum();
  const appliedBy =
    process.env.PLATFORM_PROVISION_APPLIED_BY ||
    process.env.APP_ENV ||
    'manual';

  const before = await collectPermissionArchitectureMetrics(prisma);
  printPermissionArchitectureMetrics('Before platform provision:', before);

  console.log('Provisioning platform catalog.');
  await seedModules();

  console.log('Provisioning module systems and sidebar templates.');
  await seedModuleSystems();

  console.log('Provisioning subscription plan system links.');
  await seedSubscriptionPlans();

  await prisma.platformVersion.upsert({
    where: { id: 1 },
    update: {
      appliedAt: new Date(),
      appliedBy,
      checksum,
      currentVersion: PlatformProvisionVersion,
      status: 'APPLIED',
    },
    create: {
      id: 1,
      appliedBy,
      checksum,
      currentVersion: PlatformProvisionVersion,
      status: 'APPLIED',
    },
  });

  const after = await collectPermissionArchitectureMetrics(prisma);
  printPermissionArchitectureMetrics('After platform provision:', after);

  console.log(
    `Platform provision complete: version=${PlatformProvisionVersion} checksum=${checksum}`,
  );

  return {
    checksum,
    stepCount: ProvisionSteps.length,
    version: PlatformProvisionVersion,
  };
}
