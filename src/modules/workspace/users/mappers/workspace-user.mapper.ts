import type { WorkspaceUserResponse } from '../interfaces/workspace-user-response.interface';
import type { WorkspaceUserMembershipRecord } from '../prisma/workspace-user.include';

export function mapWorkspaceUserMemberships(
  memberships: WorkspaceUserMembershipRecord[],
): WorkspaceUserResponse[] {
  const usersById = new Map<number, WorkspaceUserResponse>();

  for (const membership of memberships) {
    const current = usersById.get(membership.userId);
    const assignment = {
      companyId: membership.companyId,
      unitIds: membership.unitAccess.map((access) => access.unitId),
      units: membership.unitAccess.map((access) => ({
        ...access.unit,
        displayName: access.unit.name,
      })),
    };

    if (current) {
      current.companyAssignments.push(assignment);
      continue;
    }

    usersById.set(membership.userId, {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      contactNumber: membership.user.contactNumber,
      status: membership.user.status,
      lastLogin: membership.lastAccessedAt?.toISOString() ?? null,
      profileImageUrl: membership.user.avatarPublicUrl,
      companyAssignments: [assignment],
      createdAt: membership.user.createdAt,
      updatedAt: membership.user.updatedAt,
    });
  }

  return [...usersById.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
