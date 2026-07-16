import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompanyUnitType, Prisma, TransactionNumberInputMode, TransactionNumberSequence, TransactionNumberStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type TransactionNumberWriteClient = PrismaService | Prisma.TransactionClient;

export type TransactionNumberModuleSequence = TransactionNumberSequence & {
  module: { code: string };
};

export async function findTransactionNumberForCompanyBranch(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
    moduleCode,
    requireActive = true,
  }: {
    branchUnitId: number;
    companyId: number;
    moduleCode: string;
    requireActive?: boolean;
  },
) {
  await ensureBranchBelongsToCompany(tx, { branchUnitId, companyId });

  const sequence = await tx.transactionNumberSequence.findFirst({
    where: {
      branchUnitId,
      module: { code: moduleCode, isActive: true },
      ...(requireActive ? { status: TransactionNumberStatus.ACTIVE } : {}),
    },
    include: {
      module: {
        select: { code: true },
      },
    },
  });

  return sequence;
}

export async function generateTransactionNumberForCompanyBranch(
  tx: Prisma.TransactionClient,
  {
    branchUnitId,
    companyId,
    isIssued,
    moduleCode,
  }: {
    branchUnitId: number;
    companyId: number;
    isIssued?: (transactionNumber: string) => Promise<boolean>;
    moduleCode: string;
  },
) {
  const sequence = await findTransactionNumberForCompanyBranch(tx, {
    branchUnitId,
    companyId,
    moduleCode,
  });

  if (!sequence) {
    throw new NotFoundException(`Transaction number setup for ${moduleCode} was not found for this branch.`);
  }

  if (sequence.inputMode === TransactionNumberInputMode.MANUAL) {
    throw new BadRequestException(`Transaction number setup for ${moduleCode} is manual for this branch.`);
  }

  let runningNumber = sequence.currentNumber;
  let transactionNumber = formatTransactionNumber(sequence, runningNumber);

  while (isIssued && (await isIssued(transactionNumber))) {
    runningNumber += 1;
    transactionNumber = formatTransactionNumber(sequence, runningNumber);
  }

  await tx.transactionNumberSequence.update({
    where: { id: sequence.id },
    data: { currentNumber: runningNumber + 1 },
  });

  return {
    branchUnitId,
    currentNumber: runningNumber + 1,
    inputMode: sequence.inputMode,
    moduleCode: sequence.module.code,
    sequenceId: sequence.id,
    transactionNumber,
  };
}

export function formatTransactionNumber(sequence: Pick<TransactionNumberSequence, 'padding' | 'prefix' | 'suffix'>, runningNumber: number) {
  return `${sequence.prefix}${String(runningNumber).padStart(sequence.padding, '0')}${sequence.suffix}`;
}

async function ensureBranchBelongsToCompany(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
  }: {
    branchUnitId: number;
    companyId: number;
  },
) {
  const branch = await tx.companyUnit.findFirst({
    where: {
      id: branchUnitId,
      companyId,
      isActive: true,
      type: {
        in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
      },
    },
    select: { id: true },
  });

  if (!branch) {
    throw new BadRequestException('Select an active branch.');
  }
}
