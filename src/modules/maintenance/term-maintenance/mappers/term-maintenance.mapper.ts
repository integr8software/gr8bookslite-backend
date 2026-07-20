import type { Term } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';

export function mapTerm(term: Term, userNames: Map<number, string>) {
  return {
    id: term.id.toString(),
    name: term.name,
    description: term.description ?? '',
    dateMode: term.dateMode,
    period: term.period,
    status: term.status,
    createdBy: term.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(term.createdByUserId) ?? null),
    createdAt: term.createdAt,
    updatedBy: (term.updatedByUserId && userNames.get(term.updatedByUserId)) ?? null,
    updatedAt: term.updatedAt,
  };
}
