import { Prisma } from '@prisma/client';
import { toJsonInput } from './prisma-json.util';

describe('toJsonInput', () => {
  it('preserves undefined so optional JSON fields can be omitted', () => {
    expect(toJsonInput(undefined)).toBeUndefined();
  });

  it('maps null to Prisma JsonNull for nullable JSON writes', () => {
    expect(toJsonInput(null)).toBe(Prisma.JsonNull);
  });

  it('passes JSON-compatible values through unchanged', () => {
    const value = { enabled: true, tags: ['copy-from'] };

    expect(toJsonInput(value)).toBe(value);
  });
});
