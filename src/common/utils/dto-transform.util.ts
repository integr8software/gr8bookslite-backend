export function toOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeCode(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export function emptyStringToUndefined(value: unknown) {
  return value === '' ? undefined : value;
}

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
