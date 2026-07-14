import type { Prisma } from '@prisma/client';
import { ResponsibilityCenterInclude } from '../prisma/responsibility-center.include';

export type ResponsibilityCenterWithRelations =
  Prisma.ResponsibilityCenterGetPayload<{
    include: typeof ResponsibilityCenterInclude;
  }>;
