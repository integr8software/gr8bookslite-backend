import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionNumberInputMode, TransactionNumberStatus } from '@prisma/client';
import { TransactionNumberBranchUnitTypes } from '../constants/transaction-number-sequence.constants';
import type {
  ResolveTransactionNumberOptions,
  SuggestTransactionNumberOptions,
  TransactionNumberContext,
  TransactionNumberFallbackOptions,
  TransactionNumberIssueCheck,
  TransactionNumberIssueContext,
  TransactionNumberSequenceWithModule,
  TransactionNumberWriteClient,
} from '../types/transaction-number-sequence-runtime.types';
import { formatTransactionNumber } from '../utils/transaction-number-format.util';

export async function findTransactionNumberForCompanyBranch(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
    moduleCode,
    requireActive = true,
  }: TransactionNumberContext & {
    requireActive?: boolean;
  },
) {
  await ensureBranchBelongsToCompany(tx, { branchUnitId, companyId, moduleCode });

  return tx.transactionNumberSequence.findFirst({
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
}

export async function generateTransactionNumberForCompanyBranch(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
    createDefaultIfMissing = false,
    isIssued,
    moduleCode,
  }: SuggestTransactionNumberOptions,
) {
  const sequence = await resolveTransactionNumberSequenceForCompanyBranch(tx, {
    branchUnitId,
    companyId,
    createDefaultIfMissing,
    moduleCode,
  });

  if (sequence.inputMode === TransactionNumberInputMode.MANUAL) {
    throw new BadRequestException(`Transaction number setup for ${moduleCode} is manual for this branch.`);
  }

  const sequenceScope = await resolveTransactionNumberSequenceScope(tx, { branchUnitId, companyId, moduleCode }, sequence);
  const nextNumber = await findNextAvailableTransactionNumber(sequenceScope.sequence, isIssued, {
    branchUnitId,
    companyId,
    moduleCode,
    scope: sequenceScope.scope,
  });

  await tx.transactionNumberSequence.updateMany({
    where: { id: { in: sequenceScope.sequenceIds } },
    data: { currentNumber: nextNumber.runningNumber + 1 },
  });

  return {
    branchUnitId,
    currentNumber: nextNumber.runningNumber + 1,
    inputMode: sequence.inputMode,
    moduleCode: sequence.module.code,
    sequenceId: sequence.id,
    transactionNumber: nextNumber.transactionNumber,
  };
}

export async function suggestTransactionNumberForCompanyBranch(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
    createDefaultIfMissing = true,
    isIssued,
    moduleCode,
  }: SuggestTransactionNumberOptions,
) {
  const sequence = await resolveTransactionNumberSequenceForCompanyBranch(tx, {
    branchUnitId,
    companyId,
    createDefaultIfMissing,
    moduleCode,
  });

  if (sequence.inputMode === TransactionNumberInputMode.MANUAL) {
    return {
      branchUnitId,
      inputMode: sequence.inputMode,
      moduleCode: sequence.module.code,
      sequenceId: sequence.id,
      transactionNumber: '',
    };
  }

  const sequenceScope = await resolveTransactionNumberSequenceScope(tx, { branchUnitId, companyId, moduleCode }, sequence);
  const nextNumber = await findNextAvailableTransactionNumber(sequenceScope.sequence, isIssued, {
    branchUnitId,
    companyId,
    moduleCode,
    scope: sequenceScope.scope,
  });

  return {
    branchUnitId,
    inputMode: sequence.inputMode,
    moduleCode: sequence.module.code,
    sequenceId: sequence.id,
    transactionNumber: nextNumber.transactionNumber,
  };
}

export async function resolveTransactionNumberForCompanyBranch(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
    createDefaultIfMissing = true,
    isIssued,
    moduleCode,
    requestedTransactionNumber,
  }: ResolveTransactionNumberOptions,
) {
  const sequence = await resolveTransactionNumberSequenceForCompanyBranch(tx, {
    branchUnitId,
    companyId,
    createDefaultIfMissing,
    moduleCode,
  });

  if (sequence.inputMode === TransactionNumberInputMode.MANUAL) {
    const transactionNumber = requestedTransactionNumber?.trim() ?? '';

    if (!transactionNumber) {
      throw new BadRequestException(`Transaction number is required for manual ${moduleCode} numbering.`);
    }

    const sequenceScope = await resolveTransactionNumberSequenceScope(tx, { branchUnitId, companyId, moduleCode }, sequence);

    if (
      isIssued &&
      (await isIssued(transactionNumber, {
        branchUnitId,
        companyId,
        moduleCode,
        scope: sequenceScope.scope,
      }))
    ) {
      throw new BadRequestException(`Transaction number ${transactionNumber} has already been issued for ${moduleCode}.`);
    }

    return transactionNumber;
  }

  return (
    await generateTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      createDefaultIfMissing,
      isIssued,
      moduleCode,
    })
  ).transactionNumber;
}

