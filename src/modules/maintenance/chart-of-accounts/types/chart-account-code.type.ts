import { ChartAccountLevel } from '@prisma/client';

export type ParsedChartAccountCode = {
  major: number;
  sub1: number;
  sub2: number;
  sub3: number;
  specific: number;
};

export type ChartAccountCodeLevel = ChartAccountLevel;
