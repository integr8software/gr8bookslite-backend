import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { prisma } from './prismaClient';

type ModuleFieldSeed = {
  moduleCode: string;
  fieldKey: string;
  label: string;
  sourcePath: string;
  fieldType?: string;
  isRequired: boolean;
  sortOrder: number;
};

const FrontendModuleRoot = join(__dirname, '..', '..', '..', 'gr8bookslite-frontend', 'app', 'src', 'ui', 'modules');
const FrontendModuleConstantsRoot = join(__dirname, '..', '..', '..', 'gr8bookslite-frontend', 'app', 'src', 'constants', 'modules');
const LabelPatterns = [/label\s*=\s*["'`]([^"'`{}]{2,80})["'`]/g];
const IgnoredLabels = new Set(['Add', 'Edit', 'View', 'Save', 'Cancel', 'Delete', 'Search', 'Actions', 'Status']);
const ModuleDirectoryHints: Record<string, string[]> = {
  DO: ['dashboard'],
  COA: ['financial-maintenance/charts-of-accounts'],
  DA: ['financial-maintenance/default-account'],
  BM: ['financial-maintenance/bank-masterfile'],
  SM: ['financial-maintenance/services-maintenance'],
  PM: ['party-management'],
  I: ['item-management/items'],
  IB: ['item-management/item-bundles'],
  IC: ['item-management/item-category'],
  IV: ['item-management/item-variations'],
  UOM: ['item-management/unit-of-measurement'],
  IPR: ['item-management/item-promotions'],
  PLS: ['item-management/item-price-lists'],
  TT: ['item-management/inventory-transaction-type'],
  WM: ['warehouse-management/warehouses'],
  WA: ['warehouse-management/warehouse-access'],
  WS: ['warehouse-management/warehouse-storage'],
  WSI: ['warehouse-management/warehouse-inventory-stock'],
  WT: ['warehouse-management/warehouse-transfers'],
  DVE: ['delivery-vehicle-management/delivery-vehicles'],
  DVT: ['delivery-vehicle-management/vehicle-types'],
  DVMR: ['delivery-vehicle-management/vehicle-repair-maintenance'],
  DSM: ['financial-maintenance/discount-maintenance'],
  TM: ['financial-maintenance/terms-maintenance'],
  PT: ['financial-maintenance/payment-type'],
  RC: ['financial-maintenance/responsibility-center'],
  OR: ['cash-receipt/official-receipt'],
  CR: ['cash-receipt/collection-receipt'],
  AR: ['cash-receipt/acknowledgement-receipt'],
  PVR: ['cash-receipt/provisional-receipt'],
  BR: ['cash-receipt/bank-reconciliation'],
  CV: ['cash-disbursement/cash-voucher'],
  DV: ['cash-disbursement/disbursement-voucher'],
  CA: ['cash-disbursement/cash-advance'],
  CAME: ['cash-disbursement/cash-advance-multiple-entry'],
  PCV: ['cash-disbursement/petty-cash-voucher'],
  PCF: ['cash-disbursement/petty-cash-fund'],
  PCFR: ['cash-disbursement/petty-cash-fund-replenishment'],
  RF: ['cash-disbursement/revolving-fund'],
  RFR: ['cash-disbursement/revolving-fund-replenishment'],
  ATS: ['cash-disbursement/advances-to-suppliers'],
  RT: ['cash-disbursement/recurring-transactions'],
  APV: ['accounts-payable/accounts-payable-voucher'],
  JV: ['general-journal/journal-voucher'],
  SQ: ['sales/sales-quotation'],
  SI: ['sales/sales-invoice'],
  B: ['sales/billing'],
  BS: ['sales/billing-statement'],
  BI: ['sales/billing-invoice'],
  SVI: ['sales/service-invoice'],
  CSI: ['sales/cash-sales-invoice'],
  SJ: ['sales/sales-journal'],
  RR: ['inventory/receiving-report'],
  GR: ['inventory/goods-receipt'],
  INC: ['inventory/inventory-count'],
  MR: ['inventory/material-request'],
  PL: ['inventory/pick-list'],
  GI: ['inventory/goods-issue'],
  DR: ['inventory/delivery-receipt'],
  PR: ['purchasing/purchase-request'],
  CF: ['purchasing/canvass-form'],
  PO: ['purchasing/purchase-order'],
  PJ: ['purchasing/purchase-journal'],
  FA: ['others/fixed-asset'],
  BBU: ['others/beginning-balance-uploader'],
  U: ['system-administration/user-management/users'],
  UR: ['system-administration/user-management/user-role'],
  AM: ['approval-management', 'system-administration/user-management/approver-setup'],
  AT: ['system-administration/audit-trail'],
  TNS: ['system-administration/transaction-number-setup'],
  MCS: ['system-administration/multi-currency-setup'],
  FS: ['system-administration/form-signatory'],
  CRPT: ['system-administration/customized-reports'],
  MM: ['system-administration/mail-maintenance'],
};

export async function seedModuleFields() {
  const modules = await prisma.module.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } });

  for (const module of modules) {
    const fields = discoverModuleFields(module.code, module.name);
    const fallbackFields = fields.length ? fields : createFallbackFields(module.code);

    for (const field of fallbackFields) {
      const where = { moduleId_fieldKey: { moduleId: module.id, fieldKey: field.fieldKey } };
      const existingField = await prisma.moduleField.findUnique({
        where,
        select: { defaultRequired: true, isRequired: true },
      });
      const isRequiredCustomized = existingField && existingField.isRequired !== existingField.defaultRequired;

      if (!existingField) {
        await prisma.moduleField.create({
          data: {
            moduleId: module.id,
            fieldKey: field.fieldKey,
            label: field.label,
            sourcePath: field.sourcePath,
            fieldType: field.fieldType ?? null,
            sortOrder: field.sortOrder,
            isVisible: true,
            isRequired: field.isRequired,
            defaultVisible: true,
            defaultRequired: field.isRequired,
            metadata: {},
          },
        });
        continue;
      }

      await prisma.moduleField.update({
        where,
        data: {
          moduleId: module.id,
          fieldKey: field.fieldKey,
          label: field.label,
          sourcePath: field.sourcePath,
          fieldType: field.fieldType ?? null,
          sortOrder: field.sortOrder,
          defaultRequired: field.isRequired,
          isRequired: isRequiredCustomized ? existingField.isRequired : field.isRequired,
        },
      });
    }
  }
}

function discoverModuleFields(moduleCode: string, moduleName: string): ModuleFieldSeed[] {
  if (!existsSync(FrontendModuleRoot)) return [];
  const directories = ModuleDirectoryHints[moduleCode] ?? [toKebabCase(moduleName)];
  const seen = new Set<string>();
  const fields: ModuleFieldSeed[] = [];

  for (const directory of directories) {
    const sourceDirectories = [
      { root: FrontendModuleRoot, sourcePathPrefix: '', fullDirectory: join(FrontendModuleRoot, ...directory.split('/')) },
      {
        root: FrontendModuleConstantsRoot,
        sourcePathPrefix: 'constants/',
        fullDirectory: join(FrontendModuleConstantsRoot, ...directory.split('/')),
      },
    ];

    for (const sourceDirectory of sourceDirectories) {
      if (!existsSync(sourceDirectory.fullDirectory)) continue;

      for (const filePath of collectSourceFiles(sourceDirectory.fullDirectory)) {
        const sourcePath = `${sourceDirectory.sourcePathPrefix}${relative(sourceDirectory.root, filePath).replace(/\\/g, '/')}`;
        const text = readFileSync(filePath, 'utf8');
        for (const pattern of LabelPatterns) {
          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(text))) {
            const label = normalizeLabel(match[1]);
            if (!label || IgnoredLabels.has(label) || label.length > 80) continue;
            const fieldKey = toFieldKey(label);
            if (seen.has(fieldKey)) continue;
            seen.add(fieldKey);
            fields.push({
              moduleCode,
              fieldKey,
              label,
              sourcePath,
              fieldType: inferFieldType(label),
              isRequired: isLabelRequired(text, match.index),
              sortOrder: fields.length,
            });
          }
        }

      }
    }
  }

  return fields;
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return collectSourceFiles(fullPath);
    if (/\.(tsx|ts)$/.test(entry)) return [fullPath];
    return [];
  });
}

function createFallbackFields(moduleCode: string): ModuleFieldSeed[] {
  return ['Code', 'Name', 'Description', 'Status'].map((label, index) => ({
    moduleCode,
    fieldKey: toFieldKey(label),
    label,
    sourcePath: 'fallback',
    fieldType: inferFieldType(label),
    isRequired: false,
    sortOrder: index,
  }));
}

function isLabelRequired(text: string, labelIndex: number) {
  const openingTagStart = text.lastIndexOf('<', labelIndex);
  const openingTagEnd = text.indexOf('>', labelIndex);
  const openingTag = openingTagStart >= 0 && openingTagEnd >= 0 ? text.slice(openingTagStart, openingTagEnd + 1) : '';

  if (/\b(?:isRequired|required)\s*=\s*\{\s*false\s*\}/.test(openingTag)) {
    return false;
  }

  if (/\b(?:isRequired|required)\b/.test(openingTag) || /\b(?:isRequired|required)\s*=\s*\{\s*true\s*\}/.test(openingTag)) {
    return true;
  }

  const nearbyText = text.slice(labelIndex, Math.min(text.length, labelIndex + 320));

  if (/\bfallbackRequired\b/.test(nearbyText)) {
    return true;
  }

  if (/<span[^>]*>\s*\*\s*<\/span>/.test(nearbyText)) {
    return true;
  }

  return false;
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function toFieldKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toKebabCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferFieldType(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('date')) return 'date';
  if (normalized.includes('amount') || normalized.includes('qty') || normalized.includes('quantity') || normalized.includes('number')) return 'number';
  if (normalized.includes('email')) return 'email';
  if (normalized.includes('status')) return 'select';
  return 'text';
}
