import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, TaxStatus } from '@prisma/client';
import { prisma } from './prismaClient';

type TaxSeedRow = {
  atc: string | null;
  natureOfIncome: string | null;
  officialAtcCode: string | null;
  sourceKey: string;
  sortOrder: number;
  status: TaxStatus;
  taxAlias: string | null;
  taxCode: string;
  taxDescription: string;
  taxExempt: boolean;
  taxRate: Prisma.Decimal;
  taxType: string;
  transactionType: string;
};

const seedDataPath = resolve(__dirname, '../seed-data');

export async function seedTaxes() {
  const rows = readTaxRows();

  for (const row of rows) {
    await prisma.tax.upsert({
      create: row,
      update: {
        atc: row.atc,
        natureOfIncome: row.natureOfIncome,
        officialAtcCode: row.officialAtcCode,
        sortOrder: row.sortOrder,
        status: row.status,
        taxAlias: row.taxAlias,
        taxCode: row.taxCode,
        taxDescription: row.taxDescription,
        taxExempt: row.taxExempt,
        taxRate: row.taxRate,
        taxType: row.taxType,
        transactionType: row.transactionType,
      },
      where: { sourceKey: row.sourceKey },
    });
  }

  console.log(`Tax seed checked ${rows.length} rows.`);
}

function readTaxRows(): TaxSeedRow[] {
  return readCsvRows('tax.csv', [
    'sourceKey',
    'transactionType',
    'taxType',
    'taxCode',
    'taxDescription',
    'taxRate',
    'taxExempt',
    'taxAlias',
    'atc',
    'officialAtcCode',
    'natureOfIncome',
    'sortOrder',
    'status',
  ])
    .map((columns) => ({
      atc: optionalText(columns[8]),
      natureOfIncome: optionalText(columns[10]),
      officialAtcCode: optionalText(columns[9]),
      sourceKey: columns[0]?.trim() ?? '',
      sortOrder: parseSortOrder(columns[11]),
      status: parseTaxStatus(columns[12]),
      taxAlias: optionalText(columns[7]),
      taxCode: columns[3]?.trim() ?? '',
      taxDescription: columns[4]?.trim() ?? '',
      taxExempt: parseTaxExempt(columns[6]),
      taxRate: new Prisma.Decimal(columns[5]?.trim() || '0'),
      taxType: columns[2]?.trim() ?? '',
      transactionType: columns[1]?.trim() ?? '',
    }))
    .filter(
      (row) =>
        row.sourceKey &&
        row.transactionType &&
        row.taxType &&
        row.taxCode &&
        row.taxDescription,
    );
}

function optionalText(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function parseTaxExempt(value?: string) {
  return value?.trim().toUpperCase() === 'TRUE';
}

function parseSortOrder(value?: string) {
  const parsedValue = Number.parseInt(value?.trim() ?? '', 10);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseTaxStatus(value?: string) {
  const normalized = value?.trim().toUpperCase();

  return normalized === TaxStatus.INACTIVE ? TaxStatus.INACTIVE : TaxStatus.ACTIVE;
}

function readCsvRows(fileName: string, expectedHeaders: string[]): string[][] {
  const filePath = resolve(seedDataPath, fileName);
  const fileContent = readFileSync(filePath, 'utf8');
  const [headerLine, ...dataLines] = fileContent.split(/\r?\n/);
  const headers = parseCsvLine(headerLine ?? '');

  if (headers.join('|') !== expectedHeaders.join('|')) {
    throw new Error(
      `Unexpected tax CSV header in ${filePath}.`,
    );
  }

  return dataLines
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line));
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let isInsideQuotedField = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isInsideQuotedField && nextCharacter === '"') {
      currentField += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      isInsideQuotedField = !isInsideQuotedField;
      continue;
    }

    if (character === ',' && !isInsideQuotedField) {
      fields.push(currentField);
      currentField = '';
      continue;
    }

    currentField += character;
  }

  fields.push(currentField);

  return fields;
}
