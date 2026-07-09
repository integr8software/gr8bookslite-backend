export function cleanOptional(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  return value.trim() || null;
}

export function cleanCurrencyCode(value: string | null | undefined) {
  return cleanOptional(value)?.toUpperCase() ?? null;
}

export function normalizeIdentityValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}