export async function resolveTransactionNumberSequenceForCompanyBranch(
  tx: TransactionNumberWriteClient,
  {
    branchUnitId,
    companyId,
    createDefaultIfMissing = false,
    moduleCode,
  }: TransactionNumberContext & TransactionNumberFallbackOptions,
) {
  const sequence =
    (await findTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode,
    })) ??
    (createDefaultIfMissing
      ? await createDefaultAutoTransactionNumbersForCompanyModule(tx, {
          branchUnitId,
          companyId,
          moduleCode,
        })
      : null);

  if (!sequence) {
    throw new NotFoundException(`Transaction number setup for ${moduleCode} was not found for this branch.`);
  }

  return sequence;
}

export async function resolveTransactionNumberScopeForCompanyBranch(tx: TransactionNumberWriteClient, context: TransactionNumberContext) {
  const sequence = await resolveTransactionNumberSequenceForCompanyBranch(tx, context);

  return resolveTransactionNumberSequenceScope(tx, context, sequence);
}

async function createDefaultAutoTransactionNumbersForCompanyModule(tx: TransactionNumberWriteClient, { branchUnitId, companyId, moduleCode }: TransactionNumberContext) {
  const module = await tx.module.findFirst({
    where: {
      code: moduleCode,
      isActive: true,
    },
    select: { id: true },
  });

  if (!module) {
    throw new NotFoundException(`Transaction module ${moduleCode} was not found.`);
  }

  const branchUnits = await tx.companyUnit.findMany({
    where: {
      companyId,
      isActive: true,
      type: {
        in: TransactionNumberBranchUnitTypes,
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });

  if (branchUnits.length === 0) {
    throw new BadRequestException('Select an active branch.');
  }

  const existingCount = await tx.transactionNumberSequence.count({
    where: {
      branchUnit: { companyId },
      moduleId: module.id,
    },
  });

  if (existingCount > 0) {
    return null;
  }

  const data = {
    currentNumber: 1,
    inputMode: TransactionNumberInputMode.AUTO,
    moduleId: module.id,
    padding: 6,
    prefix: `${moduleCode}-`,
    startingNumber: 1,
    status: TransactionNumberStatus.ACTIVE,
    suffix: '',
  };

  await tx.transactionNumberSequence.createMany({
    data: branchUnits.map((branchUnit) => ({
      ...data,
      branchUnitId: branchUnit.id,
    })),
    skipDuplicates: true,
  });

  return tx.transactionNumberSequence.findUnique({
    where: {
      moduleId_branchUnitId: {
        branchUnitId,
        moduleId: module.id,
      },
    },
    include: {
      module: {
        select: { code: true },
      },
    },
  });
}

async function resolveTransactionNumberSequenceScope(
  tx: TransactionNumberWriteClient,
  context: TransactionNumberContext,
  sequence: TransactionNumberSequenceWithModule,
) {
  const [activeBranchUnits, activeSequences] = await Promise.all([
    tx.companyUnit.findMany({
      where: {
        companyId: context.companyId,
        isActive: true,
        type: {
          in: TransactionNumberBranchUnitTypes,
        },
      },
      select: { id: true },
    }),
    tx.transactionNumberSequence.findMany({
      where: {
        branchUnit: { companyId: context.companyId },
        module: { code: context.moduleCode, isActive: true },
        status: TransactionNumberStatus.ACTIVE,
      },
      include: {
        module: {
          select: { code: true },
        },
      },
    }),
  ]);
  const sequenceBranchIds = new Set(activeSequences.map((item) => item.branchUnitId));
  const isSharedScope = activeBranchUnits.length > 0 && activeBranchUnits.every((branch) => sequenceBranchIds.has(branch.id));

  if (!isSharedScope) {
    return {
      scope: 'branch' as const,
      sequence,
      sequenceIds: [sequence.id],
    };
  }

  return {
    scope: 'all' as const,
    sequence: {
      ...sequence,
      currentNumber: Math.max(...activeSequences.map((item) => item.currentNumber), sequence.currentNumber),
    },
    sequenceIds: activeSequences.map((item) => item.id),
  };
}

async function findNextAvailableTransactionNumber(
  sequence: TransactionNumberSequenceWithModule,
  isIssued: TransactionNumberIssueCheck | undefined,
  issueContext: TransactionNumberIssueContext,
) {
  let runningNumber = sequence.currentNumber;
  let transactionNumber = formatTransactionNumber(sequence, runningNumber);

  while (isIssued && (await isIssued(transactionNumber, issueContext))) {
    runningNumber += 1;
    transactionNumber = formatTransactionNumber(sequence, runningNumber);
  }

  return {
    runningNumber,
    transactionNumber,
  };
}

async function ensureBranchBelongsToCompany(tx: TransactionNumberWriteClient, { branchUnitId, companyId }: TransactionNumberContext) {
  const branch = await tx.companyUnit.findFirst({
    where: {
      id: branchUnitId,
      companyId,
      isActive: true,
      type: {
        in: TransactionNumberBranchUnitTypes,
      },
    },
    select: { id: true },
  });

  if (!branch) {
    throw new BadRequestException('Select an active branch.');
  }
}

