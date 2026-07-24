import { BadRequestException } from '@nestjs/common';
import { parseUtcDateOnly } from './date.util';

describe('date utilities', () => {
  it('parses a date-only value at UTC midnight', () => {
    expect(parseUtcDateOnly('2026-07-24')).toEqual(new Date('2026-07-24T00:00:00.000Z'));
  });

  it('accepts an ISO timestamp and uses its date component', () => {
    expect(parseUtcDateOnly('2026-07-24T15:30:00.000Z')).toEqual(new Date('2026-07-24T00:00:00.000Z'));
  });

  it('rejects impossible calendar dates', () => {
    expect(() => parseUtcDateOnly('2026-02-31', 'effectiveFrom')).toThrow(BadRequestException);
  });

  it('rejects a date prefix followed by a non-ISO suffix', () => {
    expect(() => parseUtcDateOnly('2026-07-24-invalid')).toThrow(BadRequestException);
  });
});
