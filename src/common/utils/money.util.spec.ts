import { roundMoney } from './money.util';

describe('roundMoney', () => {
  it('rounds decimal values to cents', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });

  it('keeps negative values rounded to cents', () => {
    expect(roundMoney(-12.345)).toBe(-12.35);
  });
});
