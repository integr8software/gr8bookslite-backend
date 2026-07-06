import { prisma } from '../seeds/prismaClient';
import {
  collectLegacySaasAccessAudit,
  formatAuditRows,
  getRowsWithLegacySaasAccessIssues,
} from './legacySaasAccessBackfill';

async function main() {
  const rows = await collectLegacySaasAccessAudit(prisma);
  const issueRows = getRowsWithLegacySaasAccessIssues(rows);

  console.log('Legacy SaaS access audit:');
  console.table(formatAuditRows(issueRows));
  console.log(
    JSON.stringify(
      {
        companiesScanned: new Set(rows.map((row) => row.companyId)).size,
        companyRowsScanned: rows.length,
        issueRows: issueRows.length,
        affectedCompanies: new Set(issueRows.map((row) => row.companyId)).size,
      },
      null,
      2,
    ),
  );

  if (issueRows.length === 0) {
    console.log('No legacy SaaS access gaps found.');
    return;
  }

  console.log(
    'Run db:backfill-legacy-saas-access:* in dry-run mode to preview repairs.',
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to audit legacy SaaS access.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
