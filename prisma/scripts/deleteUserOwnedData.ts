import 'dotenv/config';

import { prisma } from '../seeds/prismaClient';

type DeleteUserOwnedDataOptions = {
  email: string;
};

function getOptionValue(flag: string) {
  const index = process.argv.findIndex((value) => value === flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function getDeleteUserOwnedDataOptions(): DeleteUserOwnedDataOptions {
  const email =
    getOptionValue('--email') ??
    process.env.DELETE_USER_EMAIL ??
    process.env.RESET_USER_EMAIL;

  if (!email) {
    throw new Error(
      'Provide the target email with --email <value> or set DELETE_USER_EMAIL in the environment.',
    );
  }

  return {
    email: email.trim().toLowerCase(),
  };
}

async function deleteSupabaseFiles(storagePaths: string[]) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();

  if (!supabaseUrl || !serviceRoleKey || !bucket || storagePaths.length === 0) {
    return;
  }

  for (const storagePath of storagePaths) {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      const failureText = await response.text();

      throw new Error(
        `Failed to delete Supabase object "${storagePath}": ${failureText}`,
      );
    }
  }
}

async function main() {
  const options = getDeleteUserOwnedDataOptions();

  const user = await prisma.user.findUnique({
    where: {
      email: options.email,
    },
    include: {
      onboardingDraft: true,
      memberships: {
        include: {
          company: {
            include: {
              memberships: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log(`No user found for ${options.email}.`);
    return;
  }

  const companiesWithOtherMembers = user.memberships
    .map((membership) => membership.company)
    .filter((company) =>
      company.memberships.some((membership) => membership.userId !== user.id),
    );

  if (companiesWithOtherMembers.length > 0) {
    throw new Error(
      `Aborted. User belongs to companies with other members: ${companiesWithOtherMembers
        .map((company) => `${company.name} (#${company.id})`)
        .join(', ')}.`,
    );
  }

  const companyIdsToDelete = user.memberships.map(
    (membership) => membership.companyId,
  );
  const storagePathsToDelete = [
    user.onboardingDraft?.logoStoragePath ?? null,
    ...user.memberships.map((membership) => membership.company.logoStoragePath),
  ].filter((value): value is string => Boolean(value));

  await deleteSupabaseFiles(storagePathsToDelete);

  await prisma.$transaction(async (tx) => {
    if (companyIdsToDelete.length > 0) {
      await tx.company.deleteMany({
        where: {
          id: {
            in: companyIdsToDelete,
          },
        },
      });
    }

    await tx.user.delete({
      where: {
        id: user.id,
      },
    });
  });

  console.log(
    `Deleted user-owned data for ${options.email}. Removed ${companyIdsToDelete.length} company record(s).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to delete user-owned data.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
