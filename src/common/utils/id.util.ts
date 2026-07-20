import { BadRequestException } from '@nestjs/common';

export function parsePositiveBigIntId(value: string, label = 'id') {
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }

  const id = BigInt(value);

  if (id <= 0n) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }

  return id;
}

export function parseOptionalPositiveBigIntId(value: string | null | undefined, label = 'id') {
  const normalized = value?.trim();

  return normalized ? parsePositiveBigIntId(normalized, label) : null;
}

export function parseOptionalPositiveBigIntIdOrUndefined(value: string | undefined, label = 'id') {
  return value === undefined ? undefined : parseOptionalPositiveBigIntId(value, label);
}
