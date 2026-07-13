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
