import { createHash } from 'node:crypto';
import { collectPermissionArchitectureMetrics, printPermissionArchitectureMetrics } from '../scripts/permissionArchitectureMetrics';
import { prisma } from '../seeds/prismaClient';
import { seedModules } from '../seeds/seedModules';
import { seedModuleSystems } from '../seeds/seedModuleSystems';
import { seedPartyEntityTypes } from '../seeds/seedPartyEntityTypes';
import { seedSubscriptionPlans } from '../seeds/seedSubscriptionPlans';
import { seedTaxes } from '../seeds/seedTaxes';
import { seedTaxPostingRules } from '../../src/modules/tax/seed/tax.seed';

export type ProvisionResult = {
  checksum: string;
  stepCount: number;
  version: string;
};

export const PlatformProvisionVersion = '2026.07.29.0';

const ProvisionSteps = ['platform-catalog', 'module-systems', 'party-entity-types', 'subscription-plans', 'taxes', 'tax-posting-rules'] as const;

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
  const appliedBy = process.env.PLATFORM_PROVISION_APPLIED_BY || process.env.APP_ENV || 'manual';

  const before = await collectPermissionArchitectureMetrics(prisma);
  printPermissionArchitectureMetrics('Before platform provision:', before);

  console.log('Provisioning platform catalog.');
  await seedModules();

  console.log('Provisioning module systems and sidebar templates.');
  await seedModuleSystems();

  console.log('Provisioning party entity types.');
  await seedPartyEntityTypes();

  console.log('Provisioning subscription plan system links.');
  await seedSubscriptionPlans();

  console.log('Provisioning taxes.');
  await seedTaxes();

  console.log('Provisioning tax posting rules.');
  await seedTaxPostingRules(prisma);

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

  console.log(`Platform provision complete: version=${PlatformProvisionVersion} checksum=${checksum}`);

  return {
    checksum,
    stepCount: ProvisionSteps.length,
    version: PlatformProvisionVersion,
  };
}
