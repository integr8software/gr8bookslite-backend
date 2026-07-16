import { BadRequestException } from '@nestjs/common';
import { ChartAccountLevel } from '@prisma/client';
import { assertCanCreateAccountLevel, generateNextAccountCodeFromSiblings, inferAccountLevelFromCode, parseChartAccountCode } from './chart-account-code.util';

describe('chart-account-code.util', () => {
  it('parses valid 10-digit account codes', () => {
    expect(parseChartAccountCode('1010301001')).toEqual({
      major: 1,
      sub1: 1,
      sub2: 3,
      sub3: 1,
      specific: 1,
    });
  });

  it('rejects malformed account codes', () => {
    expect(() => parseChartAccountCode('101')).toThrow(BadRequestException);
  });

  it('infers the account level from populated code segments', () => {
    expect(inferAccountLevelFromCode('1000000000')).toBe(ChartAccountLevel.MAJOR);
    expect(inferAccountLevelFromCode('1010000000')).toBe(ChartAccountLevel.SUB1);
    expect(inferAccountLevelFromCode('1010300000')).toBe(ChartAccountLevel.SUB2);
    expect(inferAccountLevelFromCode('1010301000')).toBe(ChartAccountLevel.SUB3);
    expect(inferAccountLevelFromCode('1010301001')).toBe(ChartAccountLevel.SPECIFIC);
  });

  it('generates major accounts and fills gaps', () => {
    expect(
      generateNextAccountCodeFromSiblings({
        parentCode: null,
        accountLevel: ChartAccountLevel.MAJOR,
        siblingCodes: ['1000000000', '3000000000'],
      }),
    ).toBe('2000000000');
  });

  it('generates Sub1 accounts and fills gaps', () => {
    expect(
      generateNextAccountCodeFromSiblings({
        parentCode: '1000000000',
        accountLevel: ChartAccountLevel.SUB1,
        siblingCodes: ['1010000000', '1020000000', '1050000000'],
      }),
    ).toBe('1030000000');
  });

  it('generates Sub2 accounts and fills gaps', () => {
    expect(
      generateNextAccountCodeFromSiblings({
        parentCode: '1010000000',
        accountLevel: ChartAccountLevel.SUB2,
        siblingCodes: ['1010100000', '1010300000'],
      }),
    ).toBe('1010200000');
  });

  it('generates Sub3 accounts and fills gaps', () => {
    expect(
      generateNextAccountCodeFromSiblings({
        parentCode: '1010300000',
        accountLevel: ChartAccountLevel.SUB3,
        siblingCodes: ['1010301000', '1010303000'],
      }),
    ).toBe('1010302000');
  });

  it('generates specific account codes under sub accounts', () => {
    expect(
      generateNextAccountCodeFromSiblings({
        parentCode: '1010300000',
        accountLevel: ChartAccountLevel.SPECIFIC,
        siblingCodes: ['1010300001', '1010300002', '1010300005'],
      }),
    ).toBe('1010300003');
  });

  it('rejects invalid child levels', () => {
    expect(() => assertCanCreateAccountLevel(ChartAccountLevel.SUB1, ChartAccountLevel.SUB3)).toThrow(BadRequestException);
  });

  it('rejects specific accounts directly under major accounts', () => {
    expect(() => assertCanCreateAccountLevel(ChartAccountLevel.MAJOR, ChartAccountLevel.SPECIFIC)).toThrow(BadRequestException);
  });

  it('allows specific accounts under sub account 1, 2, or 3', () => {
    expect(() => assertCanCreateAccountLevel(ChartAccountLevel.SUB1, ChartAccountLevel.SPECIFIC)).not.toThrow();
    expect(() => assertCanCreateAccountLevel(ChartAccountLevel.SUB2, ChartAccountLevel.SPECIFIC)).not.toThrow();
    expect(() => assertCanCreateAccountLevel(ChartAccountLevel.SUB3, ChartAccountLevel.SPECIFIC)).not.toThrow();
  });

  it('rejects child accounts under specific accounts', () => {
    expect(() => assertCanCreateAccountLevel(ChartAccountLevel.SPECIFIC, ChartAccountLevel.SUB1)).toThrow(BadRequestException);
  });
});
