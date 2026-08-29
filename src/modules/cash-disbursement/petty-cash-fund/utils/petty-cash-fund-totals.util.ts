export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function amountsMatch(amountA: number, amountB: number, epsilon = 0.01): boolean {
  return Math.abs(amountA - amountB) < epsilon;
}
