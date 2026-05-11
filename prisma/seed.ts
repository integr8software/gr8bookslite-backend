import 'dotenv/config';
import { PrismaClient, SystemRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await seedSubscriptionPlans();

  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? 'Platform Super Admin';

  if (!email || !password) {
    throw new Error(
      'SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required to seed the superadmin account.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        passwordHash,
        systemRole: SystemRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
      },
    });

    console.log(`Updated superadmin account: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      systemRole: SystemRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
    },
  });

  console.log(`Created superadmin account: ${email}`);
}

async function seedSubscriptionPlans() {
  const plans = [
    {
      code: 'ACCOUNTING',
      name: 'Accounting',
      description: 'Accounting plan with a 15-day free trial.',
      monthlyPriceInCents: 39900,
      yearlyPriceInCents: 399000,
      monthlyCompareAtInCents: 49900,
      yearlyCompareAtInCents: 478800,
      trialDays: 15,
    },
    {
      code: 'ACCOUNTING_INVENTORY',
      name: 'Accounting & Inventory',
      description: 'Accounting and inventory plan with a 15-day free trial.',
      monthlyPriceInCents: 49900,
      yearlyPriceInCents: 499000,
      monthlyCompareAtInCents: 59900,
      yearlyCompareAtInCents: 598800,
      trialDays: 15,
    },
    {
      code: 'ADDITIONAL_COMPANY',
      name: 'Additional Company',
      description: 'Additional company add-on with a 15-day free trial.',
      monthlyPriceInCents: 10000,
      yearlyPriceInCents: 100000,
      monthlyCompareAtInCents: 12500,
      yearlyCompareAtInCents: 120000,
      trialDays: 15,
    },
  ] as const;

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: {
        code: plan.code,
      },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceInCents: plan.monthlyPriceInCents,
        yearlyPriceInCents: plan.yearlyPriceInCents,
        monthlyCompareAtInCents: plan.monthlyCompareAtInCents,
        yearlyCompareAtInCents: plan.yearlyCompareAtInCents,
        trialDays: plan.trialDays,
        isActive: true,
      },
      create: plan,
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed superadmin account.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
