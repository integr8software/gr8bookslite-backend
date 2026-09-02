import {
  emptyStringToUndefined,
  normalizeCode,
  normalizeNumberStringInput,
  normalizeOptionalQueryString,
  toOptionalInt,
  trimString,
} from './dto-transform.util';

describe('DTO transform utilities', () => {
  it('normalizes optional integer and text inputs', () => {
    expect(toOptionalInt('42')).toBe(42);
    expect(toOptionalInt('')).toBeUndefined();
    expect(trimString('  value  ')).toBe('value');
    expect(normalizeCode('  ab-12  ')).toBe('AB-12');
    expect(emptyStringToUndefined('')).toBeUndefined();
  });

  it('normalizes query values without stringifying unsupported objects', () => {
    expect(normalizeOptionalQueryString(['first', 'second'])).toBe('first');
    expect(normalizeOptionalQueryString(17)).toBe('17');
    expect(normalizeOptionalQueryString({ value: 'invalid' })).toBeUndefined();
  });

  it('removes grouping separators from numeric strings', () => {
    expect(normalizeNumberStringInput(' 1,234.50 ')).toBe('1234.50');
    expect(normalizeNumberStringInput(125)).toBe('125');
    expect(normalizeNumberStringInput('   ')).toBeUndefined();
  });
});
