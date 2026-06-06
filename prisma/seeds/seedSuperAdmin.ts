import { SystemRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { prisma } from './prismaClient';

export async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
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
