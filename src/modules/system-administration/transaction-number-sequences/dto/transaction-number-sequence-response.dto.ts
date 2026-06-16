export class TransactionNumberBranchResponseDto {
  id!: number;
  code!: string | null;
  name!: string;
}

export class TransactionNumberSequenceResponseDto {
  id!: number;
  permissionId!: number;
  moduleCode!: string;
  moduleName!: string;
  inputMode!: 'Auto' | 'Manual';
  prefix!: string;
  padding!: number;
  startingNumber!: number;
  currentNumber!: number;
  scope!: 'all' | 'branch';
  branchUnitId!: number | null;
  branchUnitIds!: number[];
  status!: 'Active' | 'Inactive';
}

export class TransactionNumberSequenceBootstrapResponseDto {
  branches!: TransactionNumberBranchResponseDto[];
  sequences!: TransactionNumberSequenceResponseDto[];
}

export class SaveTransactionNumberSequenceResponseDto {
  message!: string;
  sequence!: TransactionNumberSequenceResponseDto;
}
