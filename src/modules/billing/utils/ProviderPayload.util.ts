import { BadRequestException } from '@nestjs/common';

export function readProviderObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readProviderString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function readProviderNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readProviderUnixDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000);
  }

  return null;
}

export function readFirstProviderArrayObject(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value[0]
    ? readProviderObject(value[0])
    : null;
}

export function readProviderResponseData(payload: Record<string, unknown> | null) {
  const data = payload?.data;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException('Unexpected billing provider response payload.');
  }

  return data as Record<string, unknown>;
}

export function readProviderResponseAttributes(data: Record<string, unknown>) {
  const attributes = data.attributes;

  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return {} as Record<string, unknown>;
  }

  return attributes as Record<string, unknown>;
}
