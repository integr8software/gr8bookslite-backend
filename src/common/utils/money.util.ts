export function roundMoney(value: number) {
  const sign = Math.sign(value) || 1;

  return sign * (Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100);
}
