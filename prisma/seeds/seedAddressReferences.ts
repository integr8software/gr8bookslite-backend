import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from './prismaClient';

type RegionSeedRow = {
  psgcCode: string;
  code: string;
  name: string;
};

type ProvinceSeedRow = {
  psgcCode: string;
  code: string;
  name: string;
  regionCode: string;
};

type CityMunicipalitySeedRow = {
  psgcCode: string;
  code: string;
  name: string;
  regionCode: string;
  provinceCode: string;
};

type BarangaySeedRow = {
  psgcCode: string;
  code: string;
  name: string;
  regionCode: string;
  provinceCode: string;
  cityMunicipalityCode: string;
};

const seedDataPath = resolve(__dirname, '../seed-data');
const batchSize = 1000;

export async function seedAddressReferences() {
  const regions = readRegionRows();
  const provinces = readProvinceRows();
  const cityMunicipalities = readCityMunicipalityRows();
  const barangays = readBarangayRows();

  await prisma.region.createMany({
    data: regions,
    skipDuplicates: true,
  });

  await prisma.province.createMany({
    data: provinces,
    skipDuplicates: true,
  });

  await createInBatches('city/municipality', cityMunicipalities, (batch) =>
    prisma.cityMunicipality.createMany({
      data: batch,
      skipDuplicates: true,
    }),
  );

  await createInBatches('barangay', barangays, (batch) =>
    prisma.barangay.createMany({
      data: batch,
      skipDuplicates: true,
    }),
  );

  console.log(
    `Address reference seed checked ${regions.length} regions, ${provinces.length} provinces, ${cityMunicipalities.length} cities/municipalities, and ${barangays.length} barangays.`,
  );
}

async function createInBatches<T>(
  label: string,
  rows: T[],
  createBatch: (batch: T[]) => Promise<unknown>,
) {
  for (let index = 0; index < rows.length; index += batchSize) {
    await createBatch(rows.slice(index, index + batchSize));
  }

  console.log(`Address reference ${label} seed checked ${rows.length} rows.`);
}

function readRegionRows(): RegionSeedRow[] {
  return readCsvRows('region.csv', ['id', 'psgcCode', 'regDesc', 'regCode'])
    .map((columns) => ({
      psgcCode: columns[1]?.trim() ?? '',
      code: columns[3]?.trim() ?? '',
      name: columns[2]?.trim() ?? '',
    }))
    .filter((row) => row.psgcCode && row.code && row.name);
}

function readProvinceRows(): ProvinceSeedRow[] {
  return readCsvRows('province.csv', [
    'id',
    'psgcCode',
    'provDesc',
    'regCode',
    'provCode',
  ])
    .map((columns) => ({
      psgcCode: columns[1]?.trim() ?? '',
      code: columns[4]?.trim() ?? '',
      name: columns[2]?.trim() ?? '',
      regionCode: columns[3]?.trim() ?? '',
    }))
    .filter((row) => row.psgcCode && row.code && row.name && row.regionCode);
}

function readCityMunicipalityRows(): CityMunicipalitySeedRow[] {
  return readCsvRows('citymunicipality.csv', [
    'id',
    'psgcCode',
    'citymunDesc',
    'regDesc',
    'provCode',
    'citymunCode',
  ])
    .map((columns) => ({
      psgcCode: columns[1]?.trim() ?? '',
      code: columns[5]?.trim() ?? '',
      name: columns[2]?.trim() ?? '',
      regionCode: columns[3]?.trim() ?? '',
      provinceCode: columns[4]?.trim() ?? '',
    }))
    .filter(
      (row) =>
        row.psgcCode &&
        row.code &&
        row.name &&
        row.regionCode &&
        row.provinceCode,
    );
}

function readBarangayRows(): BarangaySeedRow[] {
  return readCsvRows('barangay.csv', [
    'id',
    'brgyCode',
    'brgyDesc',
    'regCode',
    'provCode',
    'citymunCode',
  ])
    .map((columns) => ({
      psgcCode: columns[1]?.trim() ?? '',
      code: columns[1]?.trim() ?? '',
      name: columns[2]?.trim() ?? '',
      regionCode: columns[3]?.trim() ?? '',
      provinceCode: columns[4]?.trim() ?? '',
      cityMunicipalityCode: columns[5]?.trim() ?? '',
    }))
    .filter(
      (row) =>
        row.psgcCode &&
        row.code &&
        row.name &&
        row.regionCode &&
        row.provinceCode &&
        row.cityMunicipalityCode,
    );
}

function readCsvRows(fileName: string, expectedHeaders: string[]): string[][] {
  const filePath = resolve(seedDataPath, fileName);
  const fileContent = readFileSync(filePath, 'utf8');
  const [headerLine, ...dataLines] = fileContent.split(/\r?\n/);
  const headers = parseCsvLine(headerLine ?? '');

  if (headers.join('|') !== expectedHeaders.join('|')) {
    throw new Error(`Unexpected address CSV header in ${filePath}.`);
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
