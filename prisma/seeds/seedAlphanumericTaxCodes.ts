import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from './prismaClient';

type AlphanumericTaxCodeSeedRow = {
  atc: string | null;
  natureOfIncome: string | null;
  officialAtcCode: string | null;
  sourceKey: string;
  taxAlias: string | null;
  taxCode: string;
  taxDescription: string;
  taxRate: Prisma.Decimal;
  taxType: string;
  transactionType: string;
};

const seedDataPath = resolve(__dirname, '../seed-data');

export async function seedAlphanumericTaxCodes() {
  const rows = readAlphanumericTaxCodeRows();

  for (const row of rows) {
    await prisma.alphanumericTaxCode.upsert({
      create: row,
      update: {
        atc: row.atc,
        natureOfIncome: row.natureOfIncome,
        officialAtcCode: row.officialAtcCode,
        taxAlias: row.taxAlias,
        taxCode: row.taxCode,
        taxDescription: row.taxDescription,
        taxRate: row.taxRate,
        taxType: row.taxType,
        transactionType: row.transactionType,
      },
      where: { sourceKey: row.sourceKey },
    });
  }

  console.log(`Alphanumeric tax code seed checked ${rows.length} rows.`);
}

function readAlphanumericTaxCodeRows(): AlphanumericTaxCodeSeedRow[] {
  return readCsvRows('alphanumeric-tax-codes.csv', [
    'sourceKey',
    'transactionType',
    'taxType',
    'taxCode',
    'taxDescription',
    'taxRate',
    'taxAlias',
    'atc',
    'officialAtcCode',
    'natureOfIncome',
  ])
    .map((columns) => ({
      atc: optionalText(columns[7]),
      natureOfIncome: optionalText(columns[9]),
      officialAtcCode: optionalText(columns[8]),
      sourceKey: columns[0]?.trim() ?? '',
      taxAlias: optionalText(columns[6]),
      taxCode: columns[3]?.trim() ?? '',
      taxDescription: columns[4]?.trim() ?? '',
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

function readCsvRows(fileName: string, expectedHeaders: string[]): string[][] {
  const filePath = resolve(seedDataPath, fileName);
  const fileContent = readFileSync(filePath, 'utf8');
  const [headerLine, ...dataLines] = fileContent.split(/\r?\n/);
  const headers = parseCsvLine(headerLine ?? '');

  if (headers.join('|') !== expectedHeaders.join('|')) {
    throw new Error(
      `Unexpected alphanumeric tax code CSV header in ${filePath}.`,
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
