import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BillingCycle,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { assertLocalDatabase } from './assertLocalDatabase';
import { prisma } from '../seeds/prismaClient';

type OptionMap = Map<string, string | true>;

type RenewalTarget = {
  companyId: number;
  companyName: string;
  companySlug: string;
  subscriptionId: number;
  oldStatus: SubscriptionStatus;
  oldAutoRenew: boolean;
  oldCancelAtPeriodEnd: boolean;
  oldCurrentPeriodStartAt: Date | null;
  oldNextBillingAt: Date | null;
  oldEndsAt: Date | null;
  oldCanceledAt: Date | null;
  planCode: string;
  billingCycle: BillingCycle;
};

const DEFAULT_MONTHS = 1;

function parseOptions(): OptionMap {
  const options = new Map<string, string | true>();

  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];

    if (!value.startsWith('--')) {
      continue;
    }

    const next = process.argv[index + 1];
    if (!next || next.startsWith('--')) {
      options.set(value, true);
      continue;
    }

    options.set(value, next);
    index += 1;
  }

  return options;
}

function getStringOption(options: OptionMap, flag: string) {
  const value = options.get(flag);

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function getPositiveIntegerOption(
  options: OptionMap,
  flag: string,
  fallback: number,
) {
  const rawValue = getStringOption(options, flag);

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }

  return value;
}

function hasFlag(options: OptionMap, flag: string) {
  return options.get(flag) === true;
}

function buildCompanyWhere(
  options: OptionMap,
  now: Date,
): Prisma.CompanyWhereInput {
  if (hasFlag(options, '--expired')) {
    return {
      subscriptions: {
        some: {
          status: SubscriptionStatus.ACTIVE,
          endsAt: {
            lt: now,
          },
        },
      },
    };
  }

  const companyId = getStringOption(options, '--company-id');
  const companySlug = getStringOption(options, '--company-slug');
  const companyName = getStringOption(options, '--company-name');
  const userEmail = getStringOption(options, '--user-email');
  const selectors = [companyId, companySlug, companyName, userEmail].filter(
    Boolean,
  );

  if (selectors.length === 0) {
    throw new Error(
      'Provide one selector: --company-id, --company-slug, --company-name, --user-email, or --expired.',
    );
  }

  if (selectors.length > 1) {
    throw new Error('Use only one company selector per run.');
  }

  if (companyId) {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('--company-id must be a positive integer.');
    }

    return { id };
  }

  if (companySlug) {
    return { slug: companySlug };
  }

  if (companyName) {
    return { name: companyName };
  }

  if (userEmail) {
    return {
      memberships: {
        some: {
          user: {
            email: userEmail.toLowerCase(),
          },
        },
      },
    };
  }

  throw new Error('No usable company selector was provided.');
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

async function main() {
  assertLocalDatabase();

  const options = parseOptions();
  const apply = hasFlag(options, '--apply');
  const allowMultiple = hasFlag(options, '--all');
  const months = getPositiveIntegerOption(options, '--months', DEFAULT_MONTHS);
  const now = new Date();
  const periodEnd = addMonths(now, months);
  const where = buildCompanyWhere(options, now);

  const companies = await prisma.company.findMany({
    where,
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  if (companies.length === 0) {
    if (hasFlag(options, '--expired')) {
      console.log('No expired active company subscriptions were found.');
      return;
    }

    throw new Error('No company matched the provided selector.');
  }

  if (companies.length > 1 && !allowMultiple) {
    console.table(
      companies.map((company) => ({
        companyId: company.id,
        companyName: company.name,
        companySlug: company.slug,
      })),
    );
    throw new Error(
      `Matched ${companies.length} companies. Re-run with a more specific selector or add --all.`,
    );
  }

  const targets: RenewalTarget[] = companies.map((company) => {
    const subscription = company.subscriptions[0];

    if (!subscription) {
      throw new Error(
        `Company ${company.id} (${company.name}) does not have a subscription to renew.`,
      );
    }

    return {
      companyId: company.id,
      companyName: company.name,
      companySlug: company.slug,
      subscriptionId: subscription.id,
      oldStatus: subscription.status,
      oldAutoRenew: subscription.autoRenew,
      oldCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      oldCurrentPeriodStartAt: subscription.currentPeriodStartAt,
      oldNextBillingAt: subscription.nextBillingAt,
      oldEndsAt: subscription.endsAt,
      oldCanceledAt: subscription.canceledAt,
      planCode: subscription.plan.code,
      billingCycle: subscription.billingCycle,
    };
  });

  console.log(`Company subscription renewal (${apply ? 'apply' : 'dry-run'}).`);
  console.log(`New period: ${now.toISOString()} to ${periodEnd.toISOString()}`);
  console.table(
    targets.map((target) => ({
      companyId: target.companyId,
      companyName: target.companyName,
      companySlug: target.companySlug,
      subscriptionId: target.subscriptionId,
      planCode: target.planCode,
      status: target.oldStatus,
      billingCycle: target.billingCycle,
      autoRenew: target.oldAutoRenew,
      endsAt: target.oldEndsAt?.toISOString() ?? null,
      nextBillingAt: target.oldNextBillingAt?.toISOString() ?? null,
    })),
  );

  if (!apply) {
    console.log('');
    console.log('Dry run only. Re-run with --apply to renew.');
    return;
  }

  const backupPath = await writeBackup(targets, {
    renewedAt: now,
    periodEnd,
  });

  for (const target of targets) {
    await prisma.companySubscription.update({
      where: { id: target.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        currentPeriodStartAt: now,
        nextBillingAt: periodEnd,
        endsAt: periodEnd,
        trialEndsAt: null,
        canceledAt: null,
        failureCode: null,
        failureMessage: null,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        renewedSubscriptions: targets.length,
        periodEnd,
        backupPath,
      },
      null,
      2,
    ),
  );
}

async function writeBackup(
  targets: RenewalTarget[],
  renewal: { renewedAt: Date; periodEnd: Date },
) {
  const timestamp = renewal.renewedAt.toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const backupDirectory = path.resolve(process.cwd(), 'tmp', 'backups');
  const backupPath = path.join(
    backupDirectory,
    `company-subscription-renewal-${safeTimestamp}.json`,
  );

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        timestamp,
        periodEnd: renewal.periodEnd.toISOString(),
        targets: targets.map((target) => ({
          companyId: target.companyId,
          companyName: target.companyName,
          companySlug: target.companySlug,
          subscriptionId: target.subscriptionId,
          oldStatus: target.oldStatus,
          oldAutoRenew: target.oldAutoRenew,
          oldCancelAtPeriodEnd: target.oldCancelAtPeriodEnd,
          oldCurrentPeriodStartAt:
            target.oldCurrentPeriodStartAt?.toISOString() ?? null,
          oldNextBillingAt: target.oldNextBillingAt?.toISOString() ?? null,
          oldEndsAt: target.oldEndsAt?.toISOString() ?? null,
          oldCanceledAt: target.oldCanceledAt?.toISOString() ?? null,
          planCode: target.planCode,
          billingCycle: target.billingCycle,
        })),
      },
      null,
      2,
    ),
  );

  return backupPath;
}

main()
  .catch((error: unknown) => {
    console.error('Failed to renew company subscription.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
