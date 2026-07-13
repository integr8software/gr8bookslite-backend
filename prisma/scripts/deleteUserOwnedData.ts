import { assertLocalDatabase } from './assertLocalDatabase';
import { prisma } from '../seeds/prismaClient';

type DeleteUserOwnedDataOptions = {
  deleteStorageFiles: boolean;
  email: string;
};

const TransactionTimeoutMs = 120_000;

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
    deleteStorageFiles:
      process.argv.includes('--delete-storage') ||
      process.env.DELETE_USER_STORAGE_FILES === 'true',
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
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${encodeStoragePath(storagePath)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );

    if (response.ok || response.status === 404) {
      continue;
    }

    const failureText = await response.text();

    if (isSupabaseObjectNotFound(failureText)) {
      continue;
    }

    throw new Error(
      `Failed to delete Supabase object "${storagePath}": ${failureText}`,
    );
  }
}

function encodeStoragePath(storagePath: string) {
  return storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function isSupabaseObjectNotFound(failureText: string) {
  try {
    const payload = JSON.parse(failureText) as {
      statusCode?: string | number;
      error?: string;
      message?: string;
    };

    return (
      String(payload.statusCode) === '404' ||
      payload.error === 'not_found' ||
      payload.message === 'Object not found'
    );
  } catch {
    return false;
  }
}

type DeletePlan = {
  companyIdsToDelete: number[];
  relatedUserIdsToDelete: number[];
  skippedRelatedUsers: Array<{
    email: string;
    id: number;
    reason: string;
  }>;
  targetUserId: number;
};

async function deleteCompanyOwnedData(plan: DeletePlan) {
  const allUserIdsToDelete = [
    plan.targetUserId,
    ...plan.relatedUserIdsToDelete,
  ];

  await prisma.$transaction(
    async (tx) => {
      if (plan.companyIdsToDelete.length > 0) {
        await tx.defaultAccount.deleteMany({
          where: { companyId: { in: plan.companyIdsToDelete } },
        });
        await tx.bankAccount.deleteMany({
          where: { companyId: { in: plan.companyIdsToDelete } },
        });
        await tx.discount.deleteMany({
          where: { companyId: { in: plan.companyIdsToDelete } },
        });
        await tx.chartAccount.deleteMany({
          where: { companyId: { in: plan.companyIdsToDelete } },
        });
        await tx.company.deleteMany({
          where: {
            id: {
              in: plan.companyIdsToDelete,
            },
          },
        });
      }

      await tx.user.deleteMany({
        where: {
          id: {
            in: allUserIdsToDelete,
          },
        },
      });
    },
    {
      timeout: TransactionTimeoutMs,
    },
  );
}

async function deleteStorageFiles(storagePathsToDelete: string[]) {
  try {
    await deleteSupabaseFiles(storagePathsToDelete);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Database records were deleted, but storage cleanup failed: ${error.message}`,
      );
    }

    throw error;
  }
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return [...new Set(values.filter((value): value is number => value != null))];
}

async function main() {
  assertLocalDatabase();

  const options = getDeleteUserOwnedDataOptions();

  const user = await prisma.user.findUnique({
    where: {
      email: options.email,
    },
    include: {
      onboardingDraft: true,
      createdCompanies: {
        select: {
          id: true,
          logoStoragePath: true,
          name: true,
        },
      },
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

  const companyIdsToDelete = uniqueNumbers(
    [
      user.onboardingDraft?.provisionedCompanyId,
      ...user.createdCompanies.map((company) => company.id),
      ...user.memberships.map((membership) => membership.companyId),
    ],
  );

  const companyMemberUserIds =
    companyIdsToDelete.length === 0
      ? []
      : await prisma.membership.findMany({
          where: {
            companyId: {
              in: companyIdsToDelete,
            },
            userId: {
              not: user.id,
            },
          },
          distinct: ['userId'],
          select: {
            userId: true,
          },
        });

  const relatedUsers =
    companyMemberUserIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: {
            id: {
              in: companyMemberUserIds.map((membership) => membership.userId),
            },
          },
          include: {
            onboardingDraft: true,
            memberships: {
              select: {
                companyId: true,
              },
            },
          },
        });

  const relatedUserIdsToDelete: number[] = [];
  const skippedRelatedUsers: DeletePlan['skippedRelatedUsers'] = [];

  for (const relatedUser of relatedUsers) {
    const belongsOnlyToDeletedCompanies = relatedUser.memberships.every(
      (membership) => companyIdsToDelete.includes(membership.companyId),
    );

    if (!belongsOnlyToDeletedCompanies) {
      skippedRelatedUsers.push({
        email: relatedUser.email,
        id: relatedUser.id,
        reason: 'has memberships outside the deleted companies',
      });
      continue;
    }

    relatedUserIdsToDelete.push(relatedUser.id);
  }

  const storagePathsToDelete = [
    user.avatarStoragePath ?? null,
    user.onboardingDraft?.logoStoragePath ?? null,
    ...user.createdCompanies.map((company) => company.logoStoragePath),
    ...user.memberships.map((membership) => membership.company.logoStoragePath),
    ...relatedUsers
      .filter((relatedUser) => relatedUserIdsToDelete.includes(relatedUser.id))
      .flatMap((relatedUser) => [
        relatedUser.avatarStoragePath,
        relatedUser.onboardingDraft?.logoStoragePath,
      ]),
  ].filter((value): value is string => Boolean(value));

  console.log(
    `Deleting local data for ${options.email}: ${companyIdsToDelete.length} company record(s), ${relatedUserIdsToDelete.length + 1} user account(s).`,
  );

  if (skippedRelatedUsers.length > 0) {
    console.log(
      `Skipping ${skippedRelatedUsers.length} related user account(s) that still belong to other companies:`,
    );
    console.table(skippedRelatedUsers);
  }

  await deleteCompanyOwnedData({
    companyIdsToDelete,
    relatedUserIdsToDelete,
    skippedRelatedUsers,
    targetUserId: user.id,
  });

  if (options.deleteStorageFiles) {
    await deleteStorageFiles(storagePathsToDelete);
  } else if (storagePathsToDelete.length > 0) {
    console.log(
      `Skipped deletion of ${storagePathsToDelete.length} storage object(s). Re-run with --delete-storage only when the configured storage environment is safe.`,
    );
  }

  console.log(
    `Deleted user-owned data for ${options.email}. Removed ${companyIdsToDelete.length} company record(s) and ${relatedUserIdsToDelete.length + 1} user account(s).`,
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
