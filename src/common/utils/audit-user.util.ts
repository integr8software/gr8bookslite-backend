import type { AuditUserLookupClient } from '../interfaces/audit-user-lookup-client.interface';

export const SystemGeneratedAuditLabel = 'System Generated';

export async function resolveAuditUserNames(prisma: AuditUserLookupClient, userIds: Array<number | null | undefined>) {
  const uniqueUserIds = [...new Set(userIds.filter((userId): userId is number => userId !== null && userId !== undefined))];
  const users = uniqueUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true, name: true },
      })
    : [];

  return new Map(users.map((user) => [user.id, user.name]));
}

export function parseAuditUserId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const userId = Number(value);

  return Number.isInteger(userId) ? userId : null;
}
