import { TaxAmountSource, TaxEntrySide, TaxPostingEvent, TaxTransactionScope } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type TaxPostingRuleWriteClient =
  | Pick<PrismaService, 'tax' | 'taxPostingRule'>
  | {
      tax: PrismaService['tax'];
      taxPostingRule: PrismaService['taxPostingRule'];
    };

type PostingRuleSeed = {
  taxId: number;
  transactionScope: TaxTransactionScope;
  accountRole: string;
  entrySide: TaxEntrySide;
};

export async function seedTaxPostingRules(tx: TaxPostingRuleWriteClient) {
  const taxes = await tx.tax.findMany({
    select: {
      id: true,
      taxType: true,
      transactionType: true,
    },
  });
  const rules = taxes.flatMap(buildPostingRuleSeeds);

  for (const rule of rules) {
    await tx.taxPostingRule.upsert({
      where: {
        taxId_transactionScope_postingEvent_accountRole: {
          taxId: rule.taxId,
          transactionScope: rule.transactionScope,
          postingEvent: TaxPostingEvent.RECOGNITION,
          accountRole: rule.accountRole,
        },
      },
      update: {
        entrySide: rule.entrySide,
        amountSource: TaxAmountSource.TAX_AMOUNT,
        isActive: true,
      },
      create: {
        taxId: rule.taxId,
        transactionScope: rule.transactionScope,
        postingEvent: TaxPostingEvent.RECOGNITION,
        accountRole: rule.accountRole,
        entrySide: rule.entrySide,
        amountSource: TaxAmountSource.TAX_AMOUNT,
      },
    });
  }

  return rules.length;
}

function buildPostingRuleSeeds(tax: { id: number; taxType: string; transactionType: string }): PostingRuleSeed[] {
  const taxType = tax.taxType.toUpperCase();
  const rules: PostingRuleSeed[] = [];

  if (taxType === 'INPUT VAT') {
    rules.push({
      taxId: tax.id,
      transactionScope: TaxTransactionScope.PURCHASE,
      accountRole: 'INPUT_TAX_ACCOUNT',
      entrySide: TaxEntrySide.DEBIT,
    });
  }

  if (taxType === 'OUTPUT VAT') {
    rules.push({
      taxId: tax.id,
      transactionScope: TaxTransactionScope.SALE,
      accountRole: 'OUTPUT_VAT_ACCOUNT',
      entrySide: TaxEntrySide.CREDIT,
    });
  }

  if (taxType === 'EWT') {
    rules.push({
      taxId: tax.id,
      transactionScope: TaxTransactionScope.PURCHASE,
      accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
      entrySide: TaxEntrySide.CREDIT,
    });
  }

  if (taxType === 'FWT') {
    rules.push({
      taxId: tax.id,
      transactionScope: TaxTransactionScope.PURCHASE,
      accountRole: 'FINAL_WITHHOLDING_TAX_ACCOUNT',
      entrySide: TaxEntrySide.CREDIT,
    });
  }

  if (taxType === 'CWT') {
    rules.push({
      taxId: tax.id,
      transactionScope: TaxTransactionScope.SALE,
      accountRole: 'CREDITABLE_WITHHOLDING_TAX_ACCOUNT',
      entrySide: TaxEntrySide.DEBIT,
    });
  }

  if (taxType === 'WVAT') {
    rules.push({
      taxId: tax.id,
      transactionScope: TaxTransactionScope.SALE,
      accountRole: 'WITHHOLDING_VATABLE_TAX_ACCOUNT',
      entrySide: TaxEntrySide.DEBIT,
    });
  }

  return rules;
}
