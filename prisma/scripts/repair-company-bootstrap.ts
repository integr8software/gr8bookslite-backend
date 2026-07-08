import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CompanyStatus } from '@prisma/client';
import {
  getCompanyBootstrapHandlerKeys,
  getCompanyBootstrapHandlers,
} from '../company-bootstrap/company-bootstrap.registry';
import type {
  CompanyBootstrapBackup,
  CompanyBootstrapHandler,
  CompanyBootstrapInspection,
} from '../company-bootstrap/company-bootstrap.types';
import { prisma } from '../seeds/prismaClient';

type CompanyRecord = {
  id: number;
  name: string;
};

type HandlerReport = {
  key: string;
  label: string;
  status: CompanyBootstrapInspection['status'];
  summary: string;
  actions: string[];
  details?: Record<string, unknown>;
  applied: boolean;
  error?: string;
};

type CompanyReport = {
  companyId: number;
  companyName: string;
  handlers: HandlerReport[];
};

function getOptionValues(flag: string) {
  const values: string[] = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== flag) {
      continue;
    }

    const value = process.argv[index + 1];
    if (value && !value.startsWith('--')) {
      values.push(value);
    }
  }

  return values.flatMap((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function getNumberOption(flag: string) {
  const [value] = getOptionValues(flag);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }

  return parsed;
}

function shouldApply() {
  return process.argv.includes('--apply');
}

async function main() {
  const apply = shouldApply();
  const companyId = getNumberOption('--company-id');
  const only = getOptionValues('--only');
  const skip = getOptionValues('--skip');
  const handlers = getCompanyBootstrapHandlers({ only, skip });

  assertHandlerSelection(handlers, only, skip);

  const companies = await getCompanies(companyId);
  if (companies.length === 0) {
    console.log('No active companies matched the requested scope.');
    return;
  }

  console.log(`Company bootstrap repair (${apply ? 'apply' : 'dry-run'}).`);
  console.log(`Companies: ${companies.length}`);
  console.log(`Handlers: ${handlers.map((handler) => handler.key).join(', ')}`);

  if (apply) {
    const backupPath = await writeBackup(companies, handlers);
    console.log(`Backup written to ${backupPath}`);
  }

  const reports: CompanyReport[] = [];

  for (const company of companies) {
    reports.push(await processCompany(company, handlers, apply));
  }

  printReport(reports, apply);

  if (!apply) {
    console.log('');
    console.log('Dry run only. Re-run with --apply to write repairs.');
  }
}

function assertHandlerSelection(
  handlers: CompanyBootstrapHandler[],
  only: string[],
  skip: string[],
) {
  const knownKeys = new Set(getCompanyBootstrapHandlerKeys());
  const requestedKeys = [...only, ...skip];
  const unknownKeys = requestedKeys.filter((key) => !knownKeys.has(key));

  if (unknownKeys.length > 0) {
    throw new Error(
      `Unknown handler key(s): ${unknownKeys.join(', ')}. Known keys: ${[
        ...knownKeys,
      ].join(', ')}`,
    );
  }

  if (handlers.length === 0) {
    throw new Error('No company bootstrap handlers selected.');
  }
}

async function getCompanies(companyId: number | null): Promise<CompanyRecord[]> {
  return prisma.company.findMany({
    where: {
      ...(companyId ? { id: companyId } : {}),
      isActive: true,
      status: CompanyStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { id: 'asc' },
  });
}

async function processCompany(
  company: CompanyRecord,
  handlers: CompanyBootstrapHandler[],
  apply: boolean,
): Promise<CompanyReport> {
  const handlerReports: HandlerReport[] = [];

  for (const handler of handlers) {
    try {
      const before = await prisma.$transaction((tx) =>
        handler.inspect(company.id, tx),
      );
      let applied = false;

      if (
        apply &&
        before.status === 'missing' &&
        before.actions.length > 0 &&
        handler.apply
      ) {
        await prisma.$transaction((tx) => handler.apply!(company.id, tx));
        applied = true;
      }

      const after = applied
        ? await prisma.$transaction((tx) => handler.inspect(company.id, tx))
        : before;

      handlerReports.push({
        key: handler.key,
        label: handler.label,
        status: after.status,
        summary: applied
          ? `${before.summary} -> ${after.summary}`
          : after.summary,
        actions: applied ? before.actions : after.actions,
        details: after.details,
        applied,
      });
    } catch (error: unknown) {
      handlerReports.push({
        key: handler.key,
        label: handler.label,
        status: 'error',
        summary: 'Handler failed.',
        actions: [],
        applied: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    companyId: company.id,
    companyName: company.name,
    handlers: handlerReports,
  };
}

async function writeBackup(
  companies: CompanyRecord[],
  handlers: CompanyBootstrapHandler[],
) {
  const backupDirectory = path.resolve('tmp/backups');
  await mkdir(backupDirectory, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(
    backupDirectory,
    `company-bootstrap-repair-${timestamp}.json`,
  );

  const companyBackups: Array<{
    companyId: number;
    companyName: string;
    handlers: CompanyBootstrapBackup[];
  }> = [];

  for (const company of companies) {
    const handlerBackups: CompanyBootstrapBackup[] = [];

    for (const handler of handlers) {
      if (!handler.backup) {
        continue;
      }

      handlerBackups.push(
        await prisma.$transaction((tx) => handler.backup!(company.id, tx)),
      );
    }

    companyBackups.push({
      companyId: company.id,
      companyName: company.name,
      handlers: handlerBackups,
    });
  }

  await writeFile(
    backupPath,
    JSON.stringify(
      {
        timestamp,
        companies: companyBackups,
      },
      null,
      2,
    ),
  );

  return backupPath;
}

function printReport(reports: CompanyReport[], apply: boolean) {
  const rows = reports.flatMap((company) =>
    company.handlers.map((handler) => ({
      companyId: company.companyId,
      companyName: company.companyName,
      handler: handler.key,
      status: handler.status,
      applied: handler.applied,
      summary: handler.error ?? handler.summary,
      actions: handler.actions.join('; '),
    })),
  );

  console.table(rows);
  console.log(
    JSON.stringify(
      {
        apply,
        companiesChecked: reports.length,
        missingCount: rows.filter((row) => row.status === 'missing').length,
        warningCount: rows.filter((row) => row.status === 'warning').length,
        errorCount: rows.filter((row) => row.status === 'error').length,
        appliedCount: rows.filter((row) => row.applied).length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to repair company bootstrap.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
