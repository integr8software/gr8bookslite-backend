import type { Prisma } from '@prisma/client';
import { ChartAccountInclude } from '../prisma/chart-account.include';

export type ChartAccountPayload = Prisma.ChartAccountGetPayload<{
  include: typeof ChartAccountInclude;
}>;

export type ChartAccountTreePayload = ChartAccountPayload & {
  children?: ChartAccountTreePayload[];
};
