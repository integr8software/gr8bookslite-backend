import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cleanCurrencyCode, cleanOptional, normalizeIdentityValue } from '../../../../common/utils/string-normalization.util';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { GetBankAccountListQueryDto } from '../dto/get-bank-account-list-query.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';
import type { BankAccountIdentity, BankAccountPayload } from '../types/bank-account.type';

const BaseCurrencyCode = 'PHP';

export function buildBankAccountListWhere(companyId: number, query: GetBankAccountListQueryDto): Prisma.BankAccountWhereInput {
  const search = query.search?.trim();

  return {
    companyId,
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { bankName: { contains: search, mode: 'insensitive' } },
            { branch: { contains: search, mode: 'insensitive' } },
            { accountName: { contains: search, mode: 'insensitive' } },
            { accountNumber: { contains: search, mode: 'insensitive' } },
            {
              coa: {
                accountCode: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  };
}

export function buildBankAccountOrderBy(query: GetBankAccountListQueryDto): Prisma.BankAccountOrderByWithRelationInput[] {
  const sortBy = query.sortBy ?? 'bankName';
  const sortDirection = query.sortDirection ?? 'asc';

  return [{ [sortBy]: sortDirection }, { id: 'asc' }];
}

export function validateBankInput(dto: CreateBankAccountDto | UpdateBankAccountDto) {
  const bankName = dto.bankName?.trim();

  if (!bankName) {
    throw new BadRequestException('Bank is required.');
  }

  if (!dto.accountType?.trim()) {
    throw new BadRequestException('Account type is required.');
  }

  if (!dto.seriesStart?.trim()) {
    throw new BadRequestException('Series start is required.');
  }

  if (!dto.seriesEnd?.trim()) {
    throw new BadRequestException('Series end is required.');
  }

  if (dto.seriesDigits === undefined || dto.seriesDigits === null) {
    throw new BadRequestException('Series digits are required.');
  }

  if (!Number.isInteger(dto.seriesDigits) || dto.seriesDigits < 1) {
    throw new BadRequestException('Series digits must be a positive whole number.');
  }

  if (
    dto.seriesStart !== undefined &&
    dto.seriesEnd !== undefined &&
    dto.seriesStart.trim() &&
    dto.seriesEnd.trim() &&
    Number(dto.seriesStart) > Number(dto.seriesEnd)
  ) {
    throw new BadRequestException('Series start should not be greater than series end.');
  }

  const currencyCode = cleanCurrencyCode(dto.currencyCode);
  if (currencyCode && currencyCode !== BaseCurrencyCode && (!dto.currencyExchangeRate || dto.currencyExchangeRate <= 0)) {
    throw new BadRequestException('Currency exchange rate must be greater than 0 for non-PHP bank accounts.');
  }
}

export function ensureNoDuplicateImportedBankAccounts(banks: CreateBankAccountDto[]) {
  const seenKeys = new Set<string>();

  for (const bank of banks) {
    const key = getBankAccountIdentityKey(bank);

    if (seenKeys.has(key)) {
      throw new ConflictException(`Duplicate bank account in import: ${bank.bankName.trim()} ${(bank.accountNumber ?? '').trim()}.`);
    }

    seenKeys.add(key);
  }
}

export function ensureNoDuplicateImportedAccountCodes(banks: CreateBankAccountDto[]) {
  const seenCodes = new Set<string>();

  for (const bank of banks) {
    const accountCode = bank.accountCode?.trim();

    if (!accountCode) {
      continue;
    }

    if (seenCodes.has(accountCode)) {
      throw new ConflictException(`Duplicate account code in import: ${accountCode}.`);
    }

    seenCodes.add(accountCode);
  }
}

export function ensureAtMostOneDefaultImportedBank(banks: CreateBankAccountDto[]) {
  const defaultBanks = banks.filter((bank) => bank.isDefault === true);

  if (defaultBanks.length > 1) {
    throw new BadRequestException('Only one imported bank account can be marked as default.');
  }
}

export function resolveBankAccountName(dto: CreateBankAccountDto | UpdateBankAccountDto) {
  return ['Cash in Bank', dto.bankName?.trim(), dto.branch?.trim(), dto.accountNumber?.trim()].filter(Boolean).join(' - ');
}

export function toCreateBankAccountData(dto: CreateBankAccountDto, accountName: string) {
  return {
    bankName: dto.bankName.trim(),
    branch: cleanOptional(dto.branch),
    accountNumber: dto.accountNumber?.trim() ?? '',
    accountName,
    accountType: cleanOptional(dto.accountType),
    seriesStart: cleanOptional(dto.seriesStart),
    seriesEnd: cleanOptional(dto.seriesEnd),
    seriesDigits: dto.seriesDigits,
    currencyCode: cleanCurrencyCode(dto.currencyCode),
    currencyExchangeRate: dto.currencyExchangeRate === undefined ? undefined : new Prisma.Decimal(dto.currencyExchangeRate),
    isDefault: dto.isDefault ?? false,
  };
}

export function toUpdateBankAccountData(dto: UpdateBankAccountDto, accountName: string): Prisma.BankAccountUpdateInput {
  return {
    ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() } : {}),
    ...(dto.branch !== undefined ? { branch: cleanOptional(dto.branch) } : {}),
    ...(dto.accountNumber !== undefined ? { accountNumber: dto.accountNumber.trim() } : {}),
    ...(dto.accountName !== undefined || dto.bankName !== undefined || dto.branch !== undefined || dto.accountNumber !== undefined ? { accountName } : {}),
    ...(dto.accountType !== undefined ? { accountType: cleanOptional(dto.accountType) } : {}),
    ...(dto.seriesStart !== undefined ? { seriesStart: cleanOptional(dto.seriesStart) } : {}),
    ...(dto.seriesEnd !== undefined ? { seriesEnd: cleanOptional(dto.seriesEnd) } : {}),
    ...(dto.seriesDigits !== undefined ? { seriesDigits: dto.seriesDigits } : {}),
    ...(dto.currencyCode !== undefined ? { currencyCode: cleanCurrencyCode(dto.currencyCode) } : {}),
    ...(dto.currencyExchangeRate !== undefined ? { currencyExchangeRate: new Prisma.Decimal(dto.currencyExchangeRate) } : {}),
    ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    ...(dto.status !== undefined ? { status: dto.status } : {}),
  };
}

export function toBankAccountDtoLike(bankAccount: BankAccountPayload) {
  return {
    bankName: bankAccount.bankName,
    branch: bankAccount.branch ?? undefined,
    accountNumber: bankAccount.accountNumber,
    accountName: bankAccount.accountName,
    accountType: bankAccount.accountType ?? undefined,
    seriesStart: bankAccount.seriesStart ?? undefined,
    seriesEnd: bankAccount.seriesEnd ?? undefined,
    seriesDigits: bankAccount.seriesDigits ?? undefined,
    currencyCode: bankAccount.currencyCode ?? undefined,
    currencyExchangeRate: bankAccount.currencyExchangeRate ? Number(bankAccount.currencyExchangeRate) : undefined,
    isDefault: bankAccount.isDefault,
    status: bankAccount.status,
  };
}

export function getBankAccountIdentityKey(bank: BankAccountIdentity) {
  return [bank.bankName, bank.branch ?? '', bank.accountNumber].map((value) => normalizeIdentityValue(value)).join('|');
}
