import { Prisma } from '@prisma/client';
import { PartyInclude } from '../prisma/party.include';

export type PartyWithDetails = Prisma.PartyGetPayload<{
  include: typeof PartyInclude;
}>;
