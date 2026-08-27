import { validate } from 'class-validator';
import { BankAccountType } from '@prisma/client';
import { CreateBankAccountDto } from './create-bank-account.dto';

describe('CreateBankAccountDto account type', () => {
  it.each([BankAccountType.TIME_DEPOSIT, BankAccountType.CREDIT_CARD])('accepts %s', async (accountType) => {
    const dto = Object.assign(new CreateBankAccountDto(), {
      bankName: 'Test Bank',
      accountType,
      seriesStart: '1',
      seriesEnd: '999',
      seriesDigits: 3,
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'accountType')).toBeUndefined();
  });

  it('rejects unsupported account types', async () => {
    const dto = Object.assign(new CreateBankAccountDto(), {
      bankName: 'Test Bank',
      accountType: 'Investment',
      seriesStart: '1',
      seriesEnd: '999',
      seriesDigits: 3,
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'accountType')?.constraints).toHaveProperty('isEnum');
  });
});
