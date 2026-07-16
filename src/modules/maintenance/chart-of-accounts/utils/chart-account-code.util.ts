import { BadRequestException } from '@nestjs/common';
import { ChartAccountLevel } from '@prisma/client';
import type { ParsedChartAccountCode } from '../types/chart-account-code.type';

const AccountCodePattern = /^\d{10}$/;

const ChildLevelsByParentLevel: Record<ChartAccountLevel, ChartAccountLevel[]> = {
  [ChartAccountLevel.MAJOR]: [ChartAccountLevel.SUB1],
  [ChartAccountLevel.SUB1]: [ChartAccountLevel.SUB2, ChartAccountLevel.SPECIFIC],
  [ChartAccountLevel.SUB2]: [ChartAccountLevel.SUB3, ChartAccountLevel.SPECIFIC],
  [ChartAccountLevel.SUB3]: [ChartAccountLevel.SPECIFIC],
  [ChartAccountLevel.SPECIFIC]: [],
};

const AccountLevelLabels: Record<ChartAccountLevel, string> = {
  [ChartAccountLevel.MAJOR]: 'Major Account',
  [ChartAccountLevel.SUB1]: 'Sub Account 1',
  [ChartAccountLevel.SUB2]: 'Sub Account 2',
  [ChartAccountLevel.SUB3]: 'Sub Account 3',
  [ChartAccountLevel.SPECIFIC]: 'Specific Account',
};

export function parseChartAccountCode(code: string): ParsedChartAccountCode {
  if (!AccountCodePattern.test(code)) {
    throw new BadRequestException('Account code must be a 10-digit number.');
  }

  return {
    major: Number(code.slice(0, 1)),
    sub1: Number(code.slice(1, 3)),
    sub2: Number(code.slice(3, 5)),
    sub3: Number(code.slice(5, 7)),
    specific: Number(code.slice(7, 10)),
  };
}

export function buildChartAccountCode(parts: ParsedChartAccountCode) {
  return [
    formatSegment(parts.major, 1, 'Major'),
    formatSegment(parts.sub1, 2, 'Sub1'),
    formatSegment(parts.sub2, 2, 'Sub2'),
    formatSegment(parts.sub3, 2, 'Sub3'),
    formatSegment(parts.specific, 3, 'Specific'),
  ].join('');
}

export function assertCanCreateAccountLevel(parentLevel: ChartAccountLevel | null, accountLevel: ChartAccountLevel) {
  if (!parentLevel) {
    if (accountLevel !== ChartAccountLevel.MAJOR) {
      throw new BadRequestException('Only Major Account can omit a parent.');
    }

    return;
  }

  if (!ChildLevelsByParentLevel[parentLevel].includes(accountLevel)) {
    throw new BadRequestException(`${AccountLevelLabels[accountLevel]} cannot be created under ${AccountLevelLabels[parentLevel]}.`);
  }
}

export function inferAccountLevelFromCode(code: string): ChartAccountLevel {
  const parts = parseChartAccountCode(code);

  if (parts.specific > 0) {
    return ChartAccountLevel.SPECIFIC;
  }

  if (parts.sub3 > 0) {
    return ChartAccountLevel.SUB3;
  }

  if (parts.sub2 > 0) {
    return ChartAccountLevel.SUB2;
  }

  if (parts.sub1 > 0) {
    return ChartAccountLevel.SUB1;
  }

  return ChartAccountLevel.MAJOR;
}

export function generateNextAccountCodeFromSiblings({
  parentCode,
  accountLevel,
  siblingCodes,
}: {
  parentCode: string | null;
  accountLevel: ChartAccountLevel;
  siblingCodes: string[];
}) {
  const parentParts = parentCode ? parseChartAccountCode(parentCode) : { major: 0, sub1: 0, sub2: 0, sub3: 0, specific: 0 };
  const nextSequence = findFirstAvailablePositiveNumber(
    siblingCodes.map((code) => extractSequence(code, accountLevel)),
    getMaxSequence(accountLevel),
  );

  switch (accountLevel) {
    case ChartAccountLevel.MAJOR:
      return buildChartAccountCode({
        major: nextSequence,
        sub1: 0,
        sub2: 0,
        sub3: 0,
        specific: 0,
      });
    case ChartAccountLevel.SUB1:
      return buildChartAccountCode({
        major: parentParts.major,
        sub1: nextSequence,
        sub2: 0,
        sub3: 0,
        specific: 0,
      });
    case ChartAccountLevel.SUB2:
      return buildChartAccountCode({
        major: parentParts.major,
        sub1: parentParts.sub1,
        sub2: nextSequence,
        sub3: 0,
        specific: 0,
      });
    case ChartAccountLevel.SUB3:
      return buildChartAccountCode({
        major: parentParts.major,
        sub1: parentParts.sub1,
        sub2: parentParts.sub2,
        sub3: nextSequence,
        specific: 0,
      });
    case ChartAccountLevel.SPECIFIC:
      return buildChartAccountCode({
        major: parentParts.major,
        sub1: parentParts.sub1,
        sub2: parentParts.sub2,
        sub3: parentParts.sub3,
        specific: nextSequence,
      });
  }
}

export function findFirstAvailablePositiveNumber(existingNumbers: number[], max: number) {
  const usedNumbers = new Set(existingNumbers.filter((value) => Number.isInteger(value) && value > 0));

  for (let value = 1; value <= max; value += 1) {
    if (!usedNumbers.has(value)) {
      return value;
    }
  }

  throw new BadRequestException('No account code is available at this level.');
}

function extractSequence(code: string, accountLevel: ChartAccountLevel) {
  const parts = parseChartAccountCode(code);

  switch (accountLevel) {
    case ChartAccountLevel.MAJOR:
      return parts.major;
    case ChartAccountLevel.SUB1:
      return parts.sub1;
    case ChartAccountLevel.SUB2:
      return parts.sub2;
    case ChartAccountLevel.SUB3:
      return parts.sub3;
    case ChartAccountLevel.SPECIFIC:
      return parts.specific;
  }
}

function getMaxSequence(accountLevel: ChartAccountLevel) {
  if (accountLevel === ChartAccountLevel.MAJOR) {
    return 9;
  }

  return accountLevel === ChartAccountLevel.SPECIFIC ? 999 : 99;
}

function formatSegment(value: number, width: number, label: string) {
  const maxValue = 10 ** width - 1;

  if (!Number.isInteger(value) || value < 0 || value > maxValue) {
    throw new BadRequestException(`${label} account code segment is invalid.`);
  }

  return String(value).padStart(width, '0');
}
