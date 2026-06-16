export function normalizeOptionalQueryString(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return normalizeOptionalQueryString(value[0]);
  }

  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'bigint' &&
    typeof value !== 'boolean'
  ) {
    return undefined;
  }

  return String(value);
}
