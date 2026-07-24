import { BadRequestException } from '@nestjs/common';

const IsoDatePrefixPattern = /^(\d{4}-\d{2}-\d{2})(?:$|T)/;

export function parseUtcDateOnly(value: string, fieldName = 'date') {
  const match = value.match(IsoDatePrefixPattern);
  if (!match) {
    throw invalidDate(fieldName);
  }

  const dateOnly = match[1];
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateOnly) {
    throw invalidDate(fieldName);
  }

  return date;
}

export function getUtcToday() {
  return parseUtcDateOnly(new Date().toISOString());
}

function invalidDate(fieldName: string) {
  return new BadRequestException(`${fieldName} must be a valid ISO date.`);
}
