export const PartyPurchaseTypeOptions = ['Goods', 'Services', 'Assets'] as const;

export type PartyPurchaseType = (typeof PartyPurchaseTypeOptions)[number];

export function normalizePartyPurchaseTypes(value: unknown): PartyPurchaseType[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const normalizedTypes = values
    .filter((purchaseType): purchaseType is string => typeof purchaseType === 'string')
    .map((purchaseType) => PartyPurchaseTypeOptions.find((option) => option.toLowerCase() === purchaseType.trim().toLowerCase()))
    .filter((purchaseType): purchaseType is PartyPurchaseType => Boolean(purchaseType));

  return Array.from(new Set(normalizedTypes));
}
